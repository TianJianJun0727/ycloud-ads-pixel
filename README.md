# YCloud Ads Pixel SDK

A browser SDK for Google Tag, Meta Pixel, OpenAI Ads Pixel, and LinkedIn Insight Tag. Install it with `pnpm add @ycloud/ads-ads-pixel`.

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
  linkedin: { trackingDestinationId: '1234567' },
} satisfies AdsPixelConfig;

const { imageTagFallbacks } = adsPixel.init(config);
```

Each platform accepts a destination object or an array of destination objects. Use one `trackingDestinationId` per object and one entry per ID within each platform. A destination's `enabled` and `debug` override `globalDefaults`. Disabling a destination excludes it from initialization, identity updates, and event routing.

| Destination field       | Default                                           | Purpose                                                               |
| ----------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| `trackingDestinationId` | Required                                          | Google tag ID, Meta Pixel ID, OpenAI Pixel ID, or LinkedIn Partner ID |
| `enabled`               | `true`                                            | Include this destination in SDK operations                            |
| `debug`                 | `false`                                           | Log SDK commands for this destination                                 |
| `autoTrackPageView`     | Google, Meta, and LinkedIn `true`, OpenAI `false` | Report a page view during initialization                              |
| `imageTagFallback`      | `true`                                            | Include a supported page view image fallback                          |
| `platformOptions`       | Optional                                          | Google `groups`, Meta `advancedMatching`, or OpenAI `user`            |

The SDK builds Meta, OpenAI, and LinkedIn image fallback URLs when page view tracking and the fallback are enabled for a destination and advertising consent is granted. For no-script tracking, call `init(config)` when rendering HTML on the server and render each returned `src` as an `<img>` inside `<noscript>`. Calling `init` in the browser does not insert these images.

## Set user identity

```ts
adsPixel.setUserIdentity({
  email: 'person@example.com',
  platforms: ['google'],
});
```

Call after login or once the application loads the user's identity. The common input supports `email`, `emailSha256`, `phoneNumberSha256`, `firstNameSha256`, `lastNameSha256`, `externalIdSha256`, `country`, `city`, `region`, and `postalCode`. The adapter uses only fields supported by the destination. Omit `platforms` to update all initialized, enabled platforms. OpenAI accepts normalized SHA-256 identifiers and sends the postal code as `postal_code`. When you update OpenAI matching, supply the complete identity available at that point. LinkedIn Insight Tag uses browser attribution for conversions. [OpenAI Measurement Pixel](https://developers.openai.com/ads/measurement-pixel)

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

Only the platform keys present in the event receive it. Each platform accepts an object or an array with the same fields. Omit `eventName` to use `name`, except for Google Ads conversions with a label, which default to `conversion`. Omit `trackingDestinationId` to send to all enabled, initialized destinations on that platform. Platform `properties` override shared `properties`. The adapter maps the event name, event ID, and supported values to the platform's vendor command.

Platform event options include Google `conversionLabel` and `destinationGroup`, OpenAI `optOut`, and LinkedIn `conversionId`.

### Platform event contracts

- Google accepts recommended and custom events. GA4 includes lead-stage events such as `qualify_lead` and `close_convert_lead`. For Google Ads, `conversionLabel` targets an `AW-…/label` destination, and purchase conversions can include `new_customer`. [GA4 events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events) · [Google Ads conversion tags](https://support.google.com/google-ads/answer/7548399)
- Meta requires a finite `value` and three-letter `currency` for `Purchase`. Catalog IDs in `content_ids` can be strings or numbers. Each object in `contents` has an `id` and `quantity`. [Meta Pixel reference](https://developers.facebook.com/documentation/meta-pixel/reference)
- OpenAI uses integer minor currency units. Item amounts are per unit and can inherit the event currency. Pass the descriptive name for custom events, such as `quote_requested`. The adapter sends the proper native custom event shape. `app_installed` and `app_opened` are supported by the Conversions API. [OpenAI supported events](https://developers.openai.com/ads/supported-events)

### LinkedIn Insight Tag

Use your Campaign Manager Partner ID as `trackingDestinationId`. For each conversion, pass the Conversion ID for the corresponding Campaign Manager rule. An optional `eventId` maps to LinkedIn's `event_id` for deduplication with a server-reported event. [LinkedIn deduplication guide](https://learn.microsoft.com/en-us/linkedin/marketing/conversions/deduplication?view=li-lms-2026-10)

```ts
adsPixel.track({
  name: 'registration_completed',
  linkedin: {
    trackingDestinationId: '1234567',
    platformOptions: { conversionId: 4567890 },
    eventId: 'signup-123',
  },
});
```

With `autoTrackPageView: true`, the Insight Tag script reports the initial page view and uses the event-specific Insight Tag conversion rule for `track`. With `autoTrackPageView: false`, use a Campaign Manager Image Pixel conversion rule. The SDK sends that event through the image pixel path. [LinkedIn conversion setup](https://www.linkedin.com/help/lms/answer/a423635)

If you configure several Partner IDs, set `trackingDestinationId` on each conversion to select the intended destination and use the Conversion ID associated with it. When you omit the destination and any enabled LinkedIn destination uses Insight Tag, the SDK sends one command through the shared Insight Tag queue. For image-only destinations the SDK sends a request per selected Partner ID. Insight Tag conversions can include a dynamic amount through `properties.value` and `properties.currency`, and a category through `platformOptions.conversionType`. [LinkedIn dynamic conversion values](https://www.linkedin.com/help/lms/answer/a7488563)

## Update consent

```ts
adsPixel.setConsent({ advertising: false, analytics: true });
```

Pass the existing authorization as `init({ consent, ... })` to apply it before platform initialization and automatic page views. Use `setConsent` to apply changes. A call made before `init` is retained and takes precedence over the initial value. `analytics` follows `advertising` when omitted. Google receives both signals. Meta, OpenAI, and LinkedIn use the advertising signal. For LinkedIn, denying advertising consent defers initial script loading and prevents subsequent SDK conversion requests. If your page also installs an Insight Tag independently, apply consent to that installation separately.

## Source layout

| Directory        | Responsibility                                                                 |
| ---------------- | ------------------------------------------------------------------------------ |
| `src/core/`      | Public configuration and event types, destination resolution, and SDK dispatch |
| `src/browser/`   | Browser globals, script loading, and SDK installation                          |
| `src/platforms/` | Google, Meta, OpenAI, and LinkedIn adapters, vendor types, and constants       |
| `src/shared/`    | Helpers reused across those modules                                            |

`src/index.ts` is the package entry point.

## Develop

Use Node.js 22.22.2+, 24.15.0+, or 26+ and the pnpm version in `package.json`.
Run `pnpm install` to install dependencies and register the pre-commit hook. The hook formats staged files with Oxfmt and runs the format and lint checks on those files.

| Command                 | Purpose                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `pnpm run format`       | Format source and documentation                                  |
| `pnpm run format:check` | Check formatting                                                 |
| `pnpm run lint`         | Run Oxlint                                                       |
| `pnpm run test`         | Run the SDK tests                                                |
| `pnpm run build`        | Build the ESM, CommonJS, UMD, and TypeScript declaration outputs |
| `pnpm pack`             | Build and create a local npm tarball                             |

Use `pnpm run dev` or `pnpm run test:watch` for watch mode.

## Release

Run these commands from a clean branch with a Git upstream and publish access to the npm registry configured in `package.json`.

| Command                 | npm dist-tag |
| ----------------------- | ------------ |
| `pnpm run release:beta` | `beta`       |
| `pnpm run release`      | `latest`     |

Add `--dry-run --npm.skipChecks` to preview a release without registry credentials. Conventional Commits determine the default version increment. Each release bumps `package.json`, adds an entry to `CHANGELOG.md`, and creates a release commit and Git tag. The npm package includes the build outputs and changelog.

To promote a beta series to its corresponding stable version, pass the exact stable version, for example `pnpm run release 2.0.0`.
