import type { PlatformEvent } from '../../core/types';

export type LinkedInEventPlatformOptions = {
  conversionId: number | string;
  conversionType?: string;
};

type LinkedInEventProperties = Record<string, unknown> & {
  value?: number;
  currency?: string;
};

export type LinkedInPlatformEvent = PlatformEvent<LinkedInEventPlatformOptions, LinkedInEventProperties> & {
  platformOptions: LinkedInEventPlatformOptions;
};

export type LinkedInTrackPayload = {
  conversion_id: number;
  event_id?: string;
  conversion_type?: string;
  conversion_currency?: string;
  conversion_value?: number;
};

export interface LinkedInQueue {
  (command: 'track', payload: LinkedInTrackPayload): void;
  q?: ['track', LinkedInTrackPayload][];
}
