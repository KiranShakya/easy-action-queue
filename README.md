# Easy Action Queue
## Introductions
For every developers, at some point in their career, they will need to queue some action due to various reasons. For this purpose, this class would be really helpful.

## Getting Started
First we need to install this npm dependency

    npm i easy-action-queue

Once installed, you can create an instance of the queue:

    import EasyActionQueue from 'easy-action-queue';

    const queue = new EasyActionQueue<string | Promise<string>>();

Once you have the queue, you can use it to enqueue actions which return string:

    queue.enqueue(() => 'Hello')
    .then((result) => console.log(result));

    queue.enqueue(() => 'World')
    .then((result) => console.log(result));

    queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return "Delayed Action 1";
    })
    .then((result) => console.log(result));

    queue.enqueue(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return "Delayed Action 2";
    })
    .then((result) => console.log(result));

Console:

    Hello
    World
    Delayed Action 1 // After 1 seconds
    Delayed Action 2 // After 2 seconds

By default, concurrent actions is set as 1 which can be changed during init:

    const queueWith2Rows = new EasyActionQueue<string | Promise<string>>(2);