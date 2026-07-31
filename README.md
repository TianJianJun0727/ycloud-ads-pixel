# @ycloud-web/ads-pixel

Unified browser Ads Pixel SDK for Google Tag, Meta Pixel, and OpenAI Ads Pixel.

## Usage

```ts
import { adsPixel, installAdsPixel } from '@ycloud-web/ads-pixel';

installAdsPixel(adsPixel);

adsPixel.init({
  google: {
    measurementIds: ['AW-000000000'],
  },
  meta: {
    pixelIds: ['000000000000000'],
  },
  openai: {
    pixelId: 'openai-pixel-id',
  },
});

adsPixel.identify({
  email: 'user@example.com',
});

adsPixel.track({
  name: 'registration_completed',
  google: {
    eventName: 'conversion',
    properties: {
      send_to: 'AW-000000000/example',
    },
  },
  meta: {
    method: 'track',
    eventName: 'Lead',
  },
  openai: {
    eventName: 'registration_completed',
    payload: {
      type: 'customer_action',
    },
  },
});
```

Each platform field supports either one event object or an event array:

```ts
adsPixel.track({
  name: 'registration_completed',
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
```

## Setup

Install the dependencies:

```bash
pnpm install
```

## Get started

Build the library:

```bash
pnpm run build
```

Build the library in watch mode:

```bash
pnpm run dev
```

Run tests:

```bash
pnpm run test
```

Run tests in watch mode:

```bash
pnpm run test:watch
```
