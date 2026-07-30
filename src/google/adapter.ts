import type { AdAdapter, AdsPixelEvent, AdUser } from '../types';
import {
  BaseAdAdapter,
  getBrowserWindow,
  isBrowser,
  loadScript,
  mergeProperties,
} from '../utils';
import { GOOGLE_DEFAULT_SCRIPT_ID } from './constants';
import type { GoogleAdapterConfig } from './types';

export class GoogleAdapter
  extends BaseAdAdapter<GoogleAdapterConfig>
  implements AdAdapter<GoogleAdapterConfig>
{
  private initialized = false;

  constructor(config?: GoogleAdapterConfig) {
    super({
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

    browserWindow.dataLayer = browserWindow.dataLayer || [];
    browserWindow.gtag =
      browserWindow.gtag ||
      function gtag(...args: unknown[]) {
        browserWindow.dataLayer?.push(args);
      };

    loadScript({
      id: this.state.getConfig().scriptId || GOOGLE_DEFAULT_SCRIPT_ID,
      src:
        this.state.getConfig().scriptSrc ||
        `https://www.googletagmanager.com/gtag/js?id=${primaryMeasurementId}`,
    });

    const gtag = browserWindow.gtag;

    gtag('js', new Date());
    measurementIds.forEach((measurementId) => {
      gtag('config', measurementId);
    });

    this.initialized = true;
  }

  identify(user: AdUser) {
    const browserWindow = getBrowserWindow();

    if (
      !this.state.isEnabled() ||
      !browserWindow?.gtag ||
      !Object.keys(user).length
    ) {
      return;
    }

    browserWindow.gtag('set', 'user_data', user);
  }

  track(event: AdsPixelEvent) {
    const browserWindow = getBrowserWindow();

    if (!this.state.isEnabled() || !browserWindow?.gtag || !event.google) {
      return;
    }

    const gtag = browserWindow.gtag;
    const eventProperties = mergeProperties(
      this.state.getDefaultProperties(),
      event.properties,
      event.google.properties,
    );

    gtag('event', event.google.eventName || event.name, eventProperties);
  }
}
