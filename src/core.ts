import { preparePlatforms } from './destinations';
import type {
  AdAdapter,
  AdConsent,
  AdsPixelConfig,
  AdsPixelEvent,
  AdsPixelInitResult,
  UserIdentity,
  GooglePlatformOptions,
  MetaPlatformOptions,
  OpenAIPlatformOptions,
} from './types';

export type AdsPixelAdapterMap = {
  google?: AdAdapter<GooglePlatformOptions>;
  meta?: AdAdapter<MetaPlatformOptions>;
  openai?: AdAdapter<OpenAIPlatformOptions>;
};

export class AdsPixel {
  private manualConsent?: AdConsent;

  constructor(
    private readonly adapters: AdsPixelAdapterMap,
    private config: AdsPixelConfig = {},
  ) {}

  init(config: AdsPixelConfig = {}): AdsPixelInitResult {
    const nextConfig = {
      ...this.config,
      ...config,
      globalDefaults: {
        ...this.config.globalDefaults,
        ...config.globalDefaults,
      },
    };
    const destinations = preparePlatforms(nextConfig);
    const consent = this.manualConsent ?? nextConfig.consent;
    this.config = nextConfig;

    this.adapters.google?.init(destinations.google, consent);
    this.adapters.meta?.init(destinations.meta, consent);
    this.adapters.openai?.init(destinations.openai, consent);

    const imageTagFallbacks =
      consent?.advertising === true
        ? [
            ...(this.adapters.meta?.getImageTagFallbacks?.(destinations.meta) ??
              []),
            ...(this.adapters.openai?.getImageTagFallbacks?.(
              destinations.openai,
            ) ?? []),
          ]
        : [];
    return { imageTagFallbacks };
  }

  setConsent(consent: AdConsent) {
    this.manualConsent = consent;
    this.adapters.google?.setConsent(consent);
    this.adapters.meta?.setConsent(consent);
    this.adapters.openai?.setConsent(consent);
  }

  setUserIdentity(user: UserIdentity) {
    for (const platform of user.platforms ??
      (['google', 'meta', 'openai'] as const)) {
      this.adapters[platform]?.setUserIdentity(user);
    }
  }

  track(event: AdsPixelEvent) {
    this.adapters.google?.track(event);
    this.adapters.meta?.track(event);
    this.adapters.openai?.track(event);
  }
}
