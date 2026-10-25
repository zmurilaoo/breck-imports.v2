import {
  CategoryCarousel,
  Faq,
  GridBanner,
  Hero,
  InstagramSection,
  ProductSection,
  PromoProducts,
} from "../components/home/HomeSections";
import { getSection } from "../data/catalog";
import { banners } from "../data/site";
import { usePageTitle } from "../hooks/usePageTitle";

export function HomePage() {
  usePageTitle();
  return (
    <>
      <Hero />
      <CategoryCarousel />
      <ProductSection
        label="2 pares por R$500"
        products={getSection("promo500")}
        banner={banners.promo500}
      />
      <ProductSection
        label="2 pares por R$350 — Air Max TN"
        products={getSection("tn350")}
        cta={{ label: "VER MODELOS DA PROMOÇÃO", to: "/categoria/2-pares-350" }}
      />
      <ProductSection
        label="2 pares por R$400 — Air Max DN8"
        products={getSection("dn8400")}
        cta={{ label: "VER TODOS DN8 DISPONÍVEIS", to: "/categoria/air-max-dn8" }}
      />
      <ProductSection
        label="Chuteiras"
        products={getSection("chuteiras")}
      />
      <ProductSection
        label="Novidades"
        title="NOVIDADES NA BRECK IMPORTS"
        subtitle="Se liga nos novos lançamentos abaixo"
        products={getSection("novidades")}
      />
      <PromoProducts products={getSection("esportivos")} />
      <GridBanner />
      <Faq />
      <InstagramSection />
    </>
  );
}
