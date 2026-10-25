export interface ProductSize {
  size: string;
  available: boolean;
}

export interface Product {
  slug: string;
  name: string;
  price: number;
  comparePrice: number | null;
  label: string | null;
  images: string[];
  sizes: ProductSize[];
  categories: string[];
  isNew: boolean;
  installment12: number;
}

export interface CartItem {
  slug: string;
  size: string;
  quantity: number;
}

export interface NavLink {
  label: string;
  to: string;
  children?: NavLink[];
}

/** Como o personagem entra e se mexe no banner. */
export type MascotFx = "peek" | "climb" | "run";

export interface BannerMascot {
  /** Canto superior esquerdo e largura, em % do banner */
  x: number;
  y: number;
  w: number;
  fx: MascotFx;
  /** "head" = só cabeça e ombros (espiando); padrão = corpo inteiro */
  crop?: "head";
}

export interface Banner {
  image: string;
  alt: string;
  to: string;
  /** Composições feitas por cima da arte original */
  layout?: "chuteiras" | "tn";
  mascots?: BannerMascot[];
  /** Pontos de luz piscando (ex.: faróis), em % da imagem */
  lights?: { x: number; y: number; size: number }[];
  /** Feixe de luz atravessando o banner */
  streak?: boolean;
}
