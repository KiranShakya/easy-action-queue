# EasyActionQueue

EasyActionQueue is a simple action queue with concurrency control. It supports synchronous, asynchronous, and observable actions.

![Build Status](https://github.com/KiranShakya/easy-action-queue/actions/workflows/publish.yml/badge.svg)

## Installation

```bash
npm install easy-action-queue
```

## Usage

### Basic Usage

```typescript
import EasyActionQueue from "easy-action-queue";
import { of } from "rxjs";

const queue = new EasyActionQueue(2);

// Synchronous action
queue.enqueue(() => "result1").then(console.log);

// Asynchronous action
queue.enqueue(() => new Promise((resolve) => setTimeout(() => resolve("result2"), 100))).then(console.log);

// Observable action
queue.enqueue(() => of("result3")).then(console.log);
```

### Pausing and Resuming the Queue

```typescript
const queue = new EasyActionQueue(2);

queue.enqueue(() => 'Task 1').then(result => console.log(result));
queue.enqueue(() => 'Task 2').then(result => console.log(result));

queue.pause();

queue.enqueue(() => 'Task 3').then(result => console.log(result));
queue.enqueue(() => 'Task 4').then(result => console.log(result));

// Resume the queue after 2 seconds
setTimeout(() => {
  queue.resume();
}, 2000);
```

### Updating Concurrency

```typescript
const queue = new EasyActionQueue(2);

queue.enqueue(() => 'Task 1').then(result => console.log(result));
queue.enqueue(() => 'Task 2').then(result => console.log(result));

// Update concurrency to 1
queue.updateConcurrency(1);

queue.enqueue(() => 'Task 3').then(result => console.log(result));
queue.enqueue(() => 'Task 4').then(result => console.log(result));
```

## API

### `constructor(concurrency: number = 1)`

Creates a new EasyActionQueue with the specified concurrency limit.

### `enqueue<T>(action: () => T | Promise<T> | Observable<T>): Promise<T>`

Enqueues an action to be processed by the queue. Returns a promise that resolves with the result of the action.

### `clearQueue()`

Clears the queue and rejects all pending actions with the message "EasyActionQueue has been cleared!".

### `getQueueSize(): number`

Returns the current size of the queue.

### `idleObs: Observable<boolean>`

An observable that emits the idle state of the queue. Emits `true` when the queue is idle and `false` when it is processing actions.

### `pause()`

Pauses the queue. No new actions will be processed until the queue is resumed.

### `resume()`

Resumes the queue. Actions will start being processed again.

### `updateConcurrency(concurrency: number)`

Updates the concurrency limit of the queue.

## Error Handling

EasyActionQueue properly handles errors and rejections. If an action throws an error or returns a rejected promise, the promise returned by `enqueue` will be rejected with the error.

Example:

```typescript
const queue = new EasyActionQueue(2);

queue.enqueue(() => {
  throw new Error("Action Error");
}).catch(console.error); // Logs "Action Error"

queue.enqueue(() => Promise.reject("Promise Rejection")).catch(console.error); // Logs "Promise Rejection"
```

## Testing

The project includes a comprehensive test suite to ensure the correctness of the EasyActionQueue implementation. The tests cover various scenarios, including synchronous actions, asynchronous actions, observable actions, mixed actions, concurrency limits, queue clearing, idle state, zero concurrency, and error handling.

To run the tests, use the following command:

```bash
npm test
```

Example test cases:

```typescript
import { of, Observable } from "rxjs";
import EasyActionQueue from "./ActionQueue";

describe("EasyActionQueue", () => {
  let queue: EasyActionQueue;

  beforeEach(() => {
    queue = new EasyActionQueue(2);
  });

  it("should process synchronous actions correctly", async () => {
    const action1 = jest.fn(() => "result1");
    const action2 = jest.fn(() => "result2");

    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);

    await expect(result1).resolves.toBe("result1");
    await expect(result2).resolves.toBe("result2");

    expect(action1).toHaveBeenCalled();
    expect(action2).toHaveBeenCalled();
  });

  it("should process asynchronous actions correctly", async () => {
    const action1 = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("result1"), 100))
    );
    const action2 = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("result2"), 200))
    );

    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);

    await expect(result1).resolves.toBe("result1");
    await expect(result2).resolves.toBe("result2");

    expect(action1).toHaveBeenCalled();
    expect(action2).toHaveBeenCalled();
  });

  it("should process observable actions correctly", async () => {
    const action1 = jest.fn(() => of("result1"));
    const action2 = jest.fn(() => of("result2"));

    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);

    await expect(result1).resolves.toBe("result1");
    await expect(result2).resolves.toBe("result2");

    expect(action1).toHaveBeenCalled();
    expect(action2).toHaveBeenCalled();
  });

  it("should handle mixed actions correctly", async () => {
    const action1 = jest.fn(() => "result1");
    const action2 = jest.fn(() => new Promise((resolve) => resolve("result2")));
    const action3 = jest.fn(() => of("result3"));

    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);
    const result3 = queue.enqueue(action3);

    await expect(result1).resolves.toBe("result1");
    await expect(result2).resolves.toBe("result2");
    await expect(result3).resolves.toBe("result3");

    expect(action1).toHaveBeenCalled();
    expect(action2).toHaveBeenCalled();
    expect(action3).toHaveBeenCalled();
  });

  it("should respect concurrency limit", async () => {
    const action1 = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("result1"), 200))
    );
    const action2 = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("result2"), 100))
    );
    const action3 = jest.fn(() => "result3");

    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);
    const result3 = queue.enqueue(action3);

    // Ensure the third action starts only after one of the first two completes
    setTimeout(() => {
      expect(action3).not.toHaveBeenCalled();
    }, 50);

    await expect(result1).resolves.toBe("result1");
    await expect(result2).resolves.toBe("result2");
    await expect(result3).resolves.toBe("result3");

    expect(action1).toHaveBeenCalled();
    expect(action2).toHaveBeenCalled();
    expect(action3).toHaveBeenCalled();
  });

  it("should handle clearing the queue", async () => {
    const action1 = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("result1"), 200))
    );
    const action2 = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("result2"), 300))
    );
    const action3 = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("result3"), 300))
    );
    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);
    const result3 = queue.enqueue(action3);
    setTimeout(() => {
      queue.clearQueue();
    }, 100);
    await expect(result1).rejects.toBe("EasyActionQueue has been cleared!");
    await expect(result2).rejects.toBe("EasyActionQueue has been cleared!");
    await expect(result3).rejects.toBe("EasyActionQueue has been cleared!");
  });

  it("should emit idle state correctly", async () => {
    const action1 = jest.fn(
      () => new Promise((resolve) => setTimeout(() => resolve("result1"), 100))
    );
    const action2 = jest.fn(() => "result2");

    const idleSpy = jest.fn();
    queue.idleObs.subscribe(idleSpy);

    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);

    await expect(result1).resolves.toBe("result1");
    await expect(result2).resolves.toBe("result2");

    expect(idleSpy).toHaveBeenLastCalledWith(true);
  });

  it("should handle zero concurrency gracefully", () => {
    const zeroConcurrencyQueue = new EasyActionQueue(0);
    expect(zeroConcurrencyQueue.concurrency).toBe(1);
  });

  it("should log a message when concurrency is set to less than 1", () => {
    const consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const queue = new EasyActionQueue(0);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Concurrency must be a positive integer, using 1"
    );
    consoleSpy.mockRestore();
  });

  it("should reject actions that throw an error", async () => {
    const action1 = jest.fn(() => {
      throw new Error("Action 1 Error");
    });
    const action2 = jest.fn(() => Promise.reject("Action 2 Error"));

    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);

    await expect(result1).rejects.toThrow("Action 1 Error");
    await expect(result2).rejects.toBe("Action 2 Error");

    expect(action1).toHaveBeenCalled();
    expect(action2).toHaveBeenCalled();
  });

  it("should reject observable actions that emit an error", async () => {
    const action1 = jest.fn(() => {
      return new Observable((subscriber) => {
        subscriber.error("Action 1 Observable Error");
      });
    });

    const result1 = queue.enqueue(action1);

    await expect(result1).rejects.toBe("Action 1 Observable Error");

    expect(action1).toHaveBeenCalled();
  });

  it("should not block pending actions if one of the former actions failed or rejected", async () => {
    const action1 = jest.fn(() => {
      throw new Error("Action 1 Error");
    });
    const action2 = jest.fn(() => "result2");
    const action3 = jest.fn(() => new Promise((resolve) => resolve("result3")));

    const result1 = queue.enqueue(action1);
    const result2 = queue.enqueue(action2);
    const result3 = queue.enqueue(action3);

    await expect(result1).rejects.toThrow("Action 1 Error");
    await expect(result2).resolves.toBe("result2");
    await expect(result3).resolves.toBe("result3");

    expect(action1).toHaveBeenCalled();
    expect(action2).toHaveBeenCalled();
    expect(action3).toHaveBeenCalled();
  });
});
```
