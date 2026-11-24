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
  META_DEFAULT_SCRIPT_ID,
  META_DEFAULT_SCRIPT_SRC,
  META_STANDARD_EVENTS,
} from './constants';
import type { MetaPlatformOptions, MetaPixelQueue } from './types';

const standardEvents = new Set<string>(META_STANDARD_EVENTS);
const sha256 = /^[a-f\d]{64}$/i;

export class MetaAdapter
  extends BaseAdAdapter<MetaPlatformOptions>
  implements AdAdapter<MetaPlatformOptions>
{
  constructor() {
    super('meta');
  }

  init(
    destinations: readonly ResolvedDestination<MetaPlatformOptions>[],
    consent?: AdConsent,
  ) {
    this.destinations = destinations;
    const browserWindow = getBrowserWindow();
    if (!browserWindow) return;
    if (!destinations.length) {
      if (consent) this.setConsent(consent);
      return;
    }

    if (!browserWindow.fbq) {
      const fbq: MetaPixelQueue = (...args: unknown[]) => {
        if (fbq.callMethod) fbq.callMethod(...args);
        else fbq.queue?.push(args);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      browserWindow.fbq = fbq;
      browserWindow._fbq = fbq;
      this.ownsQueueStub = true;
    }
    if (consent) this.applyConsent(browserWindow.fbq, consent);
    if (
      this.ownsQueueStub &&
      document.getElementById(META_DEFAULT_SCRIPT_ID)?.dataset
        .adsPixelStatus !== 'loaded'
    ) {
      loadScript({ id: META_DEFAULT_SCRIPT_ID, src: META_DEFAULT_SCRIPT_SRC });
    }

    const fbq = browserWindow.fbq;
    for (const destination of destinations) {
      if (this.initializedIds.has(destination.id)) continue;
      const matching = destination.platformOptions?.advancedMatching;
      const args: [string, Record<string, string>?] = matching
        ? [destination.id, matching]
        : [destination.id];
      this.logCall('init', [destination.id], destination.debug);
      fbq('init', ...args);
      this.initializedIds.add(destination.id);
      if (destination.autoTrackPageView) {
        this.logCall(
          'trackSingle',
          [destination.id, 'PageView'],
          destination.debug,
        );
        fbq('trackSingle', destination.id, 'PageView');
      }
    }
  }

  setConsent(consent: AdConsent) {
    const fbq = getBrowserWindow()?.fbq;
    if (fbq && this.initializedIds.size) this.applyConsent(fbq, consent);
  }

  private applyConsent(fbq: MetaPixelQueue, consent: AdConsent) {
    const command = consent.advertising ? 'grant' : 'revoke';
    this.logCall('consent', [command]);
    fbq('consent', command);
  }

  setUserIdentity(user: UserIdentity) {
    const fbq = getBrowserWindow()?.fbq;
    const matching = {
      ...(user.emailSha256 && sha256.test(user.emailSha256)
        ? { em: user.emailSha256 }
        : {}),
      ...(user.externalIdSha256 && sha256.test(user.externalIdSha256)
        ? { external_id: user.externalIdSha256 }
        : {}),
    };
    if (!fbq || !Object.keys(matching).length) return;

    for (const destination of this.activeDestinations) {
      const userData = {
        ...destination.platformOptions?.advancedMatching,
        ...matching,
      };
      this.logCall('setUserIdentity', [destination.id], destination.debug);
      fbq('init', destination.id, userData);
    }
  }

  track(event: AdsPixelEvent) {
    const fbq = getBrowserWindow()?.fbq;
    if (!fbq || !event.meta) return;

    for (const item of toArray(event.meta)) {
      const eventName = item.eventName ?? event.name;
      const method = standardEvents.has(eventName)
        ? 'trackSingle'
        : 'trackSingleCustom';
      const properties = {
        ...(item.eventId ? { event_id: item.eventId } : {}),
        ...event.properties,
        ...item.properties,
      };
      for (const destination of this.activeDestinations) {
        if (
          item.trackingDestinationId &&
          item.trackingDestinationId !== destination.id
        )
          continue;
        const args: [string, string, typeof properties, { eventID: string }?] =
          [destination.id, eventName, properties];
        if (item.eventId) args.push({ eventID: item.eventId });
        this.logCall(method, args, destination.debug);
        fbq(method, ...args);
      }
    }
  }

  getImageTagFallbacks(
    destinations: readonly ResolvedDestination<MetaPlatformOptions>[],
  ): ImageTagFallback[] {
    return destinations
      .filter(
        ({ autoTrackPageView, imageTagFallback }) =>
          autoTrackPageView && imageTagFallback,
      )
      .map(({ id }) => {
        const url = new URL('https://www.facebook.com/tr');
        url.search = new URLSearchParams({
          id,
          ev: 'PageView',
          noscript: '1',
        }).toString();
        return {
          platform: 'meta',
          trackingDestinationId: id,
          src: url.toString(),
        };
      });
  }
}
