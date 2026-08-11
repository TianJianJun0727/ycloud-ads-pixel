import type {
  AdsPixelConfig,
  AdsPixelEvent,
  AdAdapter,
  AdConsent,
  AdUser,
} from './types';

export type AdsPixelAdapterMap = {
  google?: AdAdapter;
  meta?: AdAdapter;
  openai?: AdAdapter;
};

export class AdsPixel {
  private enabled: boolean;

  private adapters: AdsPixelAdapterMap;

  private consent?: AdConsent;

  constructor(adapters: AdsPixelAdapterMap, config: AdsPixelConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.adapters = adapters;
    this.consent = config.consent;
  }

  init(config: AdsPixelConfig = {}) {
    this.enabled = config.enabled ?? this.enabled;

    if (!this.enabled) {
      return;
    }

    if (config.consent) {
      this.consent = config.consent;
    }

    if (this.consent) {
      this.setConsent(this.consent);
    }

    this.adapters.google?.init(config.google);
    this.adapters.meta?.init(config.meta);
    this.adapters.openai?.init(config.openai);
  }

  setConsent(consent: AdConsent) {
    this.consent = consent;

    if (!this.enabled) {
      return;
    }

    this.adapters.google?.setConsent(consent);
    this.adapters.meta?.setConsent(consent);
    this.adapters.openai?.setConsent(consent);
  }

  identify(user: AdUser) {
    if (!this.enabled) {
      return;
    }

    this.adapters.google?.identify(user);
    this.adapters.meta?.identify(user);
    this.adapters.openai?.identify(user);
  }

  track(event: AdsPixelEvent) {
    if (!this.enabled) {
      return;
    }

    this.adapters.google?.track(event);
    this.adapters.meta?.track(event);
    this.adapters.openai?.track(event);
  }
}
