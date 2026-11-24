import { getBrowserWindow, loadScript } from '../../browser/runtime';
import type { AdAdapter, AdConsent, AdsPixelEvent, ImageTagFallback, ResolvedDestination } from '../../core/types';
import { toArray } from '../../shared/one-or-many';
import { BaseAdAdapter } from '../base-adapter';
import { LINKEDIN_DEFAULT_SCRIPT_ID, LINKEDIN_DEFAULT_SCRIPT_SRC, LINKEDIN_PIXEL_COLLECT_URL } from './constants';
import type { LinkedInQueue, LinkedInTrackPayload } from './types';

const numericId = /^[1-9]\d*$/;

const pixelUrl = (partnerId: string, conversion?: LinkedInTrackPayload) => {
  const url = new URL(LINKEDIN_PIXEL_COLLECT_URL);
  url.searchParams.set('pid', partnerId);
  url.searchParams.set('fmt', 'gif');
  if (conversion) {
    url.searchParams.set('conversionId', String(conversion.conversion_id));
    if (conversion.event_id) url.searchParams.set('eventId', conversion.event_id);
  }
  return url.toString();
};

export class LinkedInAdapter extends BaseAdAdapter<never> implements AdAdapter<never> {
  private advertisingAllowed = true;

  private readonly registeredPartnerIds = new Set<string>();

  private queueStub?: LinkedInQueue;

  constructor() {
    super('linkedin');
  }

  init(destinations: readonly ResolvedDestination<never>[], consent?: AdConsent) {
    if (destinations.some(({ id }) => !numericId.test(id))) {
      throw new TypeError('LinkedIn trackingDestinationId must be a numeric Partner ID');
    }
    this.destinations = destinations;
    if (consent) this.advertisingAllowed = consent.advertising;
    this.initializeDestinations();
  }

  setConsent(consent: AdConsent) {
    this.advertisingAllowed = consent.advertising;
    this.initializeDestinations();
  }

  setUserIdentity() {
    // Insight Tag conversion commands do not accept identity fields.
  }

  track(event: AdsPixelEvent) {
    const browser = getBrowserWindow();
    if (!browser || !this.advertisingAllowed || !event.linkedin) return;
    const active = this.activeDestinations;

    for (const item of toArray(event.linkedin)) {
      const id = item?.platformOptions?.conversionId;
      if ((typeof id !== 'number' && typeof id !== 'string') || !numericId.test(String(id))) {
        continue;
      }
      const conversionId = Number(id);
      if (!Number.isSafeInteger(conversionId)) continue;

      const destinations =
        item.trackingDestinationId === undefined
          ? active
          : active.filter(({ id }) => id === item.trackingDestinationId);
      const payload: LinkedInTrackPayload = {
        conversion_id: conversionId,
        ...(typeof item.eventId === 'string' && item.eventId ? { event_id: item.eventId } : {}),
      };

      // Insight Tag identifies the rule by conversion ID. One command is enough
      // even when the shared queue has several Partner IDs.
      const insightDestinations = destinations.filter(({ autoTrackPageView }) => autoTrackPageView);
      if (insightDestinations.length) {
        const { value, currency } = { ...event.properties, ...item.properties };
        const conversionType = item.platformOptions.conversionType;
        const nativePayload = {
          ...payload,
          ...(typeof conversionType === 'string' && conversionType.trim()
            ? { conversion_type: conversionType.trim().toUpperCase() }
            : {}),
          ...(typeof value === 'number' &&
          Number.isFinite(value) &&
          typeof currency === 'string' &&
          /^[A-Z]{3}$/i.test(currency)
            ? { conversion_value: value, conversion_currency: currency.toUpperCase() }
            : {}),
        };
        this.logCall(
          'track',
          [nativePayload],
          insightDestinations.some(({ debug }) => debug),
        );
        browser.lintrk?.('track', nativePayload);
      }

      for (const destination of destinations) {
        if (destination.autoTrackPageView) continue;
        const src = pixelUrl(destination.id, payload);
        this.logCall('image', [src], destination.debug);
        new Image(1, 1).src = src;
      }
    }
  }

  getImageTagFallbacks(destinations: readonly ResolvedDestination<never>[]): ImageTagFallback[] {
    return destinations
      .filter(({ autoTrackPageView, imageTagFallback }) => autoTrackPageView && imageTagFallback)
      .map(({ id }) => ({
        platform: 'linkedin',
        trackingDestinationId: id,
        src: pixelUrl(id),
      }));
  }

  private initializeDestinations() {
    const browser = getBrowserWindow();
    if (!browser) return;

    const insightDestinations = this.advertisingAllowed
      ? this.destinations.filter(({ autoTrackPageView }) => autoTrackPageView)
      : [];
    const activePartnerIds = new Set(insightDestinations.map(({ id }) => id));
    const partnerIds = browser._linkedin_data_partner_ids;
    if (partnerIds && this.registeredPartnerIds.size) {
      browser._linkedin_data_partner_ids = partnerIds.filter((id) => {
        const partnerId = String(id);
        return !this.registeredPartnerIds.has(partnerId) || activePartnerIds.has(partnerId);
      });
    }
    for (const id of this.registeredPartnerIds) {
      if (!activePartnerIds.has(id)) this.registeredPartnerIds.delete(id);
    }

    if (!this.advertisingAllowed) {
      if (this.queueStub?.q) this.queueStub.q.length = 0;
      return;
    }

    if (insightDestinations.length) {
      const activeIds = (browser._linkedin_data_partner_ids ??= []);
      for (const { id } of insightDestinations) {
        if (!activeIds.some((partnerId) => String(partnerId) === id)) {
          activeIds.push(id);
          this.registeredPartnerIds.add(id);
        }
      }

      if (!browser.lintrk) {
        const lintrk: LinkedInQueue = (command, payload) => {
          lintrk.q?.push([command, payload]);
        };
        lintrk.q = [];
        browser.lintrk = lintrk;
        this.queueStub = lintrk;
        this.ownsQueueStub = true;
      }

      if (this.ownsQueueStub && !document.getElementById(LINKEDIN_DEFAULT_SCRIPT_ID)) {
        loadScript({
          id: LINKEDIN_DEFAULT_SCRIPT_ID,
          src: LINKEDIN_DEFAULT_SCRIPT_SRC,
        });
      }
    }

    for (const { id } of this.destinations) {
      this.initializedIds.add(id);
    }
  }
}
