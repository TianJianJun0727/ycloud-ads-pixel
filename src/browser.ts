import type { AdsPixelWindow } from './types';

export const installAdsPixel = (
  adsPixel: AdsPixelWindow,
  globalName = 'adsPixel',
) => {
  if (typeof window === 'undefined') {
    return;
  }

  (window as unknown as Record<string, unknown>)[globalName] = adsPixel;
};
