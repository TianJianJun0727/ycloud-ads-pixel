import type { GoogleAdapterConfig, GoogleEventOptions } from './google/types';
import type { MetaAdapterConfig, MetaEventOptions } from './meta/types';
import type {
  OpenAIAdapterConfig,
  OpenAIEventOptions,
  OpenAIUserData,
} from './openai/types';

export type OneOrMany<T> = T | T[];

export type AdAdapterDebugCall = {
  platform: string;
  command: string;
  args: unknown[];
};

export type AdConsent = {
  advertising: boolean;
  analytics?: boolean;
};

export type AdUser = {
  google?: Record<string, unknown>;
  openai?: OpenAIUserData;
};

export type AdAdapterConfig = {
  enabled?: boolean;
  debug?: boolean;
  debugLogger?: (call: AdAdapterDebugCall) => void;
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
  setConsent(consent: AdConsent): void;
  identify(user: AdUser): void;
  track(event: AdsPixelEvent): void;
}

export type AdsPixelConfig = {
  enabled?: boolean;
  consent?: AdConsent;
  google?: GoogleAdapterConfig;
  meta?: MetaAdapterConfig;
  openai?: OpenAIAdapterConfig;
};

export type AdsPixelWindow = {
  init(config?: AdsPixelConfig): void;
  setConsent(consent: AdConsent): void;
  identify(user: AdUser): void;
  track(event: AdsPixelEvent): void;
};

export type AdsPixelBrowserWindow = Window & {
  dataLayer?: unknown[];
  gtag?: import('./google').GoogleTagQueue;
  fbq?: import('./meta').MetaPixelQueue;
  _fbq?: import('./meta').MetaPixelQueue;
  oaiq?: import('./openai').OpenAIAdsQueue;
  adsPixel?: AdsPixelWindow;
};
