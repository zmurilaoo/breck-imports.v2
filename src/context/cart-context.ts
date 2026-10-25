import { createContext, useContext } from "react";
import type { CartItem, Product } from "../types";

export interface CartLine extends CartItem {
  product: Product;
}

export interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  lastAdded: CartLine | null;
  open: () => void;
  close: () => void;
  add: (slug: string, size: string, quantity?: number) => void;
  setQuantity: (slug: string, size: string, quantity: number) => void;
  remove: (slug: string, size: string) => void;
  clear: () => void;
  dismissToast: () => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}
