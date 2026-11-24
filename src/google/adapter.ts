import type {
  AdAdapter,
  AdConsent,
  AdsPixelEvent,
  GooglePlatformOptions,
  ResolvedDestination,
  UserIdentity,
} from '../types';
import { BaseAdAdapter, getBrowserWindow, loadScript, toArray } from '../utils';
import { GOOGLE_DEFAULT_SCRIPT_ID } from './constants';

export class GoogleAdapter
  extends BaseAdAdapter<GooglePlatformOptions>
  implements AdAdapter<GooglePlatformOptions>
{
  private started = false;

  private readonly userData = new Map<string, Record<string, string>>();

  constructor() {
    super('google');
  }

  init(
    destinations: readonly ResolvedDestination<GooglePlatformOptions>[],
    consent?: AdConsent,
  ) {
    this.destinations = destinations;
    const browserWindow = getBrowserWindow();
    const primary = destinations[0];
    if (!browserWindow) return;
    if (!primary) {
      if (consent) this.setConsent(consent);
      return;
    }

    browserWindow.dataLayer ??= [];
    if (!browserWindow.gtag) {
      browserWindow.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params -- gtag.js consumes Arguments objects.
        browserWindow.dataLayer?.push(arguments);
      };
      this.ownsQueueStub = true;
    }
    const gtag = browserWindow.gtag;
    if (consent) {
      const mode = this.started ? 'update' : 'default';
      const values = this.toGoogleConsent(consent);
      this.logCall('consent', [mode, values]);
      gtag('consent', mode, values);
    }
    if (!this.started) {
      const initializedAt = new Date();
      this.logCall('js', [initializedAt]);
      gtag('js', initializedAt);
      this.started = true;
    }

    if (
      this.ownsQueueStub &&
      document.getElementById(GOOGLE_DEFAULT_SCRIPT_ID)?.dataset
        .adsPixelStatus !== 'loaded'
    ) {
      loadScript({
        id: GOOGLE_DEFAULT_SCRIPT_ID,
        src:
          'https://www.googletagmanager.com/gtag/js?id=' +
          encodeURIComponent(primary.id),
      });
    }

    for (const destination of destinations) {
      if (this.initializedIds.has(destination.id)) continue;
      const groups = destination.platformOptions?.groups;
      const config = {
        send_page_view: destination.autoTrackPageView,
        ...(groups === undefined
          ? {}
          : { groups: typeof groups === 'string' ? groups : [...groups] }),
      };
      this.logCall('config', [destination.id, config], destination.debug);
      gtag('config', destination.id, config);
      this.initializedIds.add(destination.id);
    }
  }

  setConsent(consent: AdConsent) {
    const gtag = getBrowserWindow()?.gtag;
    if (!this.started || !gtag) return;

    const values = this.toGoogleConsent(consent);
    this.logCall('consent', ['update', values]);
    gtag('consent', 'update', values);
  }

  setUserIdentity(user: UserIdentity) {
    this.userData.clear();
    const data: Record<string, string> | undefined =
      user.emailSha256 && /^[a-f\d]{64}$/i.test(user.emailSha256)
        ? { sha256_email_address: user.emailSha256 }
        : user.email
          ? { email: user.email }
          : undefined;
    if (!data) return;
    for (const destination of this.activeDestinations) {
      this.userData.set(destination.id, data);
    }
  }

  track(event: AdsPixelEvent) {
    const gtag = getBrowserWindow()?.gtag;
    if (!gtag || !event.google) return;

    for (const item of toArray(event.google)) {
      const options = item.platformOptions;
      const eventName = item.eventName ?? event.name;
      for (const destination of this.activeDestinations) {
        if (
          item.trackingDestinationId &&
          item.trackingDestinationId !== destination.id
        )
          continue;
        if (
          options?.destinationGroup &&
          options.destinationGroup !== 'default'
        ) {
          const groups = destination.platformOptions?.groups;
          if (!groups || !toArray(groups).includes(options.destinationGroup))
            continue;
        }
        const destinationName = options?.conversionLabel
          ? destination.id + '/' + options.conversionLabel
          : destination.id;
        const userData = this.userData.get(destination.id);
        const properties: Record<string, unknown> = {
          ...(item.eventId ? { transaction_id: item.eventId } : {}),
          ...(userData ? { user_data: userData } : {}),
          ...event.properties,
          ...item.properties,
          send_to: destinationName,
        };
        this.logCall(
          'event',
          [
            eventName,
            {
              ...properties,
              ...('user_data' in properties ? { user_data: '[redacted]' } : {}),
            },
          ],
          destination.debug,
        );
        gtag('event', eventName, properties);
      }
    }
  }

  private toGoogleConsent(consent: AdConsent) {
    const advertising = consent.advertising ? 'granted' : 'denied';
    return {
      ad_storage: advertising,
      ad_user_data: advertising,
      ad_personalization: advertising,
      analytics_storage:
        (consent.analytics ?? consent.advertising) ? 'granted' : 'denied',
    } as const;
  }
}
