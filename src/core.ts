import type {
  AdsPixelConfig,
  AdsPixelEvent,
  AdAdapter,
  AdUser,
} from './types';

export type AdsPixelAdapterMap = {
  google?: AdAdapter;
  meta?: AdAdapter;
  openai?: AdAdapter;
  linkedin?: AdAdapter;
};

export class AdsPixel {
  private enabled: boolean;

  private adapters: AdsPixelAdapterMap;

  constructor(adapters: AdsPixelAdapterMap, config: AdsPixelConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.adapters = adapters;
  }

  init(config: AdsPixelConfig = {}) {
    this.enabled = config.enabled ?? this.enabled;

    if (!this.enabled) {
      return;
    }

    this.adapters.google?.init(config.google);
    this.adapters.meta?.init(config.meta);
    this.adapters.openai?.init(config.openai);
    this.adapters.linkedin?.init(config.linkedin);
  }

  identify(user: AdUser) {
    if (!this.enabled) {
      return;
    }

    this.adapters.google?.identify(user);
    this.adapters.meta?.identify(user);
    this.adapters.openai?.identify(user);
    this.adapters.linkedin?.identify(user);
  }

  track(event: AdsPixelEvent) {
    if (!this.enabled) {
      return;
    }

    this.adapters.google?.track(event);
    this.adapters.meta?.track(event);
    this.adapters.openai?.track(event);
    this.adapters.linkedin?.track(event);
  }
}
