import type { MetaStandardEventName } from './types';

export const META_DEFAULT_SCRIPT_ID = 'meta-ads-pixel-sdk';

export const META_DEFAULT_SCRIPT_SRC =
  'https://connect.facebook.net/en_US/fbevents.js';

export const META_STANDARD_EVENTS = [
  'AddPaymentInfo',
  'AddToCart',
  'AddToWishlist',
  'CompleteRegistration',
  'Contact',
  'CustomizeProduct',
  'Donate',
  'FindLocation',
  'InitiateCheckout',
  'Lead',
  'PageView',
  'Purchase',
  'Schedule',
  'Search',
  'StartTrial',
  'SubmitApplication',
  'Subscribe',
  'ViewContent',
] as const satisfies readonly MetaStandardEventName[];

export const META_STANDARD_EVENT_PROPERTIES = [
  'content_category',
  'content_ids',
  'content_name',
  'content_type',
  'contents',
  'currency',
  'num_items',
  'predicted_ltv',
  'search_string',
  'status',
  'value',
] as const;

export const META_CONTENT_PROPERTIES = [
  'id',
  'quantity',
  'item_price',
] as const;
