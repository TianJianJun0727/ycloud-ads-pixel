import type { AdsPixelConfig, GlobalDefaults, ResolvedDestination, TrackingDestination } from './types';
import { toArray, type OneOrMany } from '../shared/one-or-many';

const resolveDestinations = <Options>(
  input: OneOrMany<TrackingDestination<Options>> | undefined,
  defaults: GlobalDefaults,
  defaultPageView: boolean,
): ResolvedDestination<Options>[] => {
  if (input === undefined) {
    return [];
  }

  const seen = new Set<string>();
  return toArray(input)
    .map((entry) => {
      if (typeof entry?.trackingDestinationId !== 'string' || !entry.trackingDestinationId.trim()) {
        throw new TypeError('Each destination requires a trackingDestinationId');
      }
      const id = entry.trackingDestinationId.trim();
      if (seen.has(id)) {
        throw new TypeError('Duplicate tracking destination: ' + id);
      }
      seen.add(id);

      return {
        id,
        enabled: entry.enabled ?? defaults.enabled ?? true,
        debug: entry.debug ?? defaults.debug ?? false,
        autoTrackPageView: entry.autoTrackPageView ?? defaultPageView,
        imageTagFallback: entry.imageTagFallback ?? true,
        platformOptions: entry.platformOptions,
      };
    })
    .filter(({ enabled }) => enabled);
};

export const preparePlatforms = (config: AdsPixelConfig) => {
  const defaults = config.globalDefaults ?? {};
  return {
    google: resolveDestinations(config.google, defaults, true),
    meta: resolveDestinations(config.meta, defaults, true),
    openai: resolveDestinations(config.openai, defaults, false),
    linkedin: resolveDestinations(config.linkedin, defaults, true),
  };
};
