# YCloud Ads Pixel SDK

A browser SDK for Google Tag, Meta Pixel, and OpenAI Ads Pixel. Install it with `pnpm add @ycloud/ads-ads-pixel`.

## Initialize

```ts
import { adsPixel, type AdsPixelConfig } from '@ycloud/ads-ads-pixel';

const config = {
  globalDefaults: { enabled: true, debug: false },
  consent: { advertising: true, analytics: true },
  google: { trackingDestinationId: 'AW-123456789' },
  meta: { trackingDestinationId: '123456789', imageTagFallback: false },
  openai: [
    { trackingDestinationId: 'agency-pixel' },
    { trackingDestinationId: 'company-pixel', autoTrackPageView: true },
  ],
} satisfies AdsPixelConfig;

const { imageTagFallbacks } = adsPixel.init(config);
```

Each platform accepts a destination object or an array of destination objects. Use one `trackingDestinationId` per object and one entry per ID within each platform. A destination's `enabled` and `debug` override `globalDefaults`. Disabling a destination excludes it from initialization, identity updates, and event routing.

| Destination field       | Default                                | Purpose                                                           |
| ----------------------- | -------------------------------------- | ----------------------------------------------------------------- |
| `trackingDestinationId` | Required                               | Google tag ID, Meta Pixel ID, or OpenAI Pixel ID                  |
| `enabled`               | `true`                                 | Include this destination in SDK operations                        |
| `debug`                 | `false`                                | Log SDK commands for this destination                             |
| `autoTrackPageView`     | Google and Meta `true`, OpenAI `false` | Report a page view during initialization                          |
| `imageTagFallback`      | `true`                                 | Include a Meta or OpenAI page view image fallback when applicable |
| `platformOptions`       | Optional                               | Google `groups`, Meta `advancedMatching`, or OpenAI `user`        |

The SDK builds image fallback URLs when page view tracking and the fallback are enabled for a destination and advertising consent is granted. For no-script tracking, call `init(config)` when rendering HTML on the server and render each returned `src` as an `<img>` inside `<noscript>`. Calling `init` in the browser does not insert these images.

## Set user identity

```ts
adsPixel.setUserIdentity({
  email: 'person@example.com',
  platforms: ['google'],
});
```

Call after login or once the application loads the user's identity. The common input supports `email`, `emailSha256`, `externalIdSha256`, `country`, `city`, and `postalCode`. The adapter uses only fields supported by the destination. Omit `platforms` to update all initialized, enabled platforms. OpenAI accepts hashed identifiers.

## Track an event

```ts
adsPixel.track({
  name: 'registration_completed',
  google: {
    eventName: 'conversion',
    eventId: 'signup-123',
    platformOptions: { conversionLabel: 'label' },
  },
  meta: { eventName: 'CompleteRegistration', eventId: 'signup-123' },
  openai: { eventId: 'signup-123' },
});

adsPixel.track({
  name: 'subscription_created',
  properties: { plan_id: 'pro', amount: 1234, currency: 'USD' },
  openai: {
    trackingDestinationId: 'agency-pixel',
    eventId: 'payment-123',
  },
});
```

Only the platform keys present in the event receive it. Each platform accepts an object or an array with the same fields. Omit `eventName` to use `name` and omit `trackingDestinationId` to send to all enabled, initialized destinations on that platform. Platform `properties` override shared `properties`. The adapter maps the event name, event ID, and supported values to the platform's vendor command. OpenAI amounts use integer minor currency units.

Platform event options include Google `conversionLabel` and `destinationGroup`, and OpenAI `optOut`.

## Update consent

```ts
adsPixel.setConsent({ advertising: false, analytics: true });
```

Pass the existing authorization as `init({ consent, ... })` to apply it before platform initialization and automatic page views. Use `setConsent` to apply changes. A call made before `init` is retained and takes precedence over the initial value. `analytics` follows `advertising` when omitted. Google receives both signals. Meta and OpenAI receive the advertising signal.

## Develop

Run `pnpm install` to install dependencies, `pnpm run build` to build the package, and `pnpm run test` to run tests. Use `pnpm run dev` or `pnpm run test:watch` for watch mode.
