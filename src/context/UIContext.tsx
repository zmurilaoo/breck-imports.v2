import { useMemo, useState, type ReactNode } from "react";
import { UIContext } from "./ui-context";

export function UIProvider({ children }: { children: ReactNode }) {
  const [quickShopSlug, setQuickShopSlug] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const value = useMemo(
    () => ({
      quickShopSlug,
      openQuickShop: setQuickShopSlug,
      closeQuickShop: () => setQuickShopSlug(null),
      menuOpen,
      setMenuOpen,
      searchOpen,
      setSearchOpen,
    }),
    [quickShopSlug, menuOpen, searchOpen],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}
