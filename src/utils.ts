import type { AdAdapterConfig, AdAdapterDebugCall } from './types';
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
  private platform: string;

  protected state: AdapterState<Config>;

  constructor(platform: string, initialConfig?: Config) {
    this.platform = platform;
    this.state = new AdapterState(initialConfig);
  }

  init(config?: Config) {
    this.state.init(config);
  }

  protected logCall(command: string, args: unknown[]) {
    const config = this.state.getConfig();

    if (!config.debug) {
      return;
    }

    const call: AdAdapterDebugCall = {
      platform: this.platform,
      command,
      args,
    };

    if (config.debugLogger) {
      config.debugLogger(call);
      return;
    }

    console.debug('[adsPixel]', call.platform, call.command, ...call.args);
  }
}

export const isBrowser = () =>
  typeof window !== 'undefined' && typeof document !== 'undefined';

export const getBrowserWindow = () =>
  isBrowser() ? (window as AdsPixelBrowserWindow) : undefined;

export const loadScript = ({
  id,
  src,
  onError,
}: {
  id: string;
  src: string;
  onError?: () => void;
}) => {
  if (!isBrowser()) {
    return;
  }

  const normalizedSrc = new URL(src, document.baseURI);
  const existingScript = Array.from(document.scripts).find((script) => {
    if (script.id === id) {
      return true;
    }

    const existingSrc = new URL(script.src, document.baseURI);
    return (
      existingSrc.origin === normalizedSrc.origin &&
      existingSrc.pathname === normalizedSrc.pathname
    );
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

export const mergeProperties = (
  defaultProperties: Record<string, unknown>,
  eventProperties: Record<string, unknown> | undefined,
  platformProperties: Record<string, unknown> | undefined,
) => ({
  ...defaultProperties,
  ...(eventProperties || {}),
  ...(platformProperties || {}),
});

export const toArray = <T>(value: T | T[]) =>
  Array.isArray(value) ? value : [value];
