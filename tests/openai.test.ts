import { afterEach, expect, test } from '@rstest/core';
import { createAdsPixel } from '../src/index';
import { openAIQueue, resetBrowser } from './browser-fixture';

afterEach(resetBrowser);

test('normalizes OpenAI events identically for both pixels and scopes agency-only events', () => {
  const sdk = createAdsPixel();
  sdk.init({
    openai: [{ trackingDestinationId: 'agency' }, { trackingDestinationId: 'owned' }],
  });
  sdk.track({ name: 'registration_completed', openai: { eventId: 'reg-1' } });
  sdk.track({ name: 'waba_created', openai: { eventId: 'waba-1' } });
  sdk.track({
    name: 'payment',
    properties: { plan_id: 'pro', amount: 1234, currency: 'USD' },
    openai: [
      {
        eventName: 'subscription_created',
        trackingDestinationId: 'agency',
        eventId: 'paid-1',
      },
      { eventName: 'order_created', eventId: 'order-1' },
      { eventName: 'trial_started', trackingDestinationId: 'external' },
    ],
  });

  expect(openAIQueue().slice(2)).toEqual([
    ...['agency', 'owned'].map((id) => [
      'measureSingle',
      id,
      'registration_completed',
      { type: 'customer_action' },
      { event_id: 'reg-1' },
    ]),
    ...['agency', 'owned'].map((id) => [
      'measureSingle',
      id,
      'custom',
      { type: 'custom' },
      { custom_event_name: 'waba_created', event_id: 'waba-1' },
    ]),
    [
      'measureSingle',
      'agency',
      'subscription_created',
      {
        type: 'plan_enrollment',
        plan_id: 'pro',
        amount: 1234,
        currency: 'USD',
      },
      { event_id: 'paid-1' },
    ],
    ...['agency', 'owned'].map((id) => [
      'measureSingle',
      id,
      'order_created',
      {
        type: 'contents',
        contents: [{ id: 'pro' }],
        amount: 1234,
        currency: 'USD',
      },
      { event_id: 'order-1' },
    ]),
  ]);
});

test('validates OpenAI amounts and quantities and sends only supported content fields', () => {
  const sdk = createAdsPixel();
  sdk.init({ openai: { trackingDestinationId: 'owned' } });
  sdk.track({
    name: 'order_created',
    openai: { properties: { amount: 1.1, currency: 'USD' } },
  });
  sdk.track({
    name: 'order_created',
    openai: { properties: { contents: [{ id: 'pro', quantity: 1.5 }] } },
  });
  sdk.track({
    name: 'order_created',
    properties: { contents: [{ id: 'pro', quantity: 1, group_id: 'api-only', variant_dict: { size: 'm' } }] },
    openai: {},
  });
  expect(openAIQueue()).toEqual([
    ['init', { pixelId: 'owned' }],
    ['measureSingle', 'owned', 'order_created', { type: 'contents', contents: [{ id: 'pro', quantity: 1 }] }],
  ]);
});

test('uses destination debug instead of the outer default for vendor event logs', () => {
  const calls: unknown[][] = [];
  const debug = console.debug;
  console.debug = (...args: unknown[]) => {
    calls.push(args);
  };
  try {
    const sdk = createAdsPixel();
    sdk.init({
      globalDefaults: { debug: true },
      openai: [{ trackingDestinationId: 'default' }, { trackingDestinationId: 'quiet', debug: false }],
    });
    sdk.track({ name: 'registration_completed', openai: {} });
    expect(calls.filter((args) => args[2] === 'measureSingle').map((args) => args[3])).toEqual(['default']);
  } finally {
    console.debug = debug;
  }
});

test('adapts the latest OpenAI matching fields and validates hashes in both identity entrypoints', () => {
  const sdk = createAdsPixel();
  const emailHash = 'a'.repeat(64);
  const phoneHash = 'b'.repeat(64);
  const lastNameHash = 'c'.repeat(64);
  sdk.init({
    openai: [
      { trackingDestinationId: 'owned', platformOptions: { user: { email_sha256: emailHash, postal_code: '94107' } } },
      { trackingDestinationId: 'other', platformOptions: { user: { phone_number_sha256: 'raw-number' } } },
    ],
  });
  sdk.setUserIdentity({
    phoneNumberSha256: phoneHash,
    lastNameSha256: lastNameHash,
    region: ' California ',
    country: 'us',
    postalCode: ' 94107 ',
    platforms: ['openai'],
  });

  expect(openAIQueue()).toEqual([
    ['init', { pixelId: 'owned', user: { email_sha256: emailHash, postal_code: '94107' } }],
    ['init', { pixelId: 'other' }],
    ...['owned', 'other'].map((pixelId) => [
      'init',
      {
        pixelId,
        user: {
          phone_number_sha256: phoneHash,
          last_name_sha256: lastNameHash,
          country: 'US',
          region: 'California',
          postal_code: '94107',
        },
      },
    ]),
  ]);
});

test('keeps app-only OpenAI events out of the browser queue and validates custom names', () => {
  const sdk = createAdsPixel();
  sdk.init({ openai: { trackingDestinationId: 'owned' } });
  for (const name of ['app_installed', 'APP_OPENED', 'custom', '-bad', 'bad name', 'x'.repeat(65)]) {
    sdk.track({ name, openai: {} });
  }
  sdk.track({ name: 'Quote_Requested', openai: { platformOptions: { optOut: true } } });
  sdk.track({
    name: 'order_created',
    openai: { properties: { currency: 'JPY', contents: [{ id: 'plan', amount: 125, quantity: 2 }] } },
  });

  expect(openAIQueue()).toEqual([
    ['init', { pixelId: 'owned' }],
    ['measureSingle', 'owned', 'custom', { type: 'custom' }, { custom_event_name: 'quote_requested', opt_out: true }],
    [
      'measureSingle',
      'owned',
      'order_created',
      {
        type: 'contents',
        currency: 'JPY',
        contents: [{ id: 'plan', amount: 125, quantity: 2 }],
      },
    ],
  ]);
});
