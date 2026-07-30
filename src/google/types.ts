import type { AdAdapterConfig } from '../types';
import type { GOOGLE_RECOMMENDED_EVENTS } from './constants';

export type GoogleAdapterConfig = AdAdapterConfig & {
  scriptId?: string;
  scriptSrc?: string;
  measurementIds?: readonly string[];
};

export type GoogleRecommendedEventName =
  (typeof GOOGLE_RECOMMENDED_EVENTS)[number];

export type GoogleConsentState = 'granted' | 'denied';

export type GoogleConsentArg = 'default' | 'update';

export type GoogleConsentParams = {
  ad_storage?: GoogleConsentState;
  ad_user_data?: GoogleConsentState;
  ad_personalization?: GoogleConsentState;
  analytics_storage?: GoogleConsentState;
  wait_for_update?: number;
};

export type GoogleControlParameters = {
  groups?: string | string[];
  send_to?: string | string[];
  event_callback?: () => void;
  event_timeout?: number;
};

export type GoogleConfigParameters = GoogleControlParameters &
  Record<string, unknown> & {
    send_page_view?: boolean;
  };

export type GoogleGetFieldName = 'client_id' | 'session_id' | 'gclid' | string;

export type GoogleItem = Record<string, unknown> & {
  item_id?: string;
  item_name?: string;
  affiliation?: string;
  coupon?: string;
  creative_name?: string;
  creative_slot?: string;
  discount?: number;
  index?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  price?: number;
  promotion_id?: string;
  promotion_name?: string;
  quantity?: number;
};

export type GoogleEventProperties = GoogleControlParameters &
  Record<string, unknown> & {
    achievement_id?: string;
    affiliation?: string;
    checkout_option?: string;
    checkout_step?: number;
    content_group?: string;
    content_id?: string;
    content_type?: string;
    coupon?: string;
    send_to?: string;
    value?: number;
    currency?: string;
    description?: string;
    fatal?: boolean;
    group_id?: string;
    items?: GoogleItem[];
    item_list_id?: string;
    item_list_name?: string;
    level?: number;
    method?: string;
    number?: number;
    payment_type?: string;
    promotions?: GoogleItem[];
    score?: number;
    screen_name?: string;
    search_term?: string;
    shipping?: number;
    shipping_tier?: string;
    tax?: number;
    transaction_id?: string;
    virtual_currency_name?: string;
  };

export type GoogleEventOptions = {
  eventName?: GoogleRecommendedEventName | string;
  properties?: GoogleEventProperties;
};

export interface GoogleTagQueue {
  (...args: unknown[]): void;
  (command: 'js', date: Date): void;
  (
    command: 'config',
    measurementId: string,
    config?: GoogleConfigParameters,
  ): void;
  (
    command: 'get',
    target: string,
    fieldName: GoogleGetFieldName,
    callback: (value: unknown) => void,
  ): void;
  (command: 'set', params: Record<string, unknown>): void;
  (
    command: 'set',
    fieldName: 'user_data',
    value: Record<string, unknown>,
  ): void;
  (command: 'set', fieldName: string, value: unknown): void;
  (
    command: 'event',
    eventName: GoogleRecommendedEventName | string,
    params?: GoogleEventProperties,
  ): void;
  (
    command: 'consent',
    consentArg: GoogleConsentArg,
    consentParams: GoogleConsentParams,
  ): void;
}
