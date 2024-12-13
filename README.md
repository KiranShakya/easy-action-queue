# Easy Action Queue

## Introduction
During their careers, developers often need to manage the execution of actions concurrently. The **Easy Action Queue** class provides a robust solution for queuing actions, giving you control over the number of concurrent actions and the ability to cancel them when needed.

## Getting Started

### Installation
First, install the package using npm:
```bash
npm install easy-action-queue
```

### Usage
Once installed, you can create an instance of the EasyActionQueue:

```javascript
import EasyActionQueue from 'easy-action-queue';

const queue = new EasyActionQueue();
```

### Enqueuing Actions
You can enqueue actions that return strings, promises, or observables. Make sure to import any required functions from RxJS:

```javascript
import { Observable, of, interval, timer } from 'rxjs';
import { filter, take, switchMap } from 'rxjs/operators';

// Immediate Action
queue
  .enqueue<string, string>(() => "Simple Text Return")
  .then((result) => console.log(result));

// Immediate Action
queue
  .enqueue<void, void>(() => {
    return;
  })
  .then(() => console.log("Action returned void"));

// Observable Action which waits for 8 seconds
queue
  .enqueue<number, Observable<number>>(() => {
    return interval(1000).pipe(
      filter((val) => val === 8),
      take(10)
    );
  })
  .then((num) =>
    console.log(`Waited for ${num} seconds to complete this action.`)
  );

// Promise Action which resolves after 1 second
queue
  .enqueue<string, Promise<string>>(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "Action 2 Completed";
  })
  .then((result) => console.log(result));

// Observable Action which completes and returns a string after 3 seconds
queue
  .enqueue<string, Observable<string>>(() => {
    return timer(3000).pipe(switchMap(() => of("Action 3 Completed")));
  })
  .then((result) => console.log(result));

// Promise Action which waits for the previous action to complete
queue
  .enqueue<string, Promise<string>>(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "Action 4 Completed";
  })
  .then((result) => console.log(result));

// Another Promise Action
queue
  .enqueue<string, Promise<string>>(async () => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "Action 5 Completed";
  })
  .then((result) => console.log(result));
```

### Output
The console output will be:
```
Queue is not Idle
Simple Text Return
Action returned void
Action 2 Completed
Action 3 Completed
Action 4 Completed
Action 5 Completed
Queue is Idle
Waited for 8 seconds to complete this action.
```

### Adjusting Concurrency
By default, the concurrency is set to 1, meaning actions will run sequentially. You can change the concurrency during initialization:

```javascript
const queueWith2ConcurrentActions = new EasyActionQueue(2);
```

This will allow two actions to be processed concurrently.

### Canceling The Queued Actions
You can cancel the queued actions any time with the following command:

```javascript
queueWith2ConcurrentActions.clearQueue();
```

All the unexecuted and processing asynchronous actions will be rejected and will never resolve. However, please keep in mind that actions initiated by the callback function call, like fetch(), will still continue in the background. Only the response from such asynchronous actions will be ignored.

### Idle Observable
You can subscribe to the idle observable with the following command:

```javascript
queueWith2ConcurrentActions.idleObs.subscribe((isIdle) => {
  console.log(isIdle ? "Queue is Idle" : "Queue is not Idle");
});
```

This observable can be handy when you want to trigger specific events, such as deleting the queue instance immediately after the queue becomes idle to free up memory.
