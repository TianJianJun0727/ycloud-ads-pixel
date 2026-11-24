import type { ResolvedDestination } from '../core/types';

export abstract class BaseAdAdapter<Options> {
  protected destinations: readonly ResolvedDestination<Options>[] = [];

  protected readonly initializedIds = new Set<string>();

  protected ownsQueueStub = false;

  constructor(private readonly platform: string) {}

  protected get activeDestinations() {
    return this.destinations.filter(({ id }) => this.initializedIds.has(id));
  }

  protected logCall(command: string, args: unknown[], debug = this.destinations.some((target) => target.debug)) {
    if (debug) {
      console.debug('[adsPixel]', this.platform, command, ...args);
    }
  }
}
