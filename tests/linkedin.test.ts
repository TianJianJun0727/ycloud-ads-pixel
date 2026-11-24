import { afterEach, expect, test } from '@rstest/core';
import { createAdsPixel, LINKEDIN_DEFAULT_SCRIPT_SRC, type LinkedInTrackPayload } from '../src/index';

import { resetBrowser, testWindow as browser } from './browser-fixture';

afterEach(resetBrowser);

test('registers only enabled LinkedIn Partner IDs and queues one native command per conversion', () => {
  const sdk = createAdsPixel();
  sdk.init({
    globalDefaults: { enabled: false },
    linkedin: [
      { trackingDestinationId: '123', enabled: true },
      { trackingDestinationId: '456', enabled: true, imageTagFallback: false },
      { trackingDestinationId: '789' },
    ],
  });
  sdk.init();

  expect(browser()._linkedin_data_partner_ids).toEqual(['123', '456']);
  sdk.setUserIdentity({
    email: 'person@example.test',
    platforms: ['linkedin'],
  });
  sdk.track({
    name: 'registration_completed',
    properties: { value: 25 },
    linkedin: [
      {
        platformOptions: { conversionId: '2048' },
        eventId: 'registration:123',
      },
      { trackingDestinationId: '456', platformOptions: { conversionId: 2049 } },
      { trackingDestinationId: '789', platformOptions: { conversionId: 2050 } },
      { platformOptions: { conversionId: '-1' } },
      { platformOptions: { conversionId: '9007199254740993' } },
    ],
  });
  expect(browser().lintrk?.q).toEqual([
    ['track', { conversion_id: 2048, event_id: 'registration:123' }],
    ['track', { conversion_id: 2049 }],
  ]);
});

test('reuses an installed Insight Tag and leaves its existing Partner IDs in place', () => {
  const events: LinkedInTrackPayload[] = [];
  const existing = (_command: 'track', payload: LinkedInTrackPayload) => {
    events.push(payload);
  };
  browser().lintrk = existing;
  browser()._linkedin_data_partner_ids = [123, '998'];

  const sdk = createAdsPixel();
  sdk.init({
    linkedin: [{ trackingDestinationId: '123' }, { trackingDestinationId: '456' }],
  });
  sdk.init({ linkedin: { trackingDestinationId: '456', enabled: false } });

  expect(browser().lintrk).toBe(existing);
  expect(browser()._linkedin_data_partner_ids).toEqual([123, '998']);
  sdk.track({
    name: 'lead',
    linkedin: { platformOptions: { conversionId: 4048 } },
  });
  expect(events).toEqual([]);
});

test('waits for advertising consent, retries a failed script, and clears its queued conversions on withdrawal', () => {
  const sources: string[] = [];
  const createElement = document.createElement;
  document.createElement = ((tag: string) => {
    const node = createElement.call(document, tag);
    if (tag === 'script') {
      const script = node as HTMLScriptElement;
      script.addEventListener('error', () => sources.push(script.src));
    }
    return node;
  }) as typeof document.createElement;

  try {
    const sdk = createAdsPixel();
    const event = {
      name: 'lead',
      linkedin: { platformOptions: { conversionId: 501 } },
    };
    sdk.setConsent({ advertising: false });
    const result = sdk.init({
      consent: { advertising: true },
      linkedin: { trackingDestinationId: '123' },
    });
    sdk.track(event);
    expect(result.imageTagFallbacks).toEqual([]);
    expect(browser().lintrk).toBeUndefined();
    expect(sources).toEqual([]);

    sdk.setConsent({ advertising: true });
    sdk.track(event);
    expect(browser().lintrk?.q).toHaveLength(1);
    sdk.init();
    expect(sources).toEqual([LINKEDIN_DEFAULT_SCRIPT_SRC, LINKEDIN_DEFAULT_SCRIPT_SRC]);

    sdk.setConsent({ advertising: false });
    sdk.track(event);
    expect(browser().lintrk?.q).toEqual([]);
    expect(browser()._linkedin_data_partner_ids).toEqual([]);
  } finally {
    document.createElement = createElement;
  }
});

test('uses the event-specific image pixel for a destination with automatic view tracking disabled', () => {
  const imageRequests: URL[] = [];
  const originalImage = globalThis.Image;
  globalThis.Image = class {
    set src(value: string) {
      imageRequests.push(new URL(value));
    }
  } as typeof globalThis.Image;

  try {
    const sdk = createAdsPixel();
    sdk.init({
      linkedin: [{ trackingDestinationId: '123' }, { trackingDestinationId: '789', autoTrackPageView: false }],
    });
    sdk.track({
      name: 'lead',
      linkedin: {
        trackingDestinationId: '789',
        eventId: 'lead:123',
        platformOptions: { conversionId: 101 },
      },
    });

    expect(browser()._linkedin_data_partner_ids).toEqual(['123']);
    expect(browser().lintrk?.q).toEqual([]);
    expect(imageRequests).toHaveLength(1);
    const [url] = imageRequests;
    expect(url.origin + url.pathname).toBe('https://px.ads.linkedin.com/collect/');
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({
      pid: '789',
      fmt: 'gif',
      conversionId: '101',
      eventId: 'lead:123',
    });
  } finally {
    globalThis.Image = originalImage;
  }
});

test('returns a LinkedIn no-script page view only for an eligible destination', () => {
  const result = createAdsPixel().init({
    consent: { advertising: true },
    linkedin: [
      { trackingDestinationId: '123' },
      { trackingDestinationId: '456', imageTagFallback: false },
      { trackingDestinationId: '789', autoTrackPageView: false },
      { trackingDestinationId: '998', enabled: false },
    ],
  });
  expect(result.imageTagFallbacks).toEqual([
    {
      platform: 'linkedin',
      trackingDestinationId: '123',
      src: 'https://px.ads.linkedin.com/collect/?pid=123&fmt=gif',
    },
  ]);
  expect(() => createAdsPixel().init({ linkedin: { trackingDestinationId: 'invalid' } })).toThrow('numeric Partner ID');
});

test('broadcasts mixed LinkedIn conversions through Insight Tag and each enabled image-only destination', () => {
  const imageRequests: URL[] = [];
  const originalImage = globalThis.Image;
  globalThis.Image = class {
    set src(value: string) {
      imageRequests.push(new URL(value));
    }
  } as typeof globalThis.Image;

  try {
    const sdk = createAdsPixel();
    sdk.init({
      linkedin: [
        { trackingDestinationId: '123' },
        { trackingDestinationId: '456' },
        { trackingDestinationId: '789', autoTrackPageView: false },
        { trackingDestinationId: '910', autoTrackPageView: false },
        { trackingDestinationId: '911', autoTrackPageView: false, enabled: false },
      ],
    });
    sdk.track({
      name: 'lead',
      linkedin: { eventId: 'lead:123', platformOptions: { conversionId: 101 } },
    });

    expect(browser().lintrk?.q).toEqual([['track', { conversion_id: 101, event_id: 'lead:123' }]]);
    expect(imageRequests.map(({ searchParams }) => Object.fromEntries(searchParams))).toEqual([
      { pid: '789', fmt: 'gif', conversionId: '101', eventId: 'lead:123' },
      { pid: '910', fmt: 'gif', conversionId: '101', eventId: 'lead:123' },
    ]);
  } finally {
    globalThis.Image = originalImage;
  }
});

test('adapts dynamic value and currency for an Insight Tag conversion', () => {
  const sdk = createAdsPixel();
  sdk.init({ linkedin: { trackingDestinationId: '123' } });
  sdk.track({
    name: 'purchase',
    properties: { value: 25.5, currency: 'usd' },
    linkedin: {
      eventId: 'order-1',
      platformOptions: { conversionId: 2048, conversionType: 'purchase' },
      properties: { value: 19.25 },
    },
  });

  expect(browser().lintrk?.q).toEqual([
    [
      'track',
      {
        conversion_id: 2048,
        event_id: 'order-1',
        conversion_type: 'PURCHASE',
        conversion_currency: 'USD',
        conversion_value: 19.25,
      },
    ],
  ]);
});
