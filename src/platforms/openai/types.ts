import type { OPENAI_CONTENT_EVENTS, OPENAI_CUSTOMER_ACTION_EVENTS, OPENAI_PLAN_ENROLLMENT_EVENTS } from './constants';

export type OpenAIUserData = {
  email_sha256?: string;
  phone_number_sha256?: string;
  external_id_sha256?: string;
  first_name_sha256?: string;
  last_name_sha256?: string;
  country?: string;
  city?: string;
  region?: string;
  postal_code?: string;
};

type OpenAIAmountPayload =
  | {
      amount?: never;
      currency?: string;
    }
  | {
      amount: number;
      currency: string;
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
  contents?: OpenAIContent[];
} & OpenAIAmountPayload;

export type OpenAICustomerActionPayload = {
  type: 'customer_action';
} & OpenAIAmountPayload;

export type OpenAIPlanEnrollmentPayload = {
  type: 'plan_enrollment';
  plan_id?: string;
  contents?: OpenAIContent[];
} & OpenAIAmountPayload;

export type OpenAICustomPayload = {
  type: 'custom';
  plan_id?: string;
  contents?: OpenAIContent[];
} & OpenAIAmountPayload;

export type OpenAIEventProperties = Record<string, unknown> & {
  amount?: number;
  currency?: string;
  contents?: readonly OpenAIContent[];
  plan_id?: string;
};

export type OpenAIEventOptionsPayload = {
  event_id?: string;
  opt_out?: boolean;
};

export type OpenAIContentEventName = (typeof OPENAI_CONTENT_EVENTS)[number];

export type OpenAICustomerActionEventName = (typeof OPENAI_CUSTOMER_ACTION_EVENTS)[number];

export type OpenAIPlanEnrollmentEventName = (typeof OPENAI_PLAN_ENROLLMENT_EVENTS)[number];

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

export type OpenAIEventOptions = (OpenAIStandardEventOptions | OpenAICustomCommand) & {
  pixelId?: string;
};

export interface OpenAIAdsQueue {
  (...args: unknown[]): void;
  (
    command: 'init',
    config: {
      pixelId?: string;
      debug?: boolean;
      user?: OpenAIUserData;
    },
  ): void;
  (command: 'consent', consent: boolean): void;
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
  (
    command: 'measureSingle',
    pixelId: string,
    eventName: OpenAIStandardEventOptions['eventName'],
    payload: OpenAIStandardEventOptions['payload'],
    options?: OpenAIEventOptionsPayload,
  ): void;
  (
    command: 'measureSingle',
    pixelId: string,
    eventName: 'custom',
    payload: OpenAICustomPayload,
    options: OpenAICustomCommand['options'],
  ): void;
  q: unknown[][];
}

export type OpenAIPlatformOptions = { user?: OpenAIUserData };

export type OpenAIEventPlatformOptions = { optOut?: boolean };
