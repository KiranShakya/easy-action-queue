import {Observable, firstValueFrom} from 'rxjs';

interface QueueItem<T> {
  action: () => T;
  resolve: (result: T) => void;
}
export default class EasyActionQueue<T> {
  private readonly queue: Array<QueueItem<T>> = [];
  private running: number = 0;

  constructor(private readonly concurrency: number = 1) {
    if (concurrency < 1) {
      console.info("Concurrency cannot be less than 1, using 1");
      this.concurrency = 1;
    }
  }

  async enqueue(action: () => T): Promise<T> {
    return new Promise<T>((resolve) => {
      this.queue.push({ action, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.running++;
      const response: unknown = item.action();
      if (response instanceof Promise) {
        response.then(result => this.handleResponse(result, item));
      } else if (response instanceof Observable) {
        firstValueFrom(response).then(result => this.handleResponse(result, item))
      } else {
        this.handleResponse(response as T, item);
      }
    }
  }
  private handleResponse(result: T, item: QueueItem<T>) {
        this.running--;
        item.resolve(result);
        this.processQueue();
  }
}
