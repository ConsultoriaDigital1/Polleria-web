export type Category = "cortes" | "cajones" | "rebozados";

/** Posteo/banner de la sección "Novedades" de la home. */
export interface Novedad {
  id: string;
  title?: string;
  image: string;
  link?: string;
  active: boolean;
  position: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  badge?: string;
  /** Precio anterior, para mostrar ofertas */
  oldPrice?: number;
  available: boolean;
}

export type OrderStatus = "pendiente" | "en_preparacion" | "en_camino" | "entregado" | "cancelado";

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  customer: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  payment: "efectivo" | "tarjeta" | "mercadopago" | "transferencia";
  date: string; // ISO
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  spent: number;
  points: number;
  tier: LoyaltyTier;
  joined: string;
}

export type LoyaltyTier = "Bronce" | "Plata" | "Oro" | "Diamante";

export interface Reward {
  id: string;
  name: string;
  cost: number; // puntos
  image: string;
  highlight?: boolean;
}

export interface PointsEntry {
  id: string;
  label: string;
  date: string;
  points: number; // positivo = ganados, negativo = canjeados
  type: "compra" | "bonus" | "canje";
}
