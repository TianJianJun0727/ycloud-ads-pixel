import type { AdAdapter, AdConsent, AdsPixelEvent, AdUser } from '../types';
import {
  BaseAdAdapter,
  getBrowserWindow,
  isBrowser,
  loadScript,
  mergeProperties,
  toArray,
} from '../utils';
import { META_DEFAULT_SCRIPT_ID, META_DEFAULT_SCRIPT_SRC } from './constants';
import type { MetaAdapterConfig, MetaPixelQueue } from './types';

export class MetaAdapter
  extends BaseAdAdapter<MetaAdapterConfig>
  implements AdAdapter<MetaAdapterConfig>
{
  private initialized = false;

  private ownsQueueStub = false;

  private initializationQueued = false;

  private pendingConsent?: AdConsent;

  constructor(config?: MetaAdapterConfig) {
    super('meta', {
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

    const shouldLoadScript = !browserWindow.fbq || this.ownsQueueStub;

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
      this.ownsQueueStub = true;
    }

    this.initialized = true;

    if (shouldLoadScript) {
      loadScript({
        id: this.state.getConfig().scriptId || META_DEFAULT_SCRIPT_ID,
        src: this.state.getConfig().scriptSrc || META_DEFAULT_SCRIPT_SRC,
        onError: () => {
          this.initialized = false;
        },
      });
    }

    if (this.initializationQueued) {
      return;
    }

    if (this.pendingConsent) {
      const command = this.pendingConsent.advertising ? 'grant' : 'revoke';
      this.logCall('consent', [command]);
      browserWindow.fbq?.('consent', command);
    }

    this.state.getConfig().pixelIds?.forEach((pixelId) => {
      const advancedMatching = this.state.getConfig().advancedMatching;
      if (advancedMatching) {
        this.logCall('init', [pixelId, advancedMatching]);
        browserWindow.fbq?.('init', pixelId, advancedMatching);
        return;
      }

      this.logCall('init', [pixelId]);
      browserWindow.fbq?.('init', pixelId);
    });

    if (this.state.getConfig().trackPageView) {
      this.logCall('track', ['PageView']);
      browserWindow.fbq?.('track', 'PageView');
    }

    this.initializationQueued = true;
  }

  setConsent(consent: AdConsent) {
    this.pendingConsent = consent;

    const browserWindow = getBrowserWindow();
    if (!this.initialized || !browserWindow?.fbq) {
      return;
    }

    const command = consent.advertising ? 'grant' : 'revoke';
    this.logCall('consent', [command]);
    browserWindow.fbq('consent', command);
  }

  identify(user: AdUser) {
    void user;
  }

  track(event: AdsPixelEvent) {
    const browserWindow = getBrowserWindow();

    if (
      !this.state.isEnabled() ||
      !this.initialized ||
      !browserWindow?.fbq ||
      !event.meta
    ) {
      return;
    }

    const fbq = browserWindow.fbq;

    toArray(event.meta).forEach((metaEvent) => {
      const properties = mergeProperties(
        this.state.getDefaultProperties(),
        event.properties,
        metaEvent.properties,
      );

      if (metaEvent.eventId) {
        const options = {
          eventID: metaEvent.eventId,
        };
        this.logCall(metaEvent.method, [
          metaEvent.eventName,
          properties,
          options,
        ]);
        fbq(metaEvent.method, metaEvent.eventName, properties, options);
        return;
      }

      this.logCall(metaEvent.method, [metaEvent.eventName, properties]);
      fbq(metaEvent.method, metaEvent.eventName, properties);
    });
  }
}
