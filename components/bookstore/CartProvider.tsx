"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MAX_ORDER_QTY } from "@/config/constants/business";

type CartItem = {
  bookId: string;
  title: string;
  author: string;
  priceInrPaise: number;
  mrpInrPaise: number;
  imagePath: string | null;
  quantity: number;
};

/** A book the server dropped from the cart because it is no longer purchasable. */
type StaleCartItem = { bookId: string; title: string };

type CartContextValue = {
  /** True once the cart has been read from localStorage. */
  hydrated: boolean;
  items: CartItem[];
  /** Items removed after a sync because they became unpublished or out of stock. */
  staleItems: StaleCartItem[];
  dismissStale: () => void;
  totalCount: number;
  totalAmount: number;
  addItem: (item: Omit<CartItem, "quantity"> & { mrpInrPaise?: number }) => void;
  removeItem: (bookId: string) => void;
  updateQuantity: (bookId: string, quantity: number) => void;
  clearCart: () => void;
  isInCart: (bookId: string) => boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "dqa-bookstore-cart";
const SYNC_DEBOUNCE_MS = 500;
const CART_API = "/api/v1/bookstore/cart";

/** Stable fingerprint of a cart, used to skip POSTs that would change nothing. */
function cartSignature(items: CartItem[]): string {
  return items
    .map((i) => `${i.bookId}:${i.quantity}`)
    .sort()
    .join("|");
}

function toCartItem(raw: CartItem): CartItem {
  return {
    bookId: raw.bookId,
    title: raw.title,
    author: raw.author,
    priceInrPaise: raw.priceInrPaise,
    mrpInrPaise: raw.mrpInrPaise,
    imagePath: raw.imagePath,
    quantity: Math.min(raw.quantity, MAX_ORDER_QTY),
  };
}

/** Merges the server cart with the local one by bookId, keeping the larger quantity. */
function mergeCarts(server: CartItem[], local: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of server) merged.set(item.bookId, toCartItem(item));
  for (const item of local) {
    const existing = merged.get(item.bookId);
    merged.set(
      item.bookId,
      existing
        ? { ...existing, quantity: Math.min(Math.max(existing.quantity, item.quantity), MAX_ORDER_QTY) }
        : toCartItem(item),
    );
  }
  return [...merged.values()];
}

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return (JSON.parse(stored) as CartItem[]).map((i) => ({
      ...i,
      quantity: Math.min(i.quantity, MAX_ORDER_QTY),
    }));
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [staleItems, setStaleItems] = useState<StaleCartItem[]>([]);
  const itemsRef = useRef<CartItem[]>([]);
  const lastPushedRef = useRef<string | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  /**
   * Replaces the server cart with `toPush`. The response only contains books
   * that are still purchasable, so anything sent but not returned is removed
   * locally and reported through `staleItems`.
   */
  const pushToServer = useCallback(async (toPush: CartItem[]) => {
    lastPushedRef.current = cartSignature(toPush);
    try {
      const res = await fetch(CART_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: toPush.map((i) => ({ bookId: i.bookId, quantity: i.quantity })),
        }),
      });
      if (!res.ok) {
        lastPushedRef.current = null;
        return;
      }
      const data = await res.json();
      if (!Array.isArray(data?.items)) return;

      const keptIds = new Set<string>(data.items.map((i: CartItem) => i.bookId));
      const dropped = toPush.filter((i) => !keptIds.has(i.bookId));
      if (dropped.length > 0) {
        const droppedIds = new Set(dropped.map((d) => d.bookId));
        setItems((prev) => prev.filter((i) => !droppedIds.has(i.bookId)));
        setStaleItems((prev) => [
          ...prev,
          ...dropped
            .filter((d) => !prev.some((p) => p.bookId === d.bookId))
            .map((d) => ({ bookId: d.bookId, title: d.title })),
        ]);
      }
    } catch {
      lastPushedRef.current = null;
    }
  }, []);

  useEffect(() => {
    const localItems = loadCart();
    setItems(localItems);
    setHydrated(true);

    let cancelled = false;

    // Read the server cart first and only then push: pushing the local cart
    // before the GET resolves would overwrite items added on another device.
    fetch(CART_API)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.success || !Array.isArray(data.items)) return;
        const merged = mergeCarts(data.items, itemsRef.current);
        setItems(merged);
        setServerReady(true);
        void pushToServer(merged);
      })
      .catch(() => {
        // Unauthenticated or network offline: the cart stays local only.
      });

    return () => {
      cancelled = true;
    };
  }, [pushToServer]);

  useEffect(() => {
    if (!hydrated) return;
    saveCart(items);
    if (!serverReady || cartSignature(items) === lastPushedRef.current) return;

    const timer = setTimeout(() => {
      void pushToServer(items);
    }, SYNC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [items, hydrated, serverReady, pushToServer]);

  const dismissStale = useCallback(() => setStaleItems([]), []);

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.bookId === newItem.bookId);
      if (existing) {
        return prev.map((i) =>
          i.bookId === newItem.bookId
            ? { ...i, quantity: Math.min(i.quantity + 1, MAX_ORDER_QTY) }
            : i,
        );
      }
      return [...prev, { ...newItem, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((bookId: string) => {
    setItems((prev) => prev.filter((i) => i.bookId !== bookId));
  }, []);

  const updateQuantity = useCallback((bookId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.bookId !== bookId));
    } else {
      const capped = Math.min(Math.floor(quantity), MAX_ORDER_QTY);
      setItems((prev) =>
        prev.map((i) => (i.bookId === bookId ? { ...i, quantity: capped } : i)),
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (bookId: string) => items.some((i) => i.bookId === bookId),
    [items],
  );

  const totalCount = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity, 0),
    [items],
  );

  const totalAmount = useMemo(
    () => items.reduce((sum, i) => sum + i.priceInrPaise * i.quantity, 0),
    [items],
  );

  const value = useMemo(
    () => ({
      hydrated,
      items,
      staleItems,
      dismissStale,
      totalCount,
      totalAmount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isInCart,
    }),
    [
      hydrated,
      items,
      staleItems,
      dismissStale,
      totalCount,
      totalAmount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isInCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
