import { afterEach, expect, test } from '@rstest/core';
import { adsPixel, createAdsPixel, installAdsPixel } from '../src/index';
import type {
  GoogleTagQueue,
  MetaPixelQueue,
  OpenAIAdsQueue,
} from '../src/index';

type AdsPixelTestWindow = Window & {
  dataLayer?: unknown[][];
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

test('tracks multiple Google events from an event array', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  testWindow.gtag = ((...args: unknown[]) =>
    calls.push(args)) as GoogleTagQueue;

  createAdsPixel().track({
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

test('tracks multiple Meta events from an event array', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  testWindow.fbq = ((...args: unknown[]) => calls.push(args)) as MetaPixelQueue;

  createAdsPixel().track({
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

test('tracks multiple OpenAI events from an event array', () => {
  const calls: unknown[][] = [];
  const testWindow = getTestWindow();
  const queue = ((...args: unknown[]) => calls.push(args)) as OpenAIAdsQueue;
  queue.q = [];
  testWindow.oaiq = queue;

  createAdsPixel().track({
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
