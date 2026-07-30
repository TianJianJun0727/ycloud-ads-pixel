import type { AdAdapterConfig } from './types';
import type { AdsPixelBrowserWindow } from './types';

export class AdapterState<Config extends AdAdapterConfig> {
  private config: Config &
    Required<Pick<AdAdapterConfig, 'enabled' | 'defaultProperties'>>;

  constructor(initialConfig?: Config) {
    this.config = {
      enabled: true,
      defaultProperties: {},
      ...(initialConfig || {}),
    } as Config &
      Required<Pick<AdAdapterConfig, 'enabled' | 'defaultProperties'>>;
  }

  init(config?: Config) {
    this.config = {
      ...this.config,
      ...(config || {}),
    };
  }

  isEnabled() {
    return this.config.enabled;
  }

  getDefaultProperties() {
    return this.config.defaultProperties;
  }

  getConfig() {
    return this.config;
  }
}

export abstract class BaseAdAdapter<Config extends AdAdapterConfig> {
  protected state: AdapterState<Config>;

  constructor(initialConfig?: Config) {
    this.state = new AdapterState(initialConfig);
  }

  init(config?: Config) {
    this.state.init(config);
  }
}

export const isBrowser = () =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

export const getBrowserWindow = () =>
  isBrowser() ? (window as AdsPixelBrowserWindow) : undefined;

export const loadScript = ({ id, src }: { id: string; src: string }) => {
  if (!isBrowser() || document.getElementById(id)) {
    return;
  }

  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;

  const firstScript = document.getElementsByTagName('script')[0];
  firstScript.parentNode?.insertBefore(script, firstScript);
};

export const mergeProperties = (
  defaultProperties: Record<string, unknown>,
  eventProperties: Record<string, unknown> | undefined,
  platformProperties: Record<string, unknown> | undefined,
) => ({
  ...defaultProperties,
  ...(eventProperties || {}),
  ...(platformProperties || {}),
});
