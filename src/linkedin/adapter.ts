import type { AdAdapter, AdConsent, AdsPixelEvent, AdUser } from '../types';
import {
  BaseAdAdapter,
  getBrowserWindow,
  isBrowser,
  loadScript,
  toArray,
} from '../utils';
import {
  LINKEDIN_DEFAULT_SCRIPT_ID,
  LINKEDIN_DEFAULT_SCRIPT_SRC,
} from './constants';
import type {
  LinkedInAdapterConfig,
  LinkedInQueue,
  LinkedInTrackPayload,
} from './types';

export class LinkedInAdapter
  extends BaseAdAdapter<LinkedInAdapterConfig>
  implements AdAdapter<LinkedInAdapterConfig>
{
  private initialized = false;

  private ownsQueueStub = false;

  private scriptLoadRequested = false;

  constructor(config?: LinkedInAdapterConfig) {
    super('linkedin', {
      scriptId: LINKEDIN_DEFAULT_SCRIPT_ID,
      scriptSrc: LINKEDIN_DEFAULT_SCRIPT_SRC,
      autoLoad: true,
      ...config,
    });
  }

  init(config?: LinkedInAdapterConfig) {
    super.init(config);

    if (!this.state.isEnabled() || !isBrowser()) {
      return;
    }

    const partnerId = this.state.getConfig().partnerId;
    if (partnerId === undefined || partnerId === null || partnerId === '') {
      return;
    }

    const browserWindow = getBrowserWindow();
    if (!browserWindow) {
      return;
    }

    if (this.initialized) {
      this.loadScriptIfNeeded(browserWindow);
      return;
    }

    browserWindow._linkedin_partner_id = partnerId;
    browserWindow._linkedin_data_partner_ids =
      browserWindow._linkedin_data_partner_ids || [];
    if (!browserWindow._linkedin_data_partner_ids.includes(partnerId)) {
      browserWindow._linkedin_data_partner_ids.push(partnerId);
    }

    if (!browserWindow.lintrk) {
      const queue: LinkedInQueue = function (...args: unknown[]) {
        queue.q?.push(args);
      };
      queue.q = [];
      browserWindow.lintrk = queue;
      this.ownsQueueStub = true;
    }

    this.initialized = true;
    this.loadScriptIfNeeded(browserWindow);
  }

  private loadScriptIfNeeded(browserWindow: ReturnType<typeof getBrowserWindow>) {
    if (
      !browserWindow ||
      this.state.getConfig().autoLoad === false ||
      !this.ownsQueueStub ||
      this.scriptLoadRequested
    ) {
      return;
    }

    this.scriptLoadRequested = true;
    loadScript({
      id: this.state.getConfig().scriptId || LINKEDIN_DEFAULT_SCRIPT_ID,
      src: this.state.getConfig().scriptSrc || LINKEDIN_DEFAULT_SCRIPT_SRC,
      onError: () => {
        this.initialized = false;
        this.scriptLoadRequested = false;
      },
    });
  }

  setConsent(consent: AdConsent) {
    void consent;
  }

  identify(user: AdUser) {
    void user;
  }

  track(event: AdsPixelEvent) {
    const browserWindow = getBrowserWindow();

    if (
      !this.state.isEnabled() ||
      !this.initialized ||
      !browserWindow?.lintrk ||
      !event.linkedin
    ) {
      return;
    }

    const lintrk = browserWindow.lintrk;
    toArray(event.linkedin).forEach((linkedinEvent) => {
      if (!linkedinEvent) {
        return;
      }

      const conversionId =
        linkedinEvent.conversionId ?? linkedinEvent.conversion_id;
      if (
        conversionId === undefined ||
        conversionId === null ||
        conversionId === ''
      ) {
        return;
      }

      const eventId = linkedinEvent.eventId ?? linkedinEvent.event_id;
      const payload: LinkedInTrackPayload = {
        conversion_id: conversionId,
        ...(eventId ? { event_id: eventId } : {}),
      };

      this.logCall('track', [payload]);
      lintrk('track', payload);
    });
  }
}
