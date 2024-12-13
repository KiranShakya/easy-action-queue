import { BehaviorSubject, Observable, distinctUntilChanged, firstValueFrom } from "rxjs";

interface QueueItem<T> {
  action: () => T;
  resolve: (result: T) => void;
  reject: (reason: string) => void;
}
export default class EasyActionQueue {
  private readonly queue: Array<QueueItem<any>> = [];
  private readonly runningActions = new Set<QueueItem<any>>();

  private readonly idleSub = new BehaviorSubject<boolean>(false);

  constructor(public readonly concurrency: number = 1) {
    if (concurrency < 1) {
      console.info("Concurrency cannot be less than 1, using 1");
      this.concurrency = 1;
    }
  }

  // If we want idle state observable
  get idleObs() {
    return this.idleSub.asObservable().pipe(distinctUntilChanged());
  }

  /**
   * T is type for final value, R is type of return value from the callback
   * action callback will be enqueued and when it gets triggered, the promise will resolve with the result
   * if the callback returns a string, it will be resolved in promise
   * if it is async operation, the result will be resolved in promise
   */
  async enqueue<T, R>(action: () => R): Promise<T> {
      this.idleSub.next(false);

    return new Promise<T>((resolve, reject) => {
      this.queue.push({ action, resolve, reject });
      this.processQueue<T, R>();
    });
  }

  clearQueue() {
    this.runningActions.forEach((runningAction) => {
      runningAction.reject("EasyActionQueue has been cleared!");
      runningAction.resolve = (result) => {
        return;
      };
    });
    this.runningActions.clear();

    while (this.queue.length > 0) {
      const runningAction = this.queue.shift();
      if (!runningAction) {
        return;
      }
      runningAction.reject("EasyActionQueue has been cleared!");
      runningAction.resolve = (result) => {
        return;
      };
    }
    this.idleSub.next(true);
  }

  private async processQueue<T, R>(): Promise<void> {
    while (
      this.runningActions.size < this.concurrency &&
      this.queue.length > 0
    ) {
      const item = this.queue.shift() as QueueItem<R>;
      this.runningActions.add(item);
      const response: R = item.action() as R;
      if (response instanceof Promise) {
        response.then((result: R) => this.handleResponse<T, R>(result, item));
      } else if (response instanceof Observable) {
        firstValueFrom(response).then((result: R) =>
          this.handleResponse<T, R>(result, item)
        );
      } else {
        this.handleResponse<T, R>(response, item);
      }
    }
  }
  private async handleResponse<T, R>(result: R, item: QueueItem<R>) {
    this.runningActions.delete(item);
    item.resolve(result);
    const lastIdleState = await firstValueFrom(this.idleObs);
    if (this.runningActions.size === 0 && this.queue.length === 0 && !lastIdleState) {
      this.idleSub.next(true);
    }
    this.processQueue<T, R>();
  }
}
