import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { prisma } from "@/utils/prisma";
import { GET as webCartGet, POST as webCartPost } from "@/app/api/cart/route";
import { createBook, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";

/**
 * The website's cart sync uses the browser session (/api/cart), because
 * /api/v1 only accepts Bearer tokens. Before this route existed the web cart
 * called /api/v1 with cookies and every sync was refused.
 */
describe.skipIf(SKIP_WITHOUT_DB)("web cart (/api/cart)", () => {
  beforeEach(resetDb);

  const post = (items: unknown) =>
    webCartPost(new Request("http://localhost:3000/api/cart", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items }),
    }));

  it("refuses signed-out visitors", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    expect((await webCartGet()).status).toBe(401);
    expect((await post([])).status).toBe(401);
  });

  it("stores the signed-in student's cart and returns only purchasable books", async () => {
    const student = await createUser();
    vi.mocked(auth).mockResolvedValue(sessionFor(student, "STUDENT") as never);
    const book = await createBook();
    const soldOut = await createBook({ status: "OUT_OF_STOCK" });

    const saved = await (await post([{ bookId: book.id, quantity: 3 }, { bookId: soldOut.id, quantity: 1 }])).json();
    expect(saved.items).toEqual([expect.objectContaining({ bookId: book.id, quantity: 3 })]);

    const read = await (await webCartGet()).json();
    expect(read.items).toHaveLength(1);
    expect(await prisma.userCartItem.count({ where: { userId: student.id } })).toBe(1);
  });
});
