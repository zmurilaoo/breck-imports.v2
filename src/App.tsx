import { useEffect } from "react";
import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { CartDrawer } from "./components/cart/CartDrawer";
import { AddedToCartToast, CookieBanner, WhatsAppButton } from "./components/layout/FloatingUI";
import { Footer } from "./components/layout/Footer";
import { Header } from "./components/layout/Header";
import { MobileMenu } from "./components/layout/MobileMenu";
import { SearchModal } from "./components/layout/SearchModal";
import { QuickShopModal } from "./components/product/QuickShopModal";
import { CartProvider } from "./context/CartContext";
import { UIProvider } from "./context/UIContext";
import { useUI } from "./context/ui-context";
import { useScrollReveal } from "./hooks/useScrollReveal";
import { AccountPage } from "./pages/AccountPage";
import { CheckoutPage, OrderResultPage } from "./pages/CheckoutPage";
import { HomePage } from "./pages/HomePage";
import { InfoPage } from "./pages/InfoPage";
import { ListingPage } from "./pages/ListingPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ProductPage } from "./pages/ProductPage";

function Layout() {
  const { pathname, search } = useLocation();
  const { setMenuOpen, setSearchOpen } = useUI();
  useScrollReveal();

  useEffect(() => {
    window.scrollTo(0, 0);
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname, search, setMenuOpen, setSearchOpen]);

  return (
    <>
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <Header />
      <main id="conteudo">
        <Outlet />
      </main>
      <Footer />
      <MobileMenu />
      <SearchModal />
      <CartDrawer />
      <QuickShopModal />
      <AddedToCartToast />
      <WhatsAppButton />
      <CookieBanner />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <UIProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="produtos" element={<ListingPage mode="all" />} />
              <Route path="produtos/:slug" element={<ProductPage />} />
              <Route path="categoria/:slug" element={<ListingPage mode="category" />} />
              <Route path="busca" element={<ListingPage mode="search" />} />
              <Route path="pagina/:slug" element={<InfoPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="pedido/:status" element={<OrderResultPage />} />
              <Route path="conta/login" element={<AccountPage mode="login" />} />
              <Route path="conta/cadastro" element={<AccountPage mode="register" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </UIProvider>
      </CartProvider>
    </BrowserRouter>
  );
}
