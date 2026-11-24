import type {
  AdAdapter,
  AdConsent,
  AdsPixelEvent,
  ImageTagFallback,
  ResolvedDestination,
  UserIdentity,
} from '../../core/types';
import { getBrowserWindow, loadScript } from '../../browser/runtime';
import { toArray } from '../../shared/one-or-many';
import { BaseAdAdapter } from '../base-adapter';
import {
  OPENAI_CONTENT_EVENTS,
  OPENAI_CONTENT_ITEM_PROPERTIES,
  OPENAI_CUSTOMER_ACTION_EVENTS,
  OPENAI_DEFAULT_SCRIPT_ID,
  OPENAI_DEFAULT_SCRIPT_SRC,
  OPENAI_PLAN_ENROLLMENT_EVENTS,
} from './constants';
import type {
  OpenAIPlatformOptions,
  OpenAIAdsQueue,
  OpenAIUserData,
} from './types';

const contentEvents = new Set<string>(OPENAI_CONTENT_EVENTS);
const customerEvents = new Set<string>(OPENAI_CUSTOMER_ACTION_EVENTS);
const planEvents = new Set<string>(OPENAI_PLAN_ENROLLMENT_EVENTS);
const sha256 = /^[a-f\d]{64}$/i;
const currencyCode = /^[A-Z]{3}$/;

export class OpenAIAdapter
  extends BaseAdAdapter<OpenAIPlatformOptions>
  implements AdAdapter<OpenAIPlatformOptions>
{
  constructor() {
    super('openai');
  }

  init(
    destinations: readonly ResolvedDestination<OpenAIPlatformOptions>[],
    consent?: AdConsent,
  ) {
    this.destinations = destinations;
    const browserWindow = getBrowserWindow();
    if (!browserWindow) return;
    if (!destinations.length) {
      if (consent) this.setConsent(consent);
      return;
    }

    if (!browserWindow.oaiq) {
      const queue: OpenAIAdsQueue = (...args: unknown[]) => queue.q.push(args);
      queue.q = [];
      browserWindow.oaiq = queue;
      this.ownsQueueStub = true;
    }
    const oaiq = browserWindow.oaiq;
    if (consent) this.applyConsent(oaiq, consent);
    if (
      this.ownsQueueStub &&
      document.getElementById(OPENAI_DEFAULT_SCRIPT_ID)?.dataset
        .adsPixelStatus !== 'loaded'
    ) {
      loadScript({
        id: OPENAI_DEFAULT_SCRIPT_ID,
        src: OPENAI_DEFAULT_SCRIPT_SRC,
      });
    }

    for (const destination of destinations) {
      if (this.initializedIds.has(destination.id)) continue;
      const user = destination.platformOptions?.user;
      const options = {
        pixelId: destination.id,
        ...(destination.debug ? { debug: true } : {}),
        ...(user && this.hasValidHashes(user) ? { user } : {}),
      };
      this.logCall('init', [destination.id], destination.debug);
      oaiq('init', options);
      this.initializedIds.add(destination.id);
      if (destination.autoTrackPageView) {
        const payload = { type: 'contents' } as const;
        this.logCall(
          'measureSingle',
          [destination.id, 'page_viewed', payload],
          destination.debug,
        );
        oaiq('measureSingle', destination.id, 'page_viewed', payload);
      }
    }
  }

  setConsent(consent: AdConsent) {
    const oaiq = getBrowserWindow()?.oaiq;
    if (oaiq && this.initializedIds.size) this.applyConsent(oaiq, consent);
  }

  private applyConsent(oaiq: OpenAIAdsQueue, consent: AdConsent) {
    this.logCall('consent', [consent.advertising]);
    oaiq('consent', consent.advertising);
  }

  setUserIdentity(identity: UserIdentity) {
    const oaiq = getBrowserWindow()?.oaiq;
    if (!oaiq) return;
    const user: OpenAIUserData = {
      ...(identity.emailSha256 ? { email_sha256: identity.emailSha256 } : {}),
      ...(identity.externalIdSha256
        ? { external_id_sha256: identity.externalIdSha256 }
        : {}),
      ...(identity.country ? { country: identity.country } : {}),
      ...(identity.city ? { city: identity.city } : {}),
      ...(identity.postalCode ? { zip_code: identity.postalCode } : {}),
    };
    if (!Object.keys(user).length || !this.hasValidHashes(user)) return;

    for (const destination of this.activeDestinations) {
      const options = { pixelId: destination.id, user };
      this.logCall('setUserIdentity', [destination.id], destination.debug);
      oaiq('init', options);
    }
  }

  track(event: AdsPixelEvent) {
    const oaiq = getBrowserWindow()?.oaiq;
    if (!oaiq || !event.openai) return;

    for (const item of toArray(event.openai)) {
      const eventName = item.eventName ?? event.name;
      const properties = { ...event.properties, ...item.properties };
      const type = contentEvents.has(eventName)
        ? 'contents'
        : customerEvents.has(eventName)
          ? 'customer_action'
          : planEvents.has(eventName)
            ? 'plan_enrollment'
            : 'custom';
      const { amount, currency, plan_id: planId, contents } = properties;
      if (!this.isValidAmount(amount, currency)) continue;

      const items =
        type === 'customer_action'
          ? undefined
          : (contents ??
            (type === 'contents' && typeof planId === 'string'
              ? [{ id: planId }]
              : undefined));
      if (
        items !== undefined &&
        (!Array.isArray(items) ||
          items.some(
            (part: Record<string, unknown>) =>
              !part ||
              typeof part !== 'object' ||
              (part.amount !== undefined &&
                !this.isValidAmount(part.amount, part.currency ?? currency)) ||
              (part.quantity !== undefined && !Number.isInteger(part.quantity)),
          ))
      )
        continue;

      const payload = {
        type,
        ...(amount !== undefined ? { amount, currency } : {}),
        ...((type === 'plan_enrollment' || type === 'custom') &&
        typeof planId === 'string'
          ? { plan_id: planId }
          : {}),
        ...(Array.isArray(items)
          ? {
              contents: items.map((part: Record<string, unknown>) =>
                Object.fromEntries(
                  OPENAI_CONTENT_ITEM_PROPERTIES.filter(
                    (key) => part[key] !== undefined,
                  ).map((key) => [key, part[key]]),
                ),
              ),
            }
          : {}),
      };
      const options = {
        ...(type === 'custom' ? { custom_event_name: eventName } : {}),
        ...(item.eventId ? { event_id: item.eventId } : {}),
        ...(item.platformOptions?.optOut !== undefined
          ? { opt_out: item.platformOptions.optOut }
          : {}),
      };
      for (const destination of this.activeDestinations) {
        if (
          item.trackingDestinationId &&
          item.trackingDestinationId !== destination.id
        )
          continue;
        const args = Object.keys(options).length
          ? [payload, options]
          : [payload];
        const commandEventName = type === 'custom' ? 'custom' : eventName;
        this.logCall(
          'measureSingle',
          [destination.id, commandEventName, ...args],
          destination.debug,
        );
        oaiq('measureSingle', destination.id, commandEventName, ...args);
      }
    }
  }

  getImageTagFallbacks(
    destinations: readonly ResolvedDestination<OpenAIPlatformOptions>[],
  ): ImageTagFallback[] {
    return destinations
      .filter(
        ({ autoTrackPageView, imageTagFallback }) =>
          autoTrackPageView && imageTagFallback,
      )
      .map(({ id }) => {
        const url = new URL('https://bzr.openai.com/v1/sdk/events');
        url.search = new URLSearchParams({
          pid: id,
          event: 'page_viewed',
          'data[type]': 'contents',
        }).toString();
        return {
          platform: 'openai',
          trackingDestinationId: id,
          src: url.toString(),
        };
      });
  }

  private hasValidHashes(user: OpenAIUserData) {
    return (
      (!user.email_sha256 || sha256.test(user.email_sha256)) &&
      (!user.external_id_sha256 || sha256.test(user.external_id_sha256))
    );
  }

  private isValidAmount(amount: unknown, currency: unknown) {
    return amount === undefined
      ? currency === undefined
      : Number.isInteger(amount) &&
          typeof currency === 'string' &&
          currencyCode.test(currency);
  }
}
