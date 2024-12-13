import {Observable, firstValueFrom} from 'rxjs';

interface QueueItem<T> {
  action: () => T;
  resolve: (result: T) => void;
}
export default class EasyActionQueue {
  private readonly queue: Array<QueueItem<unknown>> = [];
  private running: number = 0;

  constructor(private readonly concurrency: number = 1) {
    if (concurrency < 1) {
      console.info("Concurrency cannot be less than 1, using 1");
      this.concurrency = 1;
    }
  }

  /**
  * T is type for final value, R is type of return value from the callback
  * action callback will be enqueued and when it gets triggered, the promise will resolve with the result
  * if the callback returns a string, it will be resolved in promise
  * if it is async operation, the result will be resolved in promise
  */
  async enqueue<T, R>(action: () => R): Promise<T> {
    return new Promise<T>((resolve) => {
      this.queue.push({ action, resolve });
      this.processQueue<T, R>();
    });
  }

  private async processQueue<T, R>(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift() as QueueItem<R>;
      this.running++;
      const response: unknown = item.action() as R;
      if (response instanceof Promise) {
        response.then((result: R) => this.handleResponse<T, R>(result, item));
      } else if (response instanceof Observable) {
        firstValueFrom(response).then((result: R) => this.handleResponse<T, R>(result, item));
      } else {
        this.handleResponse<T, R>(response, item);
      }
    }
  }
  private handleResponse<T, R>(result: R, item: QueueItem<R>) {
    this.running--;
    item.resolve(result);
    this.processQueue<T, R>();
  }
}
