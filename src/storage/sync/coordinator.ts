import type { SyncRepository, SyncTransport } from './types';

/** One foreground cycle. Durable state belongs to the repository, never this object. */
export class SyncCoordinator {
  private running: Promise<void> | undefined;
  private stopped = false;
  constructor(private repository: SyncRepository, private transport: SyncTransport) {}

  stop() { this.stopped = true; }
  resume() { this.stopped = false; }

  sync(): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.running) return this.running;
    this.running = this.run().finally(() => { this.running = undefined; });
    return this.running;
  }

  private async run() {
    // Push queued intent against its original revision before pulling remote state.
    for (let count = 0; count < 50 && !this.stopped; count++) {
      const operation = await this.repository.nextOperation(Date.now());
      if (!operation) break;
      try {
        const result = await this.transport.push(operation);
        if (this.stopped) return;
        await this.repository.acknowledge(operation, result);
      } catch (error) {
        if (this.stopped) return;
        const message = error instanceof Error ? error.message : 'Sync failed';
        const delay = Math.min(300_000, 1000 * 2 ** Math.min(operation.attempts, 8)) * (0.75 + Math.random() / 2);
        await this.repository.deferOperation(operation, message, Date.now() + delay);
        // Network/auth errors affect the whole transport; don't spin on other records.
        return;
      }
    }
    for (let count = 0; count < 100 && !this.stopped; count++) {
      const page = await this.transport.pull(await this.repository.getCursor());
      if (this.stopped) return;
      await this.repository.applyChanges(page);
      if (!page.hasMore) {
        await this.repository.markSynced();
        return;
      }
    }
  }
}
