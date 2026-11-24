import { afterEach, expect, test } from '@rstest/core';
import { createAdsPixel } from '../src/index';
import { metaQueue, resetBrowser } from './browser-fixture';

afterEach(resetBrowser);

test('requires valid Meta Purchase value and currency while accepting numeric catalog IDs', () => {
  const sdk = createAdsPixel();
  sdk.init({ meta: { trackingDestinationId: '123', autoTrackPageView: false } });
  sdk.track({ name: 'Purchase', meta: { properties: { currency: 'USD' } } });
  sdk.track({ name: 'Purchase', meta: { properties: { value: Infinity, currency: 'USD' } } });
  sdk.track({ name: 'Purchase', meta: { properties: { value: 0, currency: 'US' } } });
  sdk.track({
    name: 'Purchase',
    meta: {
      eventId: 'order-1',
      properties: { value: 0, currency: 'USD', content_ids: [2048], contents: [{ id: '2048', quantity: 1 }] },
    },
  });

  expect(metaQueue()).toEqual([
    ['init', '123'],
    [
      'trackSingle',
      '123',
      'Purchase',
      {
        value: 0,
        currency: 'USD',
        content_ids: [2048],
        contents: [{ id: '2048', quantity: 1 }],
        event_id: 'order-1',
      },
      { eventID: 'order-1' },
    ],
  ]);
});
