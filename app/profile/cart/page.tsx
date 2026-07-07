import type { Metadata } from "next";
import { CartPageClient } from "@/components/bookstore/CartPageClient";
import { requireUser } from "@/services/auth-actions";
import { getBookOrdersForUser } from "@/services/bookstore";

export const metadata: Metadata = {
  title: "My Cart",
  description: "Review your selected books and proceed to checkout.",
};

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;

  const orders = await getBookOrdersForUser(session.user.id);

  return <CartPageClient submitted={params.submitted === "1"} orders={orders} emailVerified={!!session.user.emailVerified} />;
}
