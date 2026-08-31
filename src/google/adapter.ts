import type { AdAdapter, AdsPixelEvent, AdUser } from '../types';
import {
  BaseAdAdapter,
  getBrowserWindow,
  isBrowser,
  loadScript,
  mergeProperties,
  toArray,
} from '../utils';
import { GOOGLE_DEFAULT_SCRIPT_ID } from './constants';
import type { GoogleAdapterConfig } from './types';

export class GoogleAdapter
  extends BaseAdAdapter<GoogleAdapterConfig>
  implements AdAdapter<GoogleAdapterConfig>
{
  private initialized = false;

  private ownsQueueStub = false;

  private initializationQueued = false;

  constructor(config?: GoogleAdapterConfig) {
    super('google', {
      scriptId: GOOGLE_DEFAULT_SCRIPT_ID,
      ...config,
    });
  }

  init(config?: GoogleAdapterConfig) {
    super.init(config);

    if (this.initialized || !this.state.isEnabled() || !isBrowser()) {
      return;
    }

    const measurementIds = this.state.getConfig().measurementIds || [];
    const primaryMeasurementId = measurementIds[0];

    if (!primaryMeasurementId) {
      return;
    }

    const browserWindow = getBrowserWindow();

    if (!browserWindow) {
      return;
    }

    const shouldLoadScript = !browserWindow.gtag || this.ownsQueueStub;

    browserWindow.dataLayer = browserWindow.dataLayer || [];
    if (!browserWindow.gtag) {
      browserWindow.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params -- gtag.js consumes Arguments objects from dataLayer.
        browserWindow.dataLayer?.push(arguments);
      };
      this.ownsQueueStub = true;
    }

    this.initialized = true;

    if (shouldLoadScript) {
      loadScript({
        id: this.state.getConfig().scriptId || GOOGLE_DEFAULT_SCRIPT_ID,
        src:
          this.state.getConfig().scriptSrc ||
          `https://www.googletagmanager.com/gtag/js?id=${primaryMeasurementId}`,
        onError: () => {
          this.initialized = false;
        },
      });
    }

    if (this.initializationQueued) {
      return;
    }

    const gtag = browserWindow.gtag;

    const initializedAt = new Date();

    this.logCall('js', [initializedAt]);
    gtag('js', initializedAt);
    measurementIds.forEach((measurementId) => {
      this.logCall('config', [measurementId]);
      gtag('config', measurementId);
    });

    this.initializationQueued = true;
  }

  identify(user: AdUser) {
    const browserWindow = getBrowserWindow();

    if (
      !this.state.isEnabled() ||
      !this.initialized ||
      !browserWindow?.gtag ||
      !user.google ||
      !Object.keys(user.google).length
    ) {
      return;
    }

    this.logCall('set', ['user_data', user.google]);
    browserWindow.gtag('set', 'user_data', user.google);
  }

  track(event: AdsPixelEvent) {
    const browserWindow = getBrowserWindow();

    if (
      !this.state.isEnabled() ||
      !this.initialized ||
      !browserWindow?.gtag ||
      !event.google
    ) {
      return;
    }

    const gtag = browserWindow.gtag;
    toArray(event.google).forEach((googleEvent) => {
      const eventProperties = mergeProperties(
        this.state.getDefaultProperties(),
        event.properties,
        googleEvent.properties,
      );

      this.logCall('event', [
        googleEvent.eventName || event.name,
        eventProperties,
      ]);
      gtag('event', googleEvent.eventName || event.name, eventProperties);
    });
  }
}
