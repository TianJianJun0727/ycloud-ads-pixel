import type { AdAdapter, AdConsent, AdsPixelEvent, AdUser } from '../types';
import {
  BaseAdAdapter,
  getBrowserWindow,
  isBrowser,
  loadScript,
  toArray,
} from '../utils';
import {
  OPENAI_DEFAULT_SCRIPT_ID,
  OPENAI_DEFAULT_SCRIPT_SRC,
} from './constants';
import type { OpenAIAdapterConfig, OpenAIAdsQueue } from './types';

export class OpenAIAdapter
  extends BaseAdAdapter<OpenAIAdapterConfig>
  implements AdAdapter<OpenAIAdapterConfig>
{
  private initialized = false;

  private pendingConsent?: AdConsent;

  constructor(config?: OpenAIAdapterConfig) {
    super('openai', {
      scriptId: OPENAI_DEFAULT_SCRIPT_ID,
      scriptSrc: OPENAI_DEFAULT_SCRIPT_SRC,
      ...config,
    });
  }

  init(config?: OpenAIAdapterConfig) {
    super.init(config);

    if (this.initialized || !this.state.isEnabled() || !isBrowser()) {
      return;
    }

    if (!this.state.getConfig().pixelId) {
      return;
    }

    const browserWindow = getBrowserWindow();

    if (!browserWindow) {
      return;
    }

    const shouldLoadScript = !browserWindow.oaiq;

    if (!browserWindow.oaiq) {
      const queue: OpenAIAdsQueue = function (...args: unknown[]) {
        queue.q.push(args);
      };
      queue.q = [];
      browserWindow.oaiq = queue;
    }

    if (shouldLoadScript) {
      loadScript({
        id: this.state.getConfig().scriptId || OPENAI_DEFAULT_SCRIPT_ID,
        src: this.state.getConfig().scriptSrc || OPENAI_DEFAULT_SCRIPT_SRC,
      });
    }

    if (this.pendingConsent) {
      this.logCall('consent', [this.pendingConsent.advertising]);
      browserWindow.oaiq('consent', this.pendingConsent.advertising);
    }

    const initConfig = {
      pixelId: this.state.getConfig().pixelId,
      ...(this.state.getConfig().debug ? { debug: true } : {}),
    };
    this.logCall('init', [initConfig]);
    browserWindow.oaiq('init', initConfig);

    this.initialized = true;
  }

  setConsent(consent: AdConsent) {
    this.pendingConsent = consent;

    const browserWindow = getBrowserWindow();
    if (!this.initialized || !browserWindow?.oaiq) {
      return;
    }

    this.logCall('consent', [consent.advertising]);
    browserWindow.oaiq('consent', consent.advertising);
  }

  identify(user: AdUser) {
    const browserWindow = getBrowserWindow();

    if (
      !this.state.isEnabled() ||
      !this.initialized ||
      !browserWindow?.oaiq ||
      !user.openai ||
      !Object.keys(user.openai).length
    ) {
      return;
    }

    const sha256Pattern = /^[a-f\d]{64}$/;
    if (
      (user.openai.email_sha256 &&
        !sha256Pattern.test(user.openai.email_sha256)) ||
      (user.openai.external_id_sha256 &&
        !sha256Pattern.test(user.openai.external_id_sha256))
    ) {
      return;
    }

    const initConfig = {
      pixelId: this.state.getConfig().pixelId,
      user: user.openai,
    };
    this.logCall('init', [initConfig]);
    browserWindow.oaiq('init', initConfig);
  }

  track(event: AdsPixelEvent) {
    const browserWindow = getBrowserWindow();

    if (
      !this.state.isEnabled() ||
      !this.initialized ||
      !browserWindow?.oaiq ||
      !event.openai
    ) {
      return;
    }

    const oaiq = browserWindow.oaiq;

    toArray(event.openai).forEach((openAIEvent) => {
      const { amount, currency } = openAIEvent.payload;
      if (
        (amount !== undefined && (!Number.isInteger(amount) || !currency)) ||
        (amount === undefined && currency !== undefined)
      ) {
        return;
      }

      if (openAIEvent.options) {
        this.logCall('measure', [
          openAIEvent.eventName,
          openAIEvent.payload,
          openAIEvent.options,
        ]);
        oaiq(
          'measure',
          openAIEvent.eventName,
          openAIEvent.payload,
          openAIEvent.options,
        );
        return;
      }

      this.logCall('measure', [openAIEvent.eventName, openAIEvent.payload]);
      oaiq('measure', openAIEvent.eventName, openAIEvent.payload);
    });
  }
}
