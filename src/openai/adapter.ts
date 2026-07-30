import type { AdAdapter, AdsPixelEvent, AdUser } from '../types';
import {
  BaseAdAdapter,
  getBrowserWindow,
  isBrowser,
  loadScript,
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

  constructor(config?: OpenAIAdapterConfig) {
    super({
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

    if (!browserWindow.oaiq) {
      const queue: OpenAIAdsQueue = function (...args: unknown[]) {
        queue.q.push(args);
      };
      queue.q = [];
      browserWindow.oaiq = queue;
    }

    loadScript({
      id: this.state.getConfig().scriptId || OPENAI_DEFAULT_SCRIPT_ID,
      src: this.state.getConfig().scriptSrc || OPENAI_DEFAULT_SCRIPT_SRC,
    });

    browserWindow.oaiq('init', {
      pixelId: this.state.getConfig().pixelId,
    });

    this.initialized = true;
  }

  identify(user: AdUser) {
    void user;
  }

  track(event: AdsPixelEvent) {
    const browserWindow = getBrowserWindow();

    if (!this.state.isEnabled() || !browserWindow?.oaiq || !event.openai) {
      return;
    }

    if (event.openai.options) {
      browserWindow.oaiq(
        'measure',
        event.openai.eventName,
        event.openai.payload,
        event.openai.options,
      );
      return;
    }

    browserWindow.oaiq('measure', event.openai.eventName, event.openai.payload);
  }
}
