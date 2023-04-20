import EasyActionQueue from "../src/ActionQueue";

const queue = new EasyActionQueue<string | Promise<string>>(2);
const textarea: HTMLTextAreaElement = document.getElementById(
  "output"
) as HTMLTextAreaElement;

function output(str: string) {
  textarea.value += str + "\n";
}

queue.enqueue(() => "test").then((result) => output(result as string));

queue
  .enqueue(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "Action 2";
  })
  .then((result) => output(result as string));

queue
  .enqueue(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "Action 3";
  })
  .then((result) => output(result as string));
queue
  .enqueue(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "Action 4";
  })
  .then((result) => output(result as string));
queue
  .enqueue(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return "Action 5";
  })
  .then((result) => output(result as string));
