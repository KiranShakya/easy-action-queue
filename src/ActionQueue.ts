import {
  BehaviorSubject,
  Observable,
  distinctUntilChanged,
  firstValueFrom,
} from "rxjs";

interface QueueItem<T> {
  action: () => T | Promise<T> | Observable<T>;
  resolve: (result: T) => void;
  reject: (reason: any) => void;
  cleared?: boolean;
}
export default class EasyActionQueue {
  private readonly queue: Array<QueueItem<any>> = [];
  private readonly runningActions = new Set<QueueItem<any>>();
  private readonly idleSub = new BehaviorSubject<boolean>(false);
  private paused = false;

  constructor(public concurrency: number = 1) {
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      console.warn("Concurrency must be a positive integer, using 1");
      this.concurrency = 1;
    }
  }

  // If we want idle state observable
  get idleObs() {
    return this.idleSub.asObservable().pipe(distinctUntilChanged());
  }

  // Method to get the current queue size
  getQueueSize(): number {
    return this.queue.length;
  }

  // Method to update the concurrency during runtime
  updateConcurrency(newConcurrency: number) {
    if (!Number.isInteger(newConcurrency) || newConcurrency < 1) {
      throw new Error("Concurrency must be a positive integer");
    }
    this.concurrency = newConcurrency;
    this.processQueue();
  }

  // Method to pause the queue
  pause() {
    this.paused = true;
  }

  // Method to resume the queue
  resume() {
    if (this.paused) {
      this.paused = false;
      this.processQueue();
    }
  }

  /**
   * T is type for final value, R is type of return value from the callback
   * action callback will be enqueued and when it gets triggered, the promise will resolve with the result
   * if the callback returns a string, it will be resolved in promise
   * if it is async operation, the result will be resolved in promise
   */
  async enqueue<T, R>(
    action: () => T | Promise<T> | Observable<T>
  ): Promise<T> {
    this.idleSub.next(false);

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ action, resolve, reject });
      this.processQueue<T, R>();
    });
  }

  clearQueue() {
    const rejectAndResolve = (item: QueueItem<any>) => {
      item.cleared = true;
      item.reject("EasyActionQueue has been cleared!");
    };

    this.runningActions.forEach(rejectAndResolve);
    this.runningActions.clear();

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        rejectAndResolve(item);
      }
    }
    this.idleSub.next(true);
  }

  private async processQueue<T, R>(): Promise<void> {
    if (this.paused) return;

    while (
      this.runningActions.size < this.concurrency &&
      this.queue.length > 0
    ) {
      const item = this.queue.shift() as QueueItem<R>;
      this.runningActions.add(item);
      try {
        const response = item.action();
        if (response instanceof Promise) {
          response
            .then((result: R) => this.handleResponse<T, R>(result, item))
            .catch((error: unknown) =>
              this.handleRejection<T, R>(error || "Unknown error", item)
            );
        } else if (response instanceof Observable) {
          firstValueFrom(response)
            .then((result: R) => this.handleResponse<T, R>(result, item))
            .catch((error: unknown) =>
              this.handleRejection<T, R>(error || "Unknown error", item)
            );
        } else {
          this.handleResponse<T, R>(response as R, item);
        }
      } catch (error: unknown) {
        this.handleRejection<T, R>(error || "Unknown error", item);
      }
    }
  }

  private async handleResponse<T, R>(result: R, item: QueueItem<R>) {
    this.handleCompletion<T, R>(item, result);
  }

  private async handleRejection<T, R>(error: any, item: QueueItem<R>) {
    this.handleCompletion<T, R>(item, undefined, error);
  }

  private async handleCompletion<T, R>(
    item: QueueItem<R>,
    result?: R,
    error?: any
  ) {
    this.runningActions.delete(item);
    if (item.cleared) return;
    if (error) {
      item.reject(error);
    } else {
      item.resolve(result as R);
    }
    const lastIdleState = await firstValueFrom(this.idleObs);
    if (
      this.runningActions.size === 0 &&
      this.queue.length === 0 &&
      !lastIdleState
    ) {
      this.idleSub.next(true);
    }
    this.processQueue<T, R>();
  }
}
