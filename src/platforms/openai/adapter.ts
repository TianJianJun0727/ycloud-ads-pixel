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
import type { OpenAIPlatformOptions, OpenAIAdsQueue, OpenAIUserData } from './types';

const contentEvents = new Set<string>(OPENAI_CONTENT_EVENTS);
const customerEvents = new Set<string>(OPENAI_CUSTOMER_ACTION_EVENTS);
const planEvents = new Set<string>(OPENAI_PLAN_ENROLLMENT_EVENTS);
const sha256 = /^[a-f\d]{64}$/i;
const currencyCode = /^[A-Z]{3}$/;

const customEventName = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const reservedEventNames = new Set(['app_installed', 'app_opened', 'custom']);
const userHashFields = [
  'email_sha256',
  'phone_number_sha256',
  'external_id_sha256',
  'first_name_sha256',
  'last_name_sha256',
] as const;

const normalizeUser = (user: OpenAIUserData | undefined): OpenAIUserData | undefined => {
  if (
    !user ||
    userHashFields.some((key) => {
      const value = user[key];
      return value !== undefined && (typeof value !== 'string' || !sha256.test(value));
    })
  )
    return;

  const hashes = userHashFields.flatMap((key) => {
    const value = user[key];
    return value === undefined ? [] : [[key, value]];
  });
  const country = typeof user.country === 'string' ? user.country.trim().toUpperCase() : '';
  const city = typeof user.city === 'string' ? user.city.trim() : '';
  const region = typeof user.region === 'string' ? user.region.trim() : '';
  const postalCode = typeof user.postal_code === 'string' ? user.postal_code.trim() : '';
  const normalized = {
    ...Object.fromEntries(hashes),
    ...(/^[A-Z]{2}$/.test(country) ? { country } : {}),
    ...(city && city.length <= 128 ? { city } : {}),
    ...(region && region.length <= 128 ? { region } : {}),
    ...(/^[a-z\d -]{1,32}$/i.test(postalCode) ? { postal_code: postalCode } : {}),
  };
  return Object.keys(normalized).length ? normalized : undefined;
};

export class OpenAIAdapter extends BaseAdAdapter<OpenAIPlatformOptions> implements AdAdapter<OpenAIPlatformOptions> {
  constructor() {
    super('openai');
  }

  init(destinations: readonly ResolvedDestination<OpenAIPlatformOptions>[], consent?: AdConsent) {
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
    if (this.ownsQueueStub && document.getElementById(OPENAI_DEFAULT_SCRIPT_ID)?.dataset.adsPixelStatus !== 'loaded') {
      loadScript({
        id: OPENAI_DEFAULT_SCRIPT_ID,
        src: OPENAI_DEFAULT_SCRIPT_SRC,
      });
    }

    for (const destination of destinations) {
      if (this.initializedIds.has(destination.id)) continue;
      const user = normalizeUser(destination.platformOptions?.user);
      const options = {
        pixelId: destination.id,
        ...(destination.debug ? { debug: true } : {}),
        ...(user ? { user } : {}),
      };
      this.logCall('init', [destination.id], destination.debug);
      oaiq('init', options);
      this.initializedIds.add(destination.id);
      if (destination.autoTrackPageView) {
        const payload = { type: 'contents' } as const;
        this.logCall('measureSingle', [destination.id, 'page_viewed', payload], destination.debug);
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
    const user = normalizeUser({
      email_sha256: identity.emailSha256,
      phone_number_sha256: identity.phoneNumberSha256,
      external_id_sha256: identity.externalIdSha256,
      first_name_sha256: identity.firstNameSha256,
      last_name_sha256: identity.lastNameSha256,
      country: identity.country,
      city: identity.city,
      region: identity.region,
      postal_code: identity.postalCode,
    });
    if (!user) return;

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
      const rawName = item.eventName ?? event.name;
      if (typeof rawName !== 'string') continue;
      const eventName = rawName.toLowerCase();
      if (reservedEventNames.has(eventName)) continue;
      const properties = { ...event.properties, ...item.properties };
      const type = contentEvents.has(eventName)
        ? 'contents'
        : customerEvents.has(eventName)
          ? 'customer_action'
          : planEvents.has(eventName)
            ? 'plan_enrollment'
            : 'custom';
      if (type === 'custom' && !customEventName.test(eventName)) continue;
      const { amount, currency, plan_id: planId, contents } = properties;
      if (!this.isValidAmount(amount, currency)) continue;

      const items =
        type === 'customer_action'
          ? undefined
          : (contents ?? (type === 'contents' && typeof planId === 'string' ? [{ id: planId }] : undefined));
      if (
        items !== undefined &&
        (!Array.isArray(items) ||
          items.some(
            (part: Record<string, unknown>) =>
              !part ||
              typeof part !== 'object' ||
              Array.isArray(part) ||
              !this.isValidAmount(part.amount, part.currency ?? currency) ||
              (part.quantity !== undefined && !Number.isSafeInteger(part.quantity)) ||
              (part.id !== undefined && typeof part.id !== 'string') ||
              (part.name !== undefined && typeof part.name !== 'string') ||
              (part.content_type !== undefined && (typeof part.content_type !== 'string' || !part.content_type.trim())),
          ))
      )
        continue;

      const payload = {
        type,
        ...(amount !== undefined ? { amount } : {}),
        ...(currency !== undefined ? { currency } : {}),
        ...((type === 'plan_enrollment' || type === 'custom') && typeof planId === 'string' ? { plan_id: planId } : {}),
        ...(Array.isArray(items)
          ? {
              contents: items.map((part: Record<string, unknown>) =>
                Object.fromEntries(
                  OPENAI_CONTENT_ITEM_PROPERTIES.filter((key) => part[key] !== undefined).map((key) => [
                    key,
                    part[key],
                  ]),
                ),
              ),
            }
          : {}),
      };
      const options = {
        ...(type === 'custom' ? { custom_event_name: eventName } : {}),
        ...(typeof item.eventId === 'string' && item.eventId ? { event_id: item.eventId } : {}),
        ...(typeof item.platformOptions?.optOut === 'boolean' ? { opt_out: item.platformOptions.optOut } : {}),
      };
      for (const destination of this.activeDestinations) {
        if (item.trackingDestinationId && item.trackingDestinationId !== destination.id) continue;
        const args = Object.keys(options).length ? [payload, options] : [payload];
        const commandEventName = type === 'custom' ? 'custom' : eventName;
        this.logCall('measureSingle', [destination.id, commandEventName, ...args], destination.debug);
        oaiq('measureSingle', destination.id, commandEventName, ...args);
      }
    }
  }

  getImageTagFallbacks(destinations: readonly ResolvedDestination<OpenAIPlatformOptions>[]): ImageTagFallback[] {
    return destinations
      .filter(({ autoTrackPageView, imageTagFallback }) => autoTrackPageView && imageTagFallback)
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

  private isValidAmount(amount: unknown, currency: unknown) {
    const validCurrency = typeof currency === 'string' && currencyCode.test(currency);
    return amount === undefined
      ? currency === undefined || validCurrency
      : Number.isSafeInteger(amount) && validCurrency;
  }
}
