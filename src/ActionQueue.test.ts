import { BehaviorSubject, of, Observable } from "rxjs";
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
