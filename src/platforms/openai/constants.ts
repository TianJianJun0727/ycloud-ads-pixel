import type {
  OpenAIContentEventName,
  OpenAICustomerActionEventName,
  OpenAIPlanEnrollmentEventName,
} from './types';

export const OPENAI_DEFAULT_SCRIPT_ID = 'openai-ads-pixel-sdk';

export const OPENAI_DEFAULT_SCRIPT_SRC =
  'https://bzrcdn.openai.com/sdk/oaiq.min.js';

export const OPENAI_CONTENT_EVENTS = [
  'checkout_started',
  'contents_viewed',
  'items_added',
  'order_created',
  'page_viewed',
] as const satisfies readonly OpenAIContentEventName[];

export const OPENAI_CUSTOMER_ACTION_EVENTS = [
  'appointment_scheduled',
  'lead_created',
  'registration_completed',
] as const satisfies readonly OpenAICustomerActionEventName[];

export const OPENAI_PLAN_ENROLLMENT_EVENTS = [
  'subscription_created',
  'trial_started',
] as const satisfies readonly OpenAIPlanEnrollmentEventName[];

export const OPENAI_STANDARD_EVENTS = [
  ...OPENAI_CONTENT_EVENTS,
  ...OPENAI_CUSTOMER_ACTION_EVENTS,
  ...OPENAI_PLAN_ENROLLMENT_EVENTS,
] as const;

export const OPENAI_CONTENT_PROPERTIES = [
  'type',
  'amount',
  'currency',
  'contents',
] as const;

export const OPENAI_CONTENT_ITEM_PROPERTIES = [
  'id',
  'name',
  'content_type',
  'quantity',
  'amount',
  'currency',
] as const;

export const OPENAI_CUSTOMER_ACTION_PROPERTIES = [
  'type',
  'amount',
  'currency',
] as const;

export const OPENAI_PLAN_ENROLLMENT_PROPERTIES = [
  'type',
  'plan_id',
  'amount',
  'currency',
  'contents',
] as const;

export const OPENAI_EVENT_OPTION_PROPERTIES = [
  'event_id',
  'custom_event_name',
  'opt_out',
] as const;

export const OPENAI_CUSTOM_PROPERTIES = [
  'type',
  'plan_id',
  'amount',
  'currency',
  'contents',
] as const;
