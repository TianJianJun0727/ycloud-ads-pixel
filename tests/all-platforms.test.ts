import { afterEach, expect, test } from '@rstest/core';
import { adsPixel, createAdsPixel, installAdsPixel } from '../src/index';
import { googleQueue, linkedinQueue, metaQueue, openAIQueue, resetBrowser, testWindow } from './browser-fixture';

afterEach(resetBrowser);

test('installs the SDK with the four business methods', () => {
  installAdsPixel(adsPixel);
  const sdk = testWindow().adsPixel;
  expect(sdk).toBe(adsPixel);
  expect(typeof sdk?.init).toBe('function');
  expect(typeof sdk?.setUserIdentity).toBe('function');
  expect(typeof sdk?.track).toBe('function');
  expect(typeof sdk?.setConsent).toBe('function');
  expect(sdk).not.toHaveProperty('identify');
});

test('initializes object and array destinations, applying each page view default once', () => {
  const sdk = createAdsPixel();
  sdk.init({
    google: { trackingDestinationId: 'AW-123' },
    meta: [{ trackingDestinationId: '123' }, { trackingDestinationId: '456', autoTrackPageView: false }],
    openai: [{ trackingDestinationId: 'agency' }, { trackingDestinationId: 'owned', autoTrackPageView: true }],
  });
  sdk.init();

  expect(googleQueue()).toEqual([
    ['js', expect.any(Date)],
    ['config', 'AW-123', { send_page_view: true }],
  ]);
  expect(Object.prototype.toString.call(testWindow().dataLayer?.[0])).toBe('[object Arguments]');
  expect(metaQueue()).toEqual([
    ['init', '123'],
    ['trackSingle', '123', 'PageView'],
    ['init', '456'],
  ]);
  expect(openAIQueue()).toEqual([
    ['init', { pixelId: 'agency' }],
    ['init', { pixelId: 'owned' }],
    ['measureSingle', 'owned', 'page_viewed', { type: 'contents' }],
  ]);
});

test('destination enable overrides govern initialization, identity, and events', () => {
  const sdk = createAdsPixel();
  sdk.init({
    globalDefaults: { enabled: false },
    google: [{ trackingDestinationId: 'AW-enabled', enabled: true }, { trackingDestinationId: 'AW-disabled' }],
    meta: [
      {
        trackingDestinationId: 'meta-enabled',
        enabled: true,
        autoTrackPageView: false,
      },
      { trackingDestinationId: 'meta-disabled' },
    ],
    openai: [{ trackingDestinationId: 'enabled', enabled: true }, { trackingDestinationId: 'disabled' }],
  });
  const hash = 'a'.repeat(64);
  sdk.setUserIdentity({ emailSha256: hash, city: 'Shanghai' });
  sdk.track({
    name: 'registration_completed',
    google: {},
    meta: { eventName: 'CompleteRegistration' },
    openai: {},
  });

  expect(googleQueue().slice(1)).toEqual([
    ['config', 'AW-enabled', { send_page_view: true }],
    ['event', 'registration_completed', { send_to: 'AW-enabled', user_data: { sha256_email_address: hash } }],
  ]);
  expect(metaQueue()).toEqual([
    ['init', 'meta-enabled'],
    ['init', 'meta-enabled', { em: hash }],
    ['trackSingle', 'meta-enabled', 'CompleteRegistration', {}],
  ]);
  expect(openAIQueue()).toEqual([
    ['init', { pixelId: 'enabled' }],
    ['init', { pixelId: 'enabled', user: { email_sha256: hash, city: 'Shanghai' } }],
    ['measureSingle', 'enabled', 'registration_completed', { type: 'customer_action' }],
  ]);

  sdk.init({ openai: { trackingDestinationId: 'enabled', enabled: false } });
  sdk.track({ name: 'registration_completed', openai: {} });
  sdk.setUserIdentity({ emailSha256: hash, platforms: ['openai'] });
  expect(openAIQueue()).toHaveLength(3);
});

test('retries failed vendor scripts without queuing a second initialization', () => {
  const createElement = document.createElement;
  const sources: HTMLScriptElement[] = [];
  document.createElement = ((tag: string) => {
    const element = createElement.call(document, tag);
    if (tag === 'script') sources.push(element as HTMLScriptElement);
    return element;
  }) as typeof document.createElement;

  try {
    const sdk = createAdsPixel();
    sdk.init({
      google: { trackingDestinationId: 'AW-123' },
      meta: { trackingDestinationId: '123' },
      openai: { trackingDestinationId: 'openai' },
    });
    expect(sources).toHaveLength(3);
    sources.forEach((script) => script.dispatchEvent(new Event('error')));
    expect(document.scripts).toHaveLength(0);

    sdk.init();
    expect(sources).toHaveLength(6);
    expect(sources.slice(3).map((script) => script.src)).toEqual(sources.slice(0, 3).map((script) => script.src));
    expect(googleQueue()).toHaveLength(2);
    expect(metaQueue()).toHaveLength(2);
    expect(openAIQueue()).toHaveLength(1);
  } finally {
    document.createElement = createElement;
  }
});

test('validates destination identities before running vendor commands', () => {
  const sdk = createAdsPixel();
  expect(() =>
    sdk.init({
      google: { trackingDestinationId: 'AW-123' },
      meta: [{ trackingDestinationId: '123' }, { trackingDestinationId: ' 123 ' }],
    }),
  ).toThrow('Duplicate tracking destination: 123');
  expect(() =>
    sdk.init({
      openai: { pixelId: 'legacy' } as never,
    }),
  ).toThrow('Each destination requires a trackingDestinationId');
  expect(googleQueue()).toEqual([]);
  expect(metaQueue()).toEqual([]);
  expect(openAIQueue()).toEqual([]);
});

test('scopes each Google and Meta event, merging shared values with platform values', () => {
  const sdk = createAdsPixel();
  sdk.init({
    google: [
      { trackingDestinationId: 'AW-123', platformOptions: { groups: 'ads' } },
      { trackingDestinationId: 'G-456' },
    ],
    meta: { trackingDestinationId: '123', autoTrackPageView: false },
  });
  sdk.track({
    name: 'purchase',
    properties: { currency: 'USD', value: 20 },
    google: [
      {
        eventName: 'conversion',
        eventId: 'order-1',
        platformOptions: { conversionLabel: 'label', destinationGroup: 'ads' },
      },
      { trackingDestinationId: 'G-456', properties: { value: 10 } },
    ],
    meta: [{ eventName: 'Purchase', eventId: 'order-1' }, { eventName: 'waba_created' }],
  });

  expect(googleQueue().slice(3)).toEqual([
    [
      'event',
      'conversion',
      {
        currency: 'USD',
        value: 20,
        transaction_id: 'order-1',
        send_to: 'AW-123/label',
      },
    ],
    ['event', 'purchase', { currency: 'USD', value: 10, send_to: 'G-456' }],
  ]);
  expect(metaQueue().slice(1)).toEqual([
    ['trackSingle', '123', 'Purchase', { currency: 'USD', value: 20, event_id: 'order-1' }, { eventID: 'order-1' }],
    ['trackSingleCustom', '123', 'waba_created', { currency: 'USD', value: 20 }],
  ]);
});

test('ignores disabled platforms even with an existing vendor queue', () => {
  const commands: unknown[][] = [];
  const observe = (...args: unknown[]) => {
    commands.push(args);
  };
  testWindow().gtag = observe;
  testWindow().fbq = observe;
  testWindow().oaiq = Object.assign(observe, { q: [] });

  const sdk = createAdsPixel();
  sdk.init({
    globalDefaults: { enabled: false },
    google: { trackingDestinationId: 'AW-123' },
  });
  sdk.setConsent({ advertising: true });
  sdk.setUserIdentity({ email: 'test@example.test' });
  sdk.track({
    name: 'registration_completed',
    google: {},
    meta: {},
    openai: {},
  });
  expect(commands).toEqual([]);
});

test('applies pre-init authorization before any vendor init and supports immediate updates', () => {
  const sdk = createAdsPixel();
  sdk.setConsent({ advertising: false, analytics: true });
  const result = sdk.init({
    consent: { advertising: true },
    google: { trackingDestinationId: 'AW-123' },
    meta: { trackingDestinationId: '123' },
    openai: { trackingDestinationId: 'openai', autoTrackPageView: true },
  });
  expect(result.imageTagFallbacks).toEqual([]);
  expect(googleQueue()[0]).toEqual([
    'consent',
    'default',
    {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    },
  ]);
  expect(metaQueue()[0]).toEqual(['consent', 'revoke']);
  expect(openAIQueue()[0]).toEqual(['consent', false]);

  sdk.setConsent({ advertising: true });
  expect(googleQueue().at(-1)?.slice(0, 2)).toEqual(['consent', 'update']);
  expect(metaQueue().at(-1)).toEqual(['consent', 'grant']);
  expect(openAIQueue().at(-1)).toEqual(['consent', true]);
});

test('returns page view image fallback descriptors only for eligible destinations', () => {
  const { imageTagFallbacks } = createAdsPixel().init({
    consent: { advertising: true },
    google: { trackingDestinationId: 'AW-123' },
    meta: [
      { trackingDestinationId: '123' },
      { trackingDestinationId: '456', imageTagFallback: false },
      { trackingDestinationId: '789', enabled: false },
    ],
    openai: [{ trackingDestinationId: 'agency' }, { trackingDestinationId: 'owned', autoTrackPageView: true }],
  });
  expect(imageTagFallbacks).toEqual([
    {
      platform: 'meta',
      trackingDestinationId: '123',
      src: 'https://www.facebook.com/tr?id=123&ev=PageView&noscript=1',
    },
    {
      platform: 'openai',
      trackingDestinationId: 'owned',
      src: 'https://bzr.openai.com/v1/sdk/events?pid=owned&event=page_viewed&data%5Btype%5D=contents',
    },
  ]);
});

test('includes only explicitly scoped, supported fields in identity updates', () => {
  const sdk = createAdsPixel();
  sdk.init({
    google: { trackingDestinationId: 'AW-123' },
    openai: { trackingDestinationId: 'owned' },
  });
  sdk.setUserIdentity({ email: 'test@example.test', platforms: ['google'] });
  sdk.setUserIdentity({ emailSha256: 'invalid', platforms: ['openai'] });
  sdk.track({ name: 'conversion', google: {} });

  expect(googleQueue().at(-1)).toEqual([
    'event',
    'conversion',
    { send_to: 'AW-123', user_data: { email: 'test@example.test' } },
  ]);
  expect(openAIQueue()).toEqual([['init', { pixelId: 'owned' }]]);
});

test('dispatches one shared purchase to all four platforms using their native payloads', () => {
  const sdk = createAdsPixel();
  sdk.init({
    google: { trackingDestinationId: 'AW-123' },
    meta: { trackingDestinationId: '456', autoTrackPageView: false },
    openai: { trackingDestinationId: 'owned' },
    linkedin: { trackingDestinationId: '789' },
  });
  sdk.track({
    name: 'purchase',
    properties: { value: 12.34, currency: 'USD' },
    google: { eventId: 'order-1', platformOptions: { conversionLabel: 'label' } },
    meta: { eventName: 'Purchase', eventId: 'order-1' },
    openai: { eventName: 'order_created', eventId: 'order-1', properties: { amount: 1234 } },
    linkedin: { eventId: 'order-1', platformOptions: { conversionId: 501, conversionType: 'PURCHASE' } },
  });

  expect(googleQueue().at(-1)).toEqual([
    'event',
    'conversion',
    { value: 12.34, currency: 'USD', transaction_id: 'order-1', send_to: 'AW-123/label' },
  ]);
  expect(metaQueue().at(-1)).toEqual([
    'trackSingle',
    '456',
    'Purchase',
    { value: 12.34, currency: 'USD', event_id: 'order-1' },
    { eventID: 'order-1' },
  ]);
  expect(openAIQueue().at(-1)).toEqual([
    'measureSingle',
    'owned',
    'order_created',
    { type: 'contents', amount: 1234, currency: 'USD' },
    { event_id: 'order-1' },
  ]);
  expect(linkedinQueue()).toEqual([
    [
      'track',
      {
        conversion_id: 501,
        event_id: 'order-1',
        conversion_type: 'PURCHASE',
        conversion_value: 12.34,
        conversion_currency: 'USD',
      },
    ],
  ]);
});
