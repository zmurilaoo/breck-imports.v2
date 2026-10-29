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
      {/* Tênis separados das chuteiras: cada linha com a sua vitrine */}
      <ProductSection
        label="Air Max TN"
        title="AIR MAX TN"
        subtitle="O clássico que nunca sai de moda"
        products={getSection("airMaxTn")}
        cta={{ label: "VER TODOS OS AIR MAX TN", to: "/categoria/air-max-tn" }}
      />
      <ProductSection
        label="Mizuno"
        title="MIZUNO WAVE PROPHECY"
        subtitle="Conforto e estilo em cada passo"
        products={getSection("mizuno")}
        cta={{ label: "VER TODOS OS MIZUNO", to: "/categoria/mizuno" }}
      />
      <GridBanner />
      <Faq />
      <InstagramSection />
      <StoreSection />
    </>
  );
}
