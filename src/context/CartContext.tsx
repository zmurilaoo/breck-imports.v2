import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { getProduct } from "../data/catalog";
import type { CartItem } from "../types";
import { CartContext, type CartContextValue, type CartLine } from "./cart-context";

const STORAGE_KEY = "breck-cart";

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (i): i is CartItem =>
        typeof i?.slug === "string" && typeof i?.size === "string" && Number.isInteger(i?.quantity) && i.quantity > 0,
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<CartLine | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    if (!lastAdded) return;
    const t = window.setTimeout(() => setLastAdded(null), 4000);
    return () => window.clearTimeout(t);
  }, [lastAdded]);

  const lines = useMemo(
    () =>
      items.flatMap((item) => {
        const product = getProduct(item.slug);
        return product ? [{ ...item, product }] : [];
      }),
    [items],
  );

  const add = useCallback((slug: string, size: string, quantity = 1) => {
    const product = getProduct(slug);
    if (!product) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.slug === slug && i.size === size);
      if (existing) {
        return prev.map((i) => (i === existing ? { ...i, quantity: i.quantity + quantity } : i));
      }
      return [...prev, { slug, size, quantity }];
    });
    setLastAdded({ slug, size, quantity, product });
  }, []);

  const setQuantity = useCallback((slug: string, size: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => !(i.slug === slug && i.size === size))
        : prev.map((i) => (i.slug === slug && i.size === size ? { ...i, quantity } : i)),
    );
  }, []);

  const remove = useCallback((slug: string, size: string) => {
    setItems((prev) => prev.filter((i) => !(i.slug === slug && i.size === size)));
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((n, l) => n + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.quantity * l.product.price, 0),
      isOpen,
      lastAdded,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      setQuantity,
      remove,
      clear: () => setItems([]),
      dismissToast: () => setLastAdded(null),
    }),
    [lines, isOpen, lastAdded, add, setQuantity, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
