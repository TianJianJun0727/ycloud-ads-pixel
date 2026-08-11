import type { AdAdapterConfig } from '../types';

export type MetaAdapterConfig = AdAdapterConfig & {
  scriptId?: string;
  scriptSrc?: string;
  pixelIds?: readonly string[];
  trackPageView?: boolean;
  advancedMatching?: MetaAdvancedMatching;
};

export type MetaAdvancedMatching = Record<string, string>;

export type MetaContent = {
  id?: string;
  quantity?: number;
  item_price?: number;
};

export type MetaEventProperties = Record<string, unknown> & {
  content_category?: string;
  content_ids?: string[];
  content_name?: string;
  content_type?: 'product' | 'product_group' | string;
  contents?: MetaContent[];
  currency?: string;
  num_items?: number;
  predicted_ltv?: number;
  search_string?: string;
  status?: boolean | string;
  value?: number;
};

export type MetaStandardEventName =
  | 'AddPaymentInfo'
  | 'AddToCart'
  | 'AddToWishlist'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'InitiateCheckout'
  | 'Lead'
  | 'PageView'
  | 'Purchase'
  | 'Schedule'
  | 'Search'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe'
  | 'ViewContent';

export type MetaStandardEventOptions = {
  method: 'track';
  eventName: MetaStandardEventName;
  properties?: MetaEventProperties;
  eventId?: string;
};

export type MetaCustomEventOptions = {
  method: 'trackCustom';
  eventName: string;
  properties?: MetaEventProperties;
  eventId?: string;
};

export type MetaEventOptions =
  MetaStandardEventOptions | MetaCustomEventOptions;

export interface MetaPixelQueue {
  (
    method: 'init',
    pixelId: string,
    advancedMatching?: Record<string, unknown>,
  ): void;
  (
    method: 'track' | 'trackCustom',
    eventName: string,
    params?: Record<string, unknown>,
    options?: { eventID?: string },
  ): void;
  (method: 'consent', command: 'grant' | 'revoke'): void;
  (method: string, eventName: string, params?: Record<string, unknown>): void;
  callMethod?: (...args: unknown[]) => void;
  push?: MetaPixelQueue;
  loaded?: boolean;
  version?: string;
  queue?: unknown[][];
}
