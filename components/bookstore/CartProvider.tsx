"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type CartItem = {
  bookId: string;
  title: string;
  author: string;
  priceInrPaise: number;
  mrpInrPaise: number;
  imagePath: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
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

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as CartItem[]) : [];
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

  useEffect(() => {
    const localItems = loadCart();
    setItems(localItems);
    setHydrated(true);

    // Sync from server if authenticated
    fetch("/api/v1/bookstore/cart")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.items)) {
          if (data.items.length > 0) {
            setItems(data.items);
            saveCart(data.items);
          } else if (localItems.length > 0) {
            // Push local cart to server if server cart is empty
            fetch("/api/v1/bookstore/cart", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                items: localItems.map((i) => ({ bookId: i.bookId, quantity: i.quantity })),
              }),
            });
          }
        }
      })
      .catch(() => {
        // Unauthenticated or network offline
      });
  }, []);

  useEffect(() => {
    if (hydrated) {
      saveCart(items);
      fetch("/api/v1/bookstore/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ bookId: i.bookId, quantity: i.quantity })),
        }),
      }).catch(() => {});
    }
  }, [items, hydrated]);

  const addItem = useCallback((newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.bookId === newItem.bookId);
      if (existing) {
        return prev.map((i) =>
          i.bookId === newItem.bookId ? { ...i, quantity: i.quantity + 1 } : i,
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
      setItems((prev) =>
        prev.map((i) => (i.bookId === bookId ? { ...i, quantity } : i)),
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
      items,
      totalCount,
      totalAmount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      isInCart,
    }),
    [items, totalCount, totalAmount, addItem, removeItem, updateQuantity, clearCart, isInCart],
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
