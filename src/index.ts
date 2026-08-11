import { AdsPixel } from './core';
import { GoogleAdapter } from './google';
import { MetaAdapter } from './meta';
import { OpenAIAdapter } from './openai';
import type { AdsPixelConfig } from './types';

export { installAdsPixel } from './browser';
export { AdsPixel } from './core';

export {
  GOOGLE_CONVERSION_EVENT_NAME,
  GOOGLE_CONVERSION_PROPERTIES,
  GOOGLE_CONTROL_PARAMETERS,
  GOOGLE_DEFAULT_SCRIPT_ID,
  GOOGLE_ITEM_PARAMETERS,
  GOOGLE_RECOMMENDED_EVENT_PARAMETERS,
  GOOGLE_RECOMMENDED_EVENTS,
} from './google';

export {
  META_CONTENT_PROPERTIES,
  META_DEFAULT_SCRIPT_ID,
  META_DEFAULT_SCRIPT_SRC,
  META_STANDARD_EVENTS,
  META_STANDARD_EVENT_PROPERTIES,
} from './meta';

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
} from './openai';

export type {
  GoogleAdapterConfig,
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
} from './google';

export type {
  MetaAdapterConfig,
  MetaAdvancedMatching,
  MetaContent,
  MetaCustomEventOptions,
  MetaEventOptions,
  MetaEventProperties,
  MetaPixelQueue,
  MetaStandardEventName,
  MetaStandardEventOptions,
} from './meta';

export type {
  OpenAIAdapterConfig,
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
} from './openai';

export type { AdsPixelAdapterMap } from './core';

export type {
  AdsPixelConfig,
  AdsPixelEvent,
  AdsPixelWindow,
  AdAdapter,
  AdAdapterConfig,
  AdAdapterDebugCall,
  AdConsent,
  AdUser,
} from './types';

export const createAdsPixel = (config: AdsPixelConfig = {}) =>
  new AdsPixel(
    {
      google: new GoogleAdapter(config.google),
      meta: new MetaAdapter(config.meta),
      openai: new OpenAIAdapter(config.openai),
    },
    config,
  );

export const adsPixel = createAdsPixel();
