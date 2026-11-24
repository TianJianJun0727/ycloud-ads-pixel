import type { META_STANDARD_EVENTS } from './constants';

export type MetaAdvancedMatching = Record<string, string>;

export type MetaContent = {
  id: string;
  quantity: number;
  item_price?: number;
};

export type MetaEventProperties = Record<string, unknown> & {
  content_category?: string;
  content_ids?: readonly (string | number)[];
  content_name?: string;
  content_type?: 'product' | 'product_group';
  contents?: readonly MetaContent[];
  currency?: string;
  num_items?: number;
  predicted_ltv?: number;
  search_string?: string;
  status?: boolean;
  value?: number;
};

export type MetaStandardEventName = (typeof META_STANDARD_EVENTS)[number];

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

export type MetaEventOptions = MetaStandardEventOptions | MetaCustomEventOptions;

export interface MetaPixelQueue {
  (method: 'init', pixelId: string, advancedMatching?: Record<string, unknown>): void;
  (
    method: 'track' | 'trackCustom',
    eventName: string,
    params?: Record<string, unknown>,
    options?: { eventID?: string },
  ): void;
  (
    method: 'trackSingle' | 'trackSingleCustom',
    pixelId: string,
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

export type MetaPlatformOptions = { advancedMatching?: Record<string, string> };
