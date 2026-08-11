import { afterEach, expect, test } from '@rstest/core';
import { adsPixel, createAdsPixel, installAdsPixel } from '../src/index';
import type {
  GoogleTagQueue,
  MetaPixelQueue,
  OpenAIAdsQueue,
} from '../src/index';

type AdsPixelTestWindow = Window & {
  dataLayer?: unknown[];
  gtag?: GoogleTagQueue;
  fbq?: MetaPixelQueue;
  oaiq?: OpenAIAdsQueue;
};

const getTestWindow = () => window as AdsPixelTestWindow;

afterEach(() => {
  const testWindow = getTestWindow();

  delete testWindow.dataLayer;
  delete testWindow.gtag;
  delete testWindow.fbq;
  delete testWindow.oaiq;
  document
    .querySelectorAll(
      'script[src*="googletagmanager.com/gtag/js"], script[src*="connect.facebook.net"], script[src*="bzrcdn.openai.com/sdk/oaiq.min.js"]',
    )
    .forEach((script) => script.remove());
});

test('creates the default ads pixel sdk instance', () => {
  const sdk = createAdsPixel();

  expect(typeof sdk.init).toBe('function');
  expect(typeof sdk.identify).toBe('function');
  expect(typeof sdk.track).toBe('function');
});

test('installs an ads pixel sdk instance on window', () => {
  installAdsPixel(adsPixel);

  expect((window as Window & { adsPixel?: typeof adsPixel }).adsPixel).toBe(
    adsPixel,
  );
});

test('queues Google commands as arguments objects for gtag.js', () => {
  const testWindow = getTestWindow();

  createAdsPixel().init({
    google: {
      measurementIds: ['AW-000000000', 'G-0000000000'],
    },
    meta: {
      enabled: false,
    },
    openai: {
      enabled: false,
    },
  });

  const commands = testWindow.dataLayer || [];

  expect(commands).toHaveLength(3);
  commands.forEach((command) => {
    expect(Array.isArray(command)).toBe(false);
    expect(Object.prototype.toString.call(command)).toBe('[object Arguments]');
  });
  expect(Array.from(commands[0] as IArguments)).toEqual([
    'js',
    expect.any(Date),
  ]);
  expect(Array.from(commands[1] as IArguments)).toEqual([
    'config',
    'AW-000000000',
  ]);
  expect(Array.from(commands[2] as IArguments)).toEqual([
    'config',
    'G-0000000000',
  ]);
});

test('tracks multiple Google events from an event array', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  testWindow.gtag = ((...args: unknown[]) =>
    calls.push(args)) as GoogleTagQueue;

  const sdk = createAdsPixel({
    google: { measurementIds: ['AW-000000000'] },
    meta: { enabled: false },
    openai: { enabled: false },
  });
  sdk.init();
  calls.length = 0;

  sdk.track({
    name: 'fallback_event',
    properties: {
      tenant_id: 'tenant-id',
    },
    google: [
      {
        eventName: 'conversion',
        properties: {
          send_to: 'AW-000000000/example',
        },
      },
      {
        eventName: 'sign_up',
        properties: {
          method: 'email',
        },
      },
    ],
  });

  expect(calls).toEqual([
    [
      'event',
      'conversion',
      {
        tenant_id: 'tenant-id',
        send_to: 'AW-000000000/example',
      },
    ],
    [
      'event',
      'sign_up',
      {
        tenant_id: 'tenant-id',
        method: 'email',
      },
    ],
  ]);
});

test('reports platform calls through the debug logger', () => {
  const calls: unknown[][] = [];
  const debugCalls: unknown[] = [];
  const testWindow = getTestWindow();
  testWindow.gtag = ((...args: unknown[]) =>
    calls.push(args)) as GoogleTagQueue;

  const sdk = createAdsPixel({
    google: {
      measurementIds: ['AW-000000000'],
      debug: true,
      debugLogger: (call) => debugCalls.push(call),
    },
    meta: { enabled: false },
    openai: { enabled: false },
  });
  sdk.init();
  calls.length = 0;
  debugCalls.length = 0;

  sdk.track({
    name: 'sign_up',
    google: {
      eventName: 'sign_up',
      properties: {
        method: 'email',
      },
    },
  });

  expect(debugCalls).toEqual([
    {
      platform: 'google',
      command: 'event',
      args: ['sign_up', { method: 'email' }],
    },
  ]);
  expect(calls).toEqual([['event', 'sign_up', { method: 'email' }]]);
});

test('tracks multiple Meta events from an event array', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  testWindow.fbq = ((...args: unknown[]) => calls.push(args)) as MetaPixelQueue;

  const sdk = createAdsPixel({
    google: { enabled: false },
    meta: { pixelIds: ['000000000'] },
    openai: { enabled: false },
  });
  sdk.init();
  calls.length = 0;

  sdk.track({
    name: 'registration_completed',
    properties: {
      tenant_id: 'tenant-id',
    },
    meta: [
      {
        method: 'track',
        eventName: 'Lead',
      },
      {
        method: 'trackCustom',
        eventName: 'RegistrationSource',
        properties: {
          source: 'register_success',
        },
      },
    ],
  });

  expect(calls).toEqual([
    [
      'track',
      'Lead',
      {
        tenant_id: 'tenant-id',
      },
    ],
    [
      'trackCustom',
      'RegistrationSource',
      {
        tenant_id: 'tenant-id',
        source: 'register_success',
      },
    ],
  ]);
});

test('does not reinitialize Meta Pixel when identifying a user', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  testWindow.fbq = ((...args: unknown[]) => calls.push(args)) as MetaPixelQueue;

  const sdk = createAdsPixel({
    google: { enabled: false },
    meta: { pixelIds: ['000000000'] },
    openai: { enabled: false },
  });
  sdk.init();
  calls.length = 0;

  sdk.identify({ google: { email: 'test@example.com' } });

  expect(calls).toEqual([]);
});

test('tracks multiple OpenAI events from an event array', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  const queue = ((...args: unknown[]) => calls.push(args)) as OpenAIAdsQueue;
  queue.q = [];
  testWindow.oaiq = queue;

  const sdk = createAdsPixel({
    google: { enabled: false },
    meta: { enabled: false },
    openai: { pixelId: 'pixel-id' },
  });
  sdk.init();
  calls.length = 0;

  sdk.track({
    name: 'registration_completed',
    openai: [
      {
        eventName: 'registration_completed',
        payload: {
          type: 'customer_action',
        },
      },
      {
        eventName: 'custom',
        payload: {
          type: 'custom',
        },
        options: {
          custom_event_name: 'registration_source',
        },
      },
    ],
  });

  expect(calls).toEqual([
    [
      'measure',
      'registration_completed',
      {
        type: 'customer_action',
      },
    ],
    [
      'measure',
      'custom',
      {
        type: 'custom',
      },
      {
        custom_event_name: 'registration_source',
      },
    ],
  ]);
});

test('does not send events through adapters that were not initialized', () => {
  const googleCalls: unknown[][] = [];
  const metaCalls: unknown[][] = [];
  const openAICalls: unknown[][] = [];
  const testWindow = getTestWindow();
  testWindow.gtag = ((...args: unknown[]) =>
    googleCalls.push(args)) as GoogleTagQueue;
  testWindow.fbq = ((...args: unknown[]) =>
    metaCalls.push(args)) as MetaPixelQueue;
  const openAIQueue = ((...args: unknown[]) =>
    openAICalls.push(args)) as OpenAIAdsQueue;
  openAIQueue.q = [];
  testWindow.oaiq = openAIQueue;

  const sdk = createAdsPixel();
  sdk.identify({ google: { email: 'test@example.com' } });
  sdk.track({
    name: 'unexpected',
    google: { eventName: 'unexpected' },
    meta: { method: 'trackCustom', eventName: 'Unexpected' },
    openai: {
      eventName: 'custom',
      payload: { type: 'custom' },
      options: { custom_event_name: 'unexpected' },
    },
  });

  expect(googleCalls).toEqual([]);
  expect(metaCalls).toEqual([]);
  expect(openAICalls).toEqual([]);
});

test('applies default consent before platform initialization', () => {
  const googleCalls: unknown[][] = [];
  const metaCalls: unknown[][] = [];
  const openAICalls: unknown[][] = [];
  const testWindow = getTestWindow();
  testWindow.gtag = ((...args: unknown[]) =>
    googleCalls.push(args)) as GoogleTagQueue;
  testWindow.fbq = ((...args: unknown[]) =>
    metaCalls.push(args)) as MetaPixelQueue;
  const openAIQueue = ((...args: unknown[]) =>
    openAICalls.push(args)) as OpenAIAdsQueue;
  openAIQueue.q = [];
  testWindow.oaiq = openAIQueue;

  createAdsPixel({
    consent: { advertising: false, analytics: true },
    google: { measurementIds: ['AW-000000000'] },
    meta: { pixelIds: ['000000000'] },
    openai: { pixelId: 'pixel-id' },
  }).init();

  expect(googleCalls[0]).toEqual([
    'consent',
    'default',
    {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted',
    },
  ]);
  expect(metaCalls[0]).toEqual(['consent', 'revoke']);
  expect(openAICalls[0]).toEqual(['consent', false]);
});

test('updates OpenAI identity with supported hashed user fields', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  const queue = ((...args: unknown[]) => calls.push(args)) as OpenAIAdsQueue;
  queue.q = [];
  testWindow.oaiq = queue;
  const sdk = createAdsPixel({
    google: { enabled: false },
    meta: { enabled: false },
    openai: { pixelId: 'pixel-id' },
  });
  sdk.init();
  calls.length = 0;

  const emailSha256 = 'a'.repeat(64);
  sdk.identify({ openai: { email_sha256: emailSha256, country: 'US' } });

  expect(calls).toEqual([
    [
      'init',
      {
        pixelId: 'pixel-id',
        user: { email_sha256: emailSha256, country: 'US' },
      },
    ],
  ]);
});

test('does not inject a duplicate Google script for another destination', () => {
  const existingScript = document.createElement('script');
  existingScript.id = 'existing-google-tag';
  existingScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-EXISTING';
  document.head.appendChild(existingScript);

  createAdsPixel({
    google: { measurementIds: ['AW-000000000'] },
    meta: { enabled: false },
    openai: { enabled: false },
  }).init();

  expect(
    document.querySelectorAll(
      'script[src*="https://www.googletagmanager.com/gtag/js"]',
    ),
  ).toHaveLength(1);
});

test('does not send invalid OpenAI amount payloads', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  const queue = ((...args: unknown[]) => calls.push(args)) as OpenAIAdsQueue;
  queue.q = [];
  testWindow.oaiq = queue;
  const sdk = createAdsPixel({
    google: { enabled: false },
    meta: { enabled: false },
    openai: { pixelId: 'pixel-id' },
  });
  sdk.init();
  calls.length = 0;

  sdk.track({
    name: 'subscription_created',
    openai: {
      eventName: 'subscription_created',
      payload: {
        type: 'plan_enrollment',
        amount: 12.34,
        currency: 'USD',
      },
    },
  });

  expect(calls).toEqual([]);
});
