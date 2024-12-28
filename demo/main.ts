import { filter, interval, Observable, of, switchMap, take, timer } from "rxjs";
import EasyActionQueue from "../src/ActionQueue";

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
const pauseBtn: HTMLButtonElement = document.getElementById(
  "pauseBtn"
) as HTMLButtonElement;
const resumeBtn: HTMLButtonElement = document.getElementById(
  "resumeBtn"
) as HTMLButtonElement;
const updateConcurrencyBtn: HTMLButtonElement = document.getElementById(
  "updateConcurrencyBtn"
) as HTMLButtonElement;
const concurrencyInput: HTMLInputElement = document.getElementById(
  "concurrencyInput"
) as HTMLInputElement;

function output(str: string) {
  textarea.value += str + "\n";
}

function addToQueue() {
  // Immediate Action
  queue
    .enqueue<string, string>(() => "Simple Text Return")
    .then((result) => output(result))
    .catch((error) => output(`Error: ${error}`));

  // Immediate Action
  queue
    .enqueue<void, void>(() => {
      return;
    })
    .then(() => output("Action returned void"))
    .catch((error) => output(`Error: ${error}`));

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
    )
    .catch((error) => output(`Error: ${error}`));

  // Promise Action which resolves after 1 second
  queue
    .enqueue<string, Promise<string>>(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return "Action 2 Completed";
    })
    .then((result) => output(result))
    .catch((error) => output(`Error: ${error}`));

  // Observable Action which completes and returns string after 3 seconds
  queue
    .enqueue<string, Observable<string>>(() => {
      return timer(3000).pipe(switchMap(() => of("Action 3 Completed")));
    })
    .then((result) => output(result))
    .catch((error) => output(`Error: ${error}`));

  // Promise Action which waits for above action to complete as the concurrency slot is occupied by long actions (8 seconds).
  queue
    .enqueue<string, Promise<string>>(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return "Action 4 Completed";
    })
    .then((result) => output(result))
    .catch((error) => output(`Error: ${error}`));

  // Promise Action
  queue
    .enqueue<string, Promise<string>>(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return "Action 5 Completed";
    })
    .then((result) => output(result))
    .catch((error) => output(`Error: ${error}`));

  // Action that throws an error
  queue
    .enqueue<string, string>(() => {
      throw new Error("Action 6 Error");
    })
    .then((result) => output(result))
    .catch((error) => output(`Error: ${error}`));
}

cancelBtn.addEventListener("click", () => {
  queue.clearQueue();
  output("Queue cleared");
});

addBtn.addEventListener("click", () => {
  addToQueue();
});

pauseBtn.addEventListener("click", () => {
  queue.pause();
  output("Queue paused");
});

resumeBtn.addEventListener("click", () => {
  queue.resume();
  output("Queue resumed");
});

updateConcurrencyBtn.addEventListener("click", () => {
  const newConcurrency = parseInt(concurrencyInput.value, 10);
  try {
    queue.updateConcurrency(newConcurrency);
    output(`Concurrency updated to ${newConcurrency}`);
  } catch (error) {
    output(`Error: ${error}`);
  }
});

queue.idleObs.subscribe((isIdle) => {
  output(isIdle ? "Queue is Idle" : "Queue is not Idle");
});

addToQueue();
