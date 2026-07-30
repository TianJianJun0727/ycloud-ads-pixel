import type { AdAdapter, AdsPixelEvent, AdUser } from '../types';
import {
  BaseAdAdapter,
  getBrowserWindow,
  isBrowser,
  loadScript,
  mergeProperties,
} from '../utils';
import { META_DEFAULT_SCRIPT_ID, META_DEFAULT_SCRIPT_SRC } from './constants';
import type { MetaAdapterConfig, MetaPixelQueue } from './types';

export class MetaAdapter
  extends BaseAdAdapter<MetaAdapterConfig>
  implements AdAdapter<MetaAdapterConfig>
{
  private initialized = false;

  constructor(config?: MetaAdapterConfig) {
    super({
      scriptId: META_DEFAULT_SCRIPT_ID,
      scriptSrc: META_DEFAULT_SCRIPT_SRC,
      trackPageView: true,
      ...config,
    });
  }

  init(config?: MetaAdapterConfig) {
    super.init(config);

    if (this.initialized || !this.state.isEnabled() || !isBrowser()) {
      return;
    }

    if (!this.state.getConfig().pixelIds?.length) {
      return;
    }

    const browserWindow = getBrowserWindow();

    if (!browserWindow) {
      return;
    }

    if (!browserWindow.fbq) {
      const fbq: MetaPixelQueue = function (...args: unknown[]) {
        if (fbq.callMethod) {
          fbq.callMethod(...args);
          return;
        }

        fbq.queue?.push(args);
      };
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      browserWindow.fbq = fbq;
      browserWindow._fbq = fbq;
    }

    loadScript({
      id: this.state.getConfig().scriptId || META_DEFAULT_SCRIPT_ID,
      src: this.state.getConfig().scriptSrc || META_DEFAULT_SCRIPT_SRC,
    });

    this.state.getConfig().pixelIds?.forEach((pixelId) => {
      browserWindow.fbq?.('init', pixelId);
    });

    if (this.state.getConfig().trackPageView) {
      browserWindow.fbq?.('track', 'PageView');
    }

    this.initialized = true;
  }

  identify(user: AdUser) {
    const browserWindow = getBrowserWindow();

    if (
      !this.state.isEnabled() ||
      !browserWindow?.fbq ||
      !Object.keys(user).length
    ) {
      return;
    }

    this.state.getConfig().pixelIds?.forEach((pixelId) => {
      browserWindow.fbq?.('init', pixelId, user);
    });
  }

  track(event: AdsPixelEvent) {
    const browserWindow = getBrowserWindow();

    if (!this.state.isEnabled() || !browserWindow?.fbq || !event.meta) {
      return;
    }

    const properties = mergeProperties(
      this.state.getDefaultProperties(),
      event.properties,
      event.meta.properties,
    );

    if (event.meta.eventId) {
      browserWindow.fbq(event.meta.method, event.meta.eventName, properties, {
        eventID: event.meta.eventId,
      });
      return;
    }

    browserWindow.fbq(event.meta.method, event.meta.eventName, properties);
  }
}
