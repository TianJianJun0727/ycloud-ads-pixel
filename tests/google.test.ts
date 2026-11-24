import { afterEach, expect, test } from '@rstest/core';
import { createAdsPixel, GOOGLE_RECOMMENDED_EVENTS } from '../src/index';
import { googleQueue, resetBrowser } from './browser-fixture';

afterEach(resetBrowser);

test('does not duplicate a Google tag script already on the page', () => {
  const script = document.createElement('script');
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-previous';
  document.head.appendChild(script);
  createAdsPixel().init({ google: { trackingDestinationId: 'AW-123' } });
  expect(Array.from(document.scripts)).toEqual([script]);
});

test('supports GA4 lead events and sends a labeled conversion only to Ads', () => {
  const sdk = createAdsPixel();
  sdk.init({
    google: [{ trackingDestinationId: 'AW-123' }, { trackingDestinationId: 'G-456' }],
  });
  expect(GOOGLE_RECOMMENDED_EVENTS).toEqual(
    expect.arrayContaining([
      'close_convert_lead',
      'close_unconvert_lead',
      'disqualify_lead',
      'qualify_lead',
      'working_lead',
    ]),
  );
  sdk.track({
    name: 'qualify_lead',
    google: { trackingDestinationId: 'G-456', properties: { lead_source: 'webinar', value: 25, currency: 'USD' } },
  });
  sdk.track({
    name: 'signup',
    google: { eventId: 'order-1', platformOptions: { conversionLabel: 'label' }, properties: { new_customer: true } },
  });
  expect(googleQueue().slice(3)).toEqual([
    ['event', 'qualify_lead', { lead_source: 'webinar', value: 25, currency: 'USD', send_to: 'G-456' }],
    ['event', 'conversion', { new_customer: true, transaction_id: 'order-1', send_to: 'AW-123/label' }],
  ]);
});
