import type { AdAdapterConfig } from '../types';

export type LinkedInAdapterConfig = AdAdapterConfig & {
  partnerId?: string | number;
  scriptId?: string;
  scriptSrc?: string;
  autoLoad?: boolean;
};

export type LinkedInEventOptions = {
  conversionId?: string | number;
  eventId?: string;
  conversion_id?: string | number;
  event_id?: string;
};

export type LinkedInTrackPayload = {
  conversion_id: string | number;
  event_id?: string;
};

export interface LinkedInQueue {
  (...args: unknown[]): void;
  (command: 'track', payload: LinkedInTrackPayload): void;
  q?: unknown[][];
}
