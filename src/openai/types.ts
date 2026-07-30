import type { AdAdapterConfig } from '../types';

export type OpenAIAdapterConfig = AdAdapterConfig & {
  scriptId?: string;
  scriptSrc?: string;
  pixelId?: string;
};

export type OpenAIContent = {
  id?: string;
  name?: string;
  content_type?: string;
  quantity?: number;
  amount?: number;
  currency?: string;
};

export type OpenAIContentsPayload = {
  type: 'contents';
  amount?: number;
  currency?: string;
  contents?: OpenAIContent[];
};

export type OpenAICustomerActionPayload = {
  type: 'customer_action';
  amount?: number;
  currency?: string;
};

export type OpenAIPlanEnrollmentPayload = {
  type: 'plan_enrollment';
  plan_id?: string;
  amount?: number;
  currency?: string;
  contents?: OpenAIContent[];
};

export type OpenAICustomPayload = {
  type: 'custom';
  plan_id?: string;
  amount?: number;
  currency?: string;
  contents?: OpenAIContent[];
};

export type OpenAIEventOptionsPayload = {
  event_id?: string;
  opt_out?: boolean;
};

export type OpenAIContentEventName =
  | 'checkout_started'
  | 'contents_viewed'
  | 'items_added'
  | 'order_created'
  | 'page_viewed';

export type OpenAICustomerActionEventName =
  'appointment_scheduled' | 'lead_created' | 'registration_completed';

export type OpenAIPlanEnrollmentEventName =
  'subscription_created' | 'trial_started';

type OpenAIContentsCommand = {
  eventName: OpenAIContentEventName;
  payload: OpenAIContentsPayload;
  options?: OpenAIEventOptionsPayload;
};

type OpenAICustomerActionCommand = {
  eventName: OpenAICustomerActionEventName;
  payload: OpenAICustomerActionPayload;
  options?: OpenAIEventOptionsPayload;
};

type OpenAIPlanEnrollmentCommand = {
  eventName: OpenAIPlanEnrollmentEventName;
  payload: OpenAIPlanEnrollmentPayload;
  options?: OpenAIEventOptionsPayload;
};

type OpenAICustomCommand = {
  eventName: 'custom';
  payload: OpenAICustomPayload;
  options: OpenAIEventOptionsPayload & {
    custom_event_name: string;
  };
};

export type OpenAIStandardEventOptions =
  | OpenAIContentsCommand
  | OpenAICustomerActionCommand
  | OpenAIPlanEnrollmentCommand;

export type OpenAIEventOptions =
  OpenAIStandardEventOptions | OpenAICustomCommand;

export interface OpenAIAdsQueue {
  (...args: unknown[]): void;
  (command: 'init', config: { pixelId: string | undefined }): void;
  (
    command: 'measure',
    eventName: OpenAIStandardEventOptions['eventName'],
    payload: OpenAIStandardEventOptions['payload'],
    options?: OpenAIEventOptionsPayload,
  ): void;
  (
    command: 'measure',
    eventName: 'custom',
    payload: OpenAICustomPayload,
    options: OpenAICustomCommand['options'],
  ): void;
  q: unknown[][];
}
