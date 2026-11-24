import type {
  AdsPixelBrowserWindow,
  OneOrMany,
  ResolvedDestination,
} from './types';

export abstract class BaseAdAdapter<Options> {
  protected destinations: readonly ResolvedDestination<Options>[] = [];

  protected readonly initializedIds = new Set<string>();

  protected ownsQueueStub = false;

  constructor(private readonly platform: string) {}

  protected get activeDestinations() {
    return this.destinations.filter(({ id }) => this.initializedIds.has(id));
  }

  protected logCall(
    command: string,
    args: unknown[],
    debug = this.destinations.some((target) => target.debug),
  ) {
    if (debug) {
      console.debug('[adsPixel]', this.platform, command, ...args);
    }
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

export const toArray = <T>(value: OneOrMany<T>): readonly T[] =>
  Array.isArray(value) ? value : [value as T];
