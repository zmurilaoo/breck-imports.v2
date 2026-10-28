import {
  CategoryCarousel,
  Faq,
  GridBanner,
  Hero,
  InstagramSection,
  ProductSection,
  StoreSection,
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
        title="AS MAIS COMPRADAS"
        subtitle="As chuteiras que a galera mais tá comprando"
        products={getSection("promo500")}
        banner={[banners.promo500, banners.meia]}
      />
      <ProductSection
        label="Chuteiras Campo"
        title="CHUTEIRAS CAMPO"
        products={getSection("chuteirasCampo")}
        cta={{ label: "VER TODAS DE CAMPO", to: "/categoria/chuteira-campo" }}
      />
      <ProductSection
        label="Chuteiras Society"
        title="CHUTEIRAS SOCIETY"
        products={getSection("chuteirasSociety")}
        cta={{ label: "VER TODAS SOCIETY", to: "/categoria/chuteira-society" }}
      />
      <ProductSection
        label="Chuteiras Futsal"
        title="CHUTEIRAS FUTSAL"
        products={getSection("chuteirasFutsal")}
        cta={{ label: "VER TODAS FUTSAL", to: "/categoria/chuteira-futsal" }}
      />
      <ProductSection
        label="Novidades"
        title="NOVIDADES NA BRECK IMPORTS"
        subtitle="Se liga nos novos lançamentos abaixo"
        products={getSection("novidades")}
      />
      <GridBanner />
      <Faq />
      <InstagramSection />
      <StoreSection />
    </>
  );
}
