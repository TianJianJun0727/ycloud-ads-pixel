import type { AdsPixelWindow } from '../core/types';

export type AdsPixelBrowserWindow = Window & {
  dataLayer?: unknown[];
  gtag?: import('../platforms/google/types').GoogleTagQueue;
  fbq?: import('../platforms/meta/types').MetaPixelQueue;
  _fbq?: import('../platforms/meta/types').MetaPixelQueue;
  oaiq?: import('../platforms/openai/types').OpenAIAdsQueue;
  _linkedin_data_partner_ids?: (string | number)[];
  lintrk?: import('../platforms/linkedin/types').LinkedInQueue;
  adsPixel?: AdsPixelWindow;
};

export const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

export const getBrowserWindow = () => (isBrowser() ? (window as AdsPixelBrowserWindow) : undefined);

export const loadScript = ({ id, src, onError }: { id: string; src: string; onError?: () => void }) => {
  if (!isBrowser()) {
    return;
  }

  const normalizedSrc = new URL(src, document.baseURI);
  const existingScript = Array.from(document.scripts).find((script) => {
    if (script.id === id) {
      return true;
    }

    const existingSrc = new URL(script.src, document.baseURI);
    return existingSrc.origin === normalizedSrc.origin && existingSrc.pathname === normalizedSrc.pathname;
  });

  if (existingScript) {
    existingScript.addEventListener(
      'error',
      () => {
        existingScript.remove();
        onError?.();
      },
      { once: true },
    );
    return;
  }

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  script.dataset.adsPixelStatus = 'loading';
  script.addEventListener(
    'load',
    () => {
      script.dataset.adsPixelStatus = 'loaded';
    },
    { once: true },
  );
  script.addEventListener(
    'error',
    () => {
      script.remove();
      onError?.();
    },
    { once: true },
  );

  const firstScript = document.getElementsByTagName('script')[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
    return;
  }

  document.head.appendChild(script);
};
