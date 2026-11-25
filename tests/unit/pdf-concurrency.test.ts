import { afterEach, describe, expect, it, vi } from "vitest";
import { createSemaphore, SemaphoreTimeoutError } from "@/utils/semaphore";

const launches = vi.hoisted(() => ({ active: 0, peak: 0, total: 0 }));

function fakeBrowser() {
  launches.active++;
  launches.total++;
  launches.peak = Math.max(launches.peak, launches.active);
  const page = {
    setViewport: vi.fn(async () => {}),
    setJavaScriptEnabled: vi.fn(async () => {}),
    setRequestInterception: vi.fn(async () => {}),
    on: vi.fn(),
    setContent: vi.fn(async () => new Promise((resolve) => setTimeout(resolve, 20))),
    evaluateHandle: vi.fn(async () => {}),
    pdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
  };
  return {
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => {
      launches.active--;
    }),
  };
}

vi.mock("puppeteer", () => ({ default: { launch: vi.fn(async () => fakeBrowser()) } }));
vi.mock("puppeteer-core", () => ({ default: { launch: vi.fn(async () => fakeBrowser()) } }));
vi.mock("@sparticuz/chromium-min", () => ({ default: { args: [] } }));

describe("PDF rendering concurrency", () => {
  afterEach(() => {
    launches.active = 0;
    launches.peak = 0;
    launches.total = 0;
  });

  it("runs at most one Chromium at a time for concurrent renders", async () => {
    const { generatePdfFromHtml } = await import("@/services/pdf-generator");

    const results = await Promise.all([
      generatePdfFromHtml("<p>1</p>"),
      generatePdfFromHtml("<p>2</p>"),
      generatePdfFromHtml("<p>3</p>"),
    ]);

    expect(results).toHaveLength(3);
    expect(results.every((buffer) => buffer.subarray(0, 4).toString() === "%PDF")).toBe(true);
    expect(launches.total).toBe(3);
    expect(launches.peak).toBe(1);
    expect(launches.active).toBe(0);
  });
});

describe("createSemaphore", () => {
  it("frees the slot when a task fails", async () => {
    const semaphore = createSemaphore(1, { timeoutMs: 1_000 });
    await expect(semaphore.run(async () => { throw new Error("boom"); })).rejects.toThrow("boom");
    await expect(semaphore.run(async () => "ok")).resolves.toBe("ok");
    expect(semaphore.active).toBe(0);
  });

  it("gives up with a clear error when the queue wait exceeds the timeout", async () => {
    vi.useFakeTimers();
    try {
      const semaphore = createSemaphore(1, { timeoutMs: 100, timeoutMessage: "busy" });
      let finish!: () => void;
      const first = semaphore.run(() => new Promise<void>((resolve) => { finish = resolve; }));
      const second = semaphore.run(async () => "never");
      const assertion = expect(second).rejects.toBeInstanceOf(SemaphoreTimeoutError);
      await vi.advanceTimersByTimeAsync(150);
      await assertion;
      expect(semaphore.waiting).toBe(0);
      finish();
      await first;
      expect(semaphore.active).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
