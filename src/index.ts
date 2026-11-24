export { adsPixel, createAdsPixel } from './core/create-ads-pixel';
export { installAdsPixel } from './browser/install';
export { AdsPixel } from './core/ads-pixel';

export {
  GOOGLE_CONVERSION_EVENT_NAME,
  GOOGLE_CONVERSION_PROPERTIES,
  GOOGLE_CONTROL_PARAMETERS,
  GOOGLE_DEFAULT_SCRIPT_ID,
  GOOGLE_ITEM_PARAMETERS,
  GOOGLE_RECOMMENDED_EVENT_PARAMETERS,
  GOOGLE_RECOMMENDED_EVENTS,
} from './platforms/google';

export {
  META_CONTENT_PROPERTIES,
  META_DEFAULT_SCRIPT_ID,
  META_DEFAULT_SCRIPT_SRC,
  META_STANDARD_EVENTS,
  META_STANDARD_EVENT_PROPERTIES,
} from './platforms/meta';

export {
  OPENAI_CONTENT_EVENTS,
  OPENAI_CONTENT_ITEM_PROPERTIES,
  OPENAI_CONTENT_PROPERTIES,
  OPENAI_CUSTOMER_ACTION_EVENTS,
  OPENAI_CUSTOMER_ACTION_PROPERTIES,
  OPENAI_CUSTOM_PROPERTIES,
  OPENAI_DEFAULT_SCRIPT_ID,
  OPENAI_DEFAULT_SCRIPT_SRC,
  OPENAI_EVENT_OPTION_PROPERTIES,
  OPENAI_PLAN_ENROLLMENT_EVENTS,
  OPENAI_PLAN_ENROLLMENT_PROPERTIES,
  OPENAI_STANDARD_EVENTS,
} from './platforms/openai';

export type {
  GoogleConfigParameters,
  GoogleConsentArg,
  GoogleConsentParams,
  GoogleConsentState,
  GoogleControlParameters,
  GoogleEventOptions,
  GoogleEventProperties,
  GoogleGetFieldName,
  GoogleItem,
  GoogleRecommendedEventName,
  GoogleTagQueue,
} from './platforms/google';

export type {
  MetaAdvancedMatching,
  MetaContent,
  MetaCustomEventOptions,
  MetaEventOptions,
  MetaEventProperties,
  MetaPixelQueue,
  MetaStandardEventName,
  MetaStandardEventOptions,
} from './platforms/meta';

export type {
  OpenAIContent,
  OpenAIContentEventName,
  OpenAIContentsPayload,
  OpenAICustomPayload,
  OpenAICustomerActionEventName,
  OpenAICustomerActionPayload,
  OpenAIEventOptions,
  OpenAIEventOptionsPayload,
  OpenAIPlanEnrollmentEventName,
  OpenAIPlanEnrollmentPayload,
  OpenAIStandardEventOptions,
  OpenAIAdsQueue,
  OpenAIUserData,
} from './platforms/openai';

export type { AdsPixelAdapterMap } from './core/ads-pixel';

export type {
  AdsPixelConfig,
  AdsPixelEvent,
  AdsPixelWindow,
  AdAdapter,
  AdConsent,
  UserIdentity,
  PlatformEvent,
  TrackingPlatform,
  GlobalDefaults,
  TrackingDestination,
  AdsPixelInitResult,
  ImageTagFallback,
  ResolvedDestination,
} from './core/types';

export type {
  GooglePlatformOptions,
  GoogleEventPlatformOptions,
} from './platforms/google/types';
export type { MetaPlatformOptions } from './platforms/meta/types';
export type {
  OpenAIPlatformOptions,
  OpenAIEventPlatformOptions,
} from './platforms/openai/types';
export type { OneOrMany } from './shared/one-or-many';
