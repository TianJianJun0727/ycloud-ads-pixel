import type { GoogleAdapterConfig, GoogleEventOptions } from './google/types';
import type { MetaAdapterConfig, MetaEventOptions } from './meta/types';
import type { OpenAIAdapterConfig, OpenAIEventOptions } from './openai/types';

export type OneOrMany<T> = T | T[];

export type AdUser = Record<string, unknown>;

export type AdAdapterConfig = {
  enabled?: boolean;
  defaultProperties?: Record<string, unknown>;
};

export type AdsPixelEvent = {
  name: string;
  properties?: Record<string, unknown>;
  google?: OneOrMany<GoogleEventOptions>;
  meta?: OneOrMany<MetaEventOptions>;
  openai?: OneOrMany<OpenAIEventOptions>;
};

export interface AdAdapter<Config extends AdAdapterConfig = AdAdapterConfig> {
  init(config?: Config): void;
  identify(user: AdUser): void;
  track(event: AdsPixelEvent): void;
}

export type AdsPixelConfig = {
  enabled?: boolean;
  google?: GoogleAdapterConfig;
  meta?: MetaAdapterConfig;
  openai?: OpenAIAdapterConfig;
};

export type AdsPixelWindow = {
  init(config?: AdsPixelConfig): void;
  identify(user: AdUser): void;
  track(event: AdsPixelEvent): void;
};

export type AdsPixelBrowserWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: import('./google').GoogleTagQueue;
  fbq?: import('./meta').MetaPixelQueue;
  _fbq?: import('./meta').MetaPixelQueue;
  oaiq?: import('./openai').OpenAIAdsQueue;
  adsPixel?: AdsPixelWindow;
};
