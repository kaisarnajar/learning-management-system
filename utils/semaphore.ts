/** Thrown when a caller waited longer than the semaphore's queue timeout. */
export class SemaphoreTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SemaphoreTimeoutError";
  }
}

/**
 * A counting semaphore for one process. `run` waits for a free slot (first
 * come, first served), runs the task and frees the slot when it settles. A
 * caller still waiting after `timeoutMs` is removed from the queue and gets a
 * SemaphoreTimeoutError.
 */
export function createSemaphore(size: number, { timeoutMs, timeoutMessage = "Timed out waiting for a free slot." }: { timeoutMs: number; timeoutMessage?: string }) {
  const limit = Math.max(1, Math.floor(size));
  let active = 0;
  const waiting: Array<() => void> = [];

  function release() {
    const next = waiting.shift();
    if (next) next();
    else active--;
  }

  function acquire(): Promise<void> {
    if (active < limit) {
      active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const grant = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        const index = waiting.indexOf(grant);
        if (index >= 0) waiting.splice(index, 1);
        reject(new SemaphoreTimeoutError(timeoutMessage));
      }, timeoutMs);
      waiting.push(grant);
    });
  }

  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      await acquire();
      try {
        return await task();
      } finally {
        release();
      }
    },
    get active() {
      return active;
    },
    get waiting() {
      return waiting.length;
    },
  };
}
