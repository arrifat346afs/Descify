/**
 * Concurrency-bounded priority task queue for thumbnail generation and metadata extraction.
 */

export interface QueueTask<T> {
  item: T;
  run: () => Promise<void>;
  getPriority?: () => number;
}

export class PriorityTaskQueue<T> {
  private queue: QueueTask<T>[] = [];
  private activeCount = 0;
  private readonly concurrency: number;
  private readonly itemSet = new Set<T>();

  constructor(concurrency = 4) {
    this.concurrency = concurrency;
  }

  add(task: QueueTask<T>) {
    if (this.itemSet.has(task.item)) return;
    this.itemSet.add(task.item);
    this.queue.push(task);
    this.pump();
  }

  private pump() {
    while (this.activeCount < this.concurrency && this.queue.length > 0) {
      if (this.queue.some((t) => t.getPriority !== undefined)) {
        this.queue.sort((a, b) => {
          const prioA = a.getPriority ? a.getPriority() : 0;
          const prioB = b.getPriority ? b.getPriority() : 0;
          return prioB - prioA;
        });
      }

      const task = this.queue.shift();
      if (!task) break;

      this.activeCount++;
      (async () => {
        try {
          await task.run();
        } catch (err) {
          console.warn('Queue task failed:', err);
        } finally {
          this.itemSet.delete(task.item);
          this.activeCount--;
          this.pump();
        }
      })();
    }
  }

  clear() {
    this.queue = [];
    this.itemSet.clear();
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get runningCount(): number {
    return this.activeCount;
  }

  isQueued(item: T): boolean {
    return this.queue.some((t) => t.item === item);
  }
}
