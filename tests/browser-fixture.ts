import type { AdsPixelBrowserWindow } from '../src/browser/runtime';

export const testWindow = () => window as AdsPixelBrowserWindow;

export const googleQueue = () => (testWindow().dataLayer ?? []).map((args) => Array.from(args as IArguments));
export const metaQueue = () => testWindow().fbq?.queue ?? [];
export const openAIQueue = () => testWindow().oaiq?.q ?? [];
export const linkedinQueue = () => testWindow().lintrk?.q ?? [];

export const resetBrowser = () => {
  const browser = testWindow();
  delete browser.adsPixel;
  delete browser.dataLayer;
  delete browser.gtag;
  delete browser.fbq;
  delete browser._fbq;
  delete browser.oaiq;
  delete browser.lintrk;
  delete browser._linkedin_data_partner_ids;
  document.head.querySelectorAll('script').forEach((script) => script.remove());
};
