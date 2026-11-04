import { expect, test } from "@playwright/test";
import { AUTH_STATE, db, FIXTURES, hasDatabase } from "./support/db";
import { confirmDialog, rowWith } from "./support/ui";

test.skip(!hasDatabase, "DATABASE_URL_TEST is not set");

test("buy a book, then the admin approves, ships and refunds the order", async ({ browser }) => {
  test.setTimeout(240_000);
  const buyer = await browser.newContext({ storageState: AUTH_STATE.buyer });
  const admin = await browser.newContext({ storageState: AUTH_STATE.admin });
  const page = await buyer.newPage();
  const adminPage = await admin.newPage();
  const total = FIXTURES.book.pricePaise + FIXTURES.book.shippingPaise;

  await test.step("add the book to the cart and check out", async () => {
    await page.goto("/bookstore");
    await page.getByRole("link", { name: new RegExp(FIXTURES.book.title) }).first().click();
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page.getByRole("button", { name: /remove from cart/i })).toBeVisible();

    await page.goto("/profile/cart");
    await page.getByRole("button", { name: "Select all", exact: true }).click();
    await page.getByRole("link", { name: /proceed to checkout/i }).click();
    await page.waitForURL(/\/profile\/cart\/checkout/);

    await page.getByLabel(/transaction \/ utr reference/i).fill("BOOKUTR0001");
    await page.locator("#checkout-address").fill("12 Example Street, Srinagar, J&K");
    await page.locator("#checkout-pincode").fill("190001");
    await page.locator("#checkout-phone").fill("9876543210");
    await page.getByRole("button", { name: /submit order for approval/i }).click();
    await page.waitForURL(/\/profile\/cart\?submitted=1/);

    const order = await db().bookOrder.findFirstOrThrow({ where: { user: { email: FIXTURES.buyer.email } }, include: { items: true } });
    expect(order).toMatchObject({ status: "PENDING_VERIFICATION", totalAmountInrPaise: total, shippingChargeInrPaise: FIXTURES.book.shippingPaise });
    expect(order.items).toHaveLength(1);
  });

  const orderRow = () => rowWith(adminPage, "BOOKUTR0001");
  const status = async () => (await db().bookOrder.findFirstOrThrow({ where: { upiTransactionId: "BOOKUTR0001" } })).status;

  await test.step("the admin approves the order, which records the income and holds the stock", async () => {
    await adminPage.goto("/admin/bookstore/orders");
    await orderRow().getByRole("button", { name: "Approve" }).click();
    await confirmDialog(adminPage, "Approve");
    await expect.poll(status).toBe("APPROVED");
    const record = await db().paymentRecord.findFirstOrThrow({ where: { bookOrder: { upiTransactionId: "BOOKUTR0001" } } });
    expect(record).toMatchObject({ amountInrPaise: total, voidedAt: null });
  });

  await test.step("the admin ships it with tracking details", async () => {
    // An approved order sits on the "Approved Orders" tab until it is shipped.
    await adminPage.goto("/admin/bookstore/orders?status=approved");
    await orderRow().getByRole("button", { name: /mark as shipped/i }).click();
    await adminPage.getByPlaceholder(/dtdc/i).fill("India Post");
    await adminPage.getByPlaceholder(/1z99/i).fill("TRK-E2E-1");
    await adminPage.getByRole("button", { name: /confirm shipment/i }).click();
    await expect.poll(status).toBe("SHIPPED");
    expect(await db().bookOrder.findFirstOrThrow({ where: { upiTransactionId: "BOOKUTR0001" } })).toMatchObject({
      courierServiceName: "India Post",
      trackingId: "TRK-E2E-1",
    });
  });

  await test.step("the buyer sees the shipment", async () => {
    await page.goto("/profile/cart");
    await expect(page.getByText("TRK-E2E-1").first()).toBeVisible();
  });

  await test.step("the admin refunds it: income is voided and the stock is released", async () => {
    // Shipped orders move to the "Completed Orders" tab, where a refund is still offered.
    await adminPage.goto("/admin/bookstore/orders?status=completed");
    await orderRow().getByRole("button", { name: "Refund" }).click();
    await confirmDialog(adminPage, "Refund");
    await expect.poll(status).toBe("REFUNDED");

    const record = await db().paymentRecord.findFirstOrThrow({ where: { bookOrder: { upiTransactionId: "BOOKUTR0001" } } });
    expect(record.voidedAt).not.toBeNull();
    const audit = await db().auditLog.findFirstOrThrow({ where: { entity: "BookOrder", action: "refund" } });
    expect(audit.actorEmail).toBe(FIXTURES.admin.email);
  });

  await buyer.close();
  await admin.close();
});
