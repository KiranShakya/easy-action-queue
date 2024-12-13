import { filter, interval, Observable, of, switchMap, take, timer } from "rxjs";
import EasyActionQueue from "easy-action-queue";

const queue = new EasyActionQueue(2);
const textarea: HTMLTextAreaElement = document.getElementById(
  "output"
) as HTMLTextAreaElement;
const cancelBtn: HTMLButtonElement = document.getElementById(
  "cancelBtn"
) as HTMLButtonElement;
const addBtn: HTMLButtonElement = document.getElementById(
  "addBtn"
) as HTMLButtonElement;

function output(str: string) {
  textarea.value += str + "\n";
}

function addToQueue() {
  // Immediate Action
  queue
    .enqueue<string, string>(() => "Simple Text Return")
    .then((result) => output(result));

  // Immediate Action
  queue
    .enqueue<void, void>(() => {
      return;
    })
    .then(() => output("Action returned void"));

  // Observable Action which makes the queue wait for 8 seconds
  queue
    .enqueue<number, Observable<number>>(() => {
      return interval(1000).pipe(
        filter((val) => val === 8),
        take(10)
      );
    })
    .then((num) =>
      output(
        `Waited for ${num} seconds to complete this action. During this, only one other concurrent action should have been permitted.`
      )
    );

  // Promise Action which resolves after 1 second
  queue
    .enqueue<string, Promise<string>>(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return "Action 2 Completed";
    })
    .then((result) => output(result));

  // Observable Action which completes and returns string after 3 seconds
  queue
    .enqueue<string, Observable<string>>(() => {
      return timer(3000).pipe(switchMap(() => of("Action 3 Completed")));
    })
    .then((result) => output(result));

  // Promise Action which waits for above action to complete as the concurrency slot is occupided by long actions (8 seconds).
  queue
    .enqueue<string, Promise<string>>(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return "Action 4 Completed";
    })
    .then((result) => output(result));
  // Promise Action
  queue
    .enqueue<string, Promise<string>>(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return "Action 5 Completed";
    })
    .then((result) => output(result));
}
cancelBtn.addEventListener("click", () => {
  queue.clearQueue();
});
addBtn.addEventListener("click", () => {
  addToQueue();
});

queue.idleObs.subscribe((isIdle) => {
  output(isIdle ? "Queue is Idle" : "Queue is not Idle");
});

addToQueue();
