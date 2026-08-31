# @ycloud/ads-ads-pixel

Unified browser Ads Pixel SDK for Google Tag, Meta Pixel, OpenAI Ads Pixel, and LinkedIn Insight Tag.

## Usage

```ts
import { adsPixel, installAdsPixel } from '@ycloud/ads-ads-pixel';

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
  linkedin: {
    partnerId: 'linkedin-partner-id',
  },
});

adsPixel.identify({
  google: {
    email: 'user@example.com',
  },
  openai: {
    email_sha256: '<normalized-email-sha256>',
  },
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
  linkedin: {
    conversionId: 'linkedin-conversion-id',
    eventId: 'registration_completed:user-id',
  },
});
```

Calling `init` initializes configured platforms with collection enabled by default;
no additional consent call is required. Platforms without the required IDs are
not initialized. Existing `enabled: false` options still disable SDK activity.
Business conversions are sent through `track` at their existing trigger points.

The unified `consent` option, `AdConsent` type, and `setConsent` method have been
removed. Existing consumers of these APIs must remove or migrate those usages
before upgrading. The SDK does not send vendor consent commands or override
existing vendor consent choices. Where consent management is required, the host
application owns it through the vendor APIs or its consent management platform.
Vendor queue types still describe the native vendor APIs.

LinkedIn creates the official `lintrk` queue and loads the Insight Tag script
automatically when `partnerId` is configured. Set `linkedin.autoLoad` to
`false` when the script is loaded by the host application. An existing
`window.lintrk` is reused and is never replaced.
Synchronous LinkedIn tracking failures are isolated per event so later events
and the caller's business flow can continue. Failed calls are not retried.

Meta Advanced Matching must be supplied during initialization through
`meta.advancedMatching`. OpenAI identity updates accept only supported
pre-hashed fields; raw email and external IDs must not be passed to OpenAI.

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
