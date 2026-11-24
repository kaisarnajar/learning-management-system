import { beforeEach, describe, expect, it, vi } from "vitest";

const cache = vi.hoisted(() => ({ updateTag: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("next/cache", () => ({
  unstable_cache: <T,>(fn: T) => fn,
  updateTag: cache.updateTag,
  revalidateTag: cache.revalidateTag,
}));

import { PUBLIC_CONTENT_TAG, revalidatePublicContent } from "@/services/public-cache";

/** Unpublishing takes effect at once, not after one more stale read (review L19). */
describe("revalidatePublicContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("expires the public cache with updateTag inside a Server Action", () => {
    revalidatePublicContent();

    expect(cache.updateTag).toHaveBeenCalledWith(PUBLIC_CONTENT_TAG);
    expect(cache.revalidateTag).not.toHaveBeenCalled();
  });

  it("expires it with revalidateTag(tag, { expire: 0 }) where updateTag is not allowed (Route Handlers)", () => {
    cache.updateTag.mockImplementationOnce(() => {
      throw new Error("updateTag can only be called from within a Server Action.");
    });

    revalidatePublicContent();

    expect(cache.revalidateTag).toHaveBeenCalledWith(PUBLIC_CONTENT_TAG, { expire: 0 });
  });
});
