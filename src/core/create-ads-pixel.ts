import { GoogleAdapter } from '../platforms/google';
import { LinkedInAdapter } from '../platforms/linkedin';
import { MetaAdapter } from '../platforms/meta';
import { OpenAIAdapter } from '../platforms/openai';
import { AdsPixel } from './ads-pixel';
import type { AdsPixelConfig } from './types';

export const createAdsPixel = (config: AdsPixelConfig = {}) =>
  new AdsPixel(
    {
      google: new GoogleAdapter(),
      meta: new MetaAdapter(),
      openai: new OpenAIAdapter(),
      linkedin: new LinkedInAdapter(),
    },
    config,
  );

export const adsPixel = createAdsPixel();
