import type {
  GoogleEventPlatformOptions,
  GooglePlatformOptions,
} from '../platforms/google/types';
import type { MetaPlatformOptions } from '../platforms/meta/types';
import type {
  OpenAIEventPlatformOptions,
  OpenAIPlatformOptions,
} from '../platforms/openai/types';
import type { OneOrMany } from '../shared/one-or-many';

export type GlobalDefaults = {
  enabled?: boolean;
  debug?: boolean;
};

export type TrackingDestination<PlatformOptions> = GlobalDefaults & {
  trackingDestinationId: string;
  autoTrackPageView?: boolean;
  imageTagFallback?: boolean;
  platformOptions?: PlatformOptions;
};

export type AdConsent = { advertising: boolean; analytics?: boolean };

export type TrackingPlatform = 'google' | 'meta' | 'openai';

export type UserIdentity = {
  platforms?: readonly TrackingPlatform[];
  email?: string;
  emailSha256?: string;
  externalIdSha256?: string;
  country?: string;
  city?: string;
  postalCode?: string;
};

export type PlatformEvent<Options = never> = {
  eventName?: string;
  trackingDestinationId?: string;
  eventId?: string;
  properties?: Record<string, unknown>;
  platformOptions?: Options;
};

export type AdsPixelEvent = {
  name: string;
  properties?: Record<string, unknown>;
  google?: OneOrMany<PlatformEvent<GoogleEventPlatformOptions>>;
  meta?: OneOrMany<PlatformEvent>;
  openai?: OneOrMany<PlatformEvent<OpenAIEventPlatformOptions>>;
};

export type AdsPixelConfig = {
  globalDefaults?: GlobalDefaults;
  consent?: AdConsent;
  google?: OneOrMany<TrackingDestination<GooglePlatformOptions>>;
  meta?: OneOrMany<TrackingDestination<MetaPlatformOptions>>;
  openai?: OneOrMany<TrackingDestination<OpenAIPlatformOptions>>;
};

export type ImageTagFallback = {
  platform: 'meta' | 'openai';
  trackingDestinationId: string;
  src: string;
};

export type AdsPixelInitResult = {
  imageTagFallbacks: readonly ImageTagFallback[];
};

export type ResolvedDestination<Options> = Required<GlobalDefaults> & {
  id: string;
  autoTrackPageView: boolean;
  imageTagFallback: boolean;
  platformOptions?: Options;
};

export interface AdAdapter<Options> {
  init(
    destinations: readonly ResolvedDestination<Options>[],
    consent?: AdConsent,
  ): void;
  setConsent(consent: AdConsent): void;
  setUserIdentity(user: UserIdentity): void;
  track(event: AdsPixelEvent): void;
  getImageTagFallbacks?(
    destinations: readonly ResolvedDestination<Options>[],
  ): ImageTagFallback[];
}

export type AdsPixelWindow = {
  init(config?: AdsPixelConfig): AdsPixelInitResult;
  setUserIdentity(user: UserIdentity): void;
  track(event: AdsPixelEvent): void;
  setConsent(consent: AdConsent): void;
};
