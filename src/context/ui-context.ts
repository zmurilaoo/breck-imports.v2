import { createContext, useContext } from "react";

export interface UIContextValue {
  quickShopSlug: string | null;
  openQuickShop: (slug: string) => void;
  closeQuickShop: () => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
}

export const UIContext = createContext<UIContextValue | null>(null);

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI deve ser usado dentro de <UIProvider>");
  return ctx;
}
