import type {
  Product,
  Order,
  Customer,
  Reward,
  PointsEntry,
  LoyaltyTier,
} from "./types";

// Imágenes reales de promos (en /public).
const IMG = {
  medallones: "/1.jpeg",
  bannerPadre: "/2.jpeg",
  bannerPadreFamilia: "/3.jpeg",
  bannerPadreFesteja: "/4.jpeg",
  pataMuslo10: "/5.jpeg",
  suprema: "/6.jpeg",
  pataMuslo15: "/8.jpeg",
  cuartosTraseros: "/9.jpeg",
  patitas: "/10.jpeg",
};

export const products: Product[] = [
  {
    id: "p-suprema-5kg",
    name: "Suprema (Filet) — Bolsa 5kg",
    description: "Bolsa de suprema/filet de pollo de 5 kg. Ideal para milanesas.",
    price: 36000,
    category: "cortes",
    image: IMG.suprema,
    badge: "Promo del día",
    available: true,
  },
  {
    id: "p-pata-muslo-10kg",
    name: "Pata Muslo Calisa — Cajón 10kg",
    description: "Cajón de pata muslo Calisa de 10 kg. El pollo argentino.",
    price: 31000,
    category: "cajones",
    image: IMG.pataMuslo10,
    badge: "Promo del día",
    available: true,
  },
  {
    id: "p-pata-muslo-15kg",
    name: "Pata Muslo — Cajón 15kg",
    description: "Cajón de pata muslo de 15 kg. Rinde más para tu familia o negocio.",
    price: 42000,
    category: "cajones",
    image: IMG.pataMuslo15,
    badge: "Promo del día",
    available: true,
  },
  {
    id: "p-cuartos-traseros-3kg",
    name: "Cuartos Traseros Fadel — 3kg",
    description: "Bolsa de cuartos traseros (pata muslo) Fadel IQF de 3 kg.",
    price: 9500,
    category: "cortes",
    image: IMG.cuartosTraseros,
    available: true,
  },
  {
    id: "p-medallones-1kg",
    name: "Medallones de Pollo Calisa — 1kg",
    description: "Medallones de pollo Calisa Pack Familiar, listos para el horno.",
    price: 8500,
    category: "rebozados",
    image: IMG.medallones,
    badge: "Más vendido",
    available: true,
  },
  {
    id: "p-patitas-1kg",
    name: "Patitas de Pollo Crujix — 1kg",
    description: "Patitas de pollo Crujix Pack Familiar Calisa, crocantes y rendidoras.",
    price: 8500,
    category: "rebozados",
    image: IMG.patitas,
    available: true,
  },
];

export const categories: { id: Product["category"] | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "cortes", label: "Cortes" },
  { id: "cajones", label: "Cajones" },
  { id: "rebozados", label: "Rebozados" },
];

export const offers: Product[] = products.filter((p) => p.oldPrice || p.badge === "Promo del día");

// ---------- Pedidos (admin) ----------
export const orders: Order[] = [
  {
    id: "#1042",
    customer: "Martín Gómez",
    items: [{ productId: "p-suprema-5kg", name: "Suprema (Filet) — Bolsa 5kg", qty: 1, price: 36000 }],
    total: 36000,
    status: "entregado",
    payment: "mercadopago",
    date: "2026-06-11T12:10:00",
  },
  {
    id: "#1041",
    customer: "Lucía Fernández",
    items: [{ productId: "p-pata-muslo-15kg", name: "Pata Muslo — Cajón 15kg", qty: 1, price: 42000 }],
    total: 42000,
    status: "en_camino",
    payment: "tarjeta",
    date: "2026-06-11T12:02:00",
  },
  {
    id: "#1040",
    customer: "Diego Sosa",
    items: [{ productId: "p-medallones-1kg", name: "Medallones de Pollo Calisa — 1kg", qty: 2, price: 8500 }],
    total: 17000,
    status: "en_preparacion",
    payment: "efectivo",
    date: "2026-06-11T11:55:00",
  },
  {
    id: "#1039",
    customer: "Sofía Ramírez",
    items: [{ productId: "p-cuartos-traseros-3kg", name: "Cuartos Traseros Fadel — 3kg", qty: 1, price: 9500 }],
    total: 9500,
    status: "pendiente",
    payment: "transferencia",
    date: "2026-06-11T11:48:00",
  },
  {
    id: "#1038",
    customer: "Javier Páez",
    items: [{ productId: "p-patitas-1kg", name: "Patitas de Pollo Crujix — 1kg", qty: 1, price: 8500 }],
    total: 8500,
    status: "entregado",
    payment: "mercadopago",
    date: "2026-06-11T11:30:00",
  },
  {
    id: "#1037",
    customer: "Carla Núñez",
    items: [{ productId: "p-pata-muslo-10kg", name: "Pata Muslo Calisa — Cajón 10kg", qty: 1, price: 31000 }],
    total: 31000,
    status: "cancelado",
    payment: "efectivo",
    date: "2026-06-11T11:12:00",
  },
];

// ---------- Clientes (admin) ----------
export const customers: Customer[] = [
  {
    id: "c-1",
    name: "Martín Gómez",
    email: "martin.gomez@mail.com",
    phone: "+54 379 412-3344",
    orders: 28,
    spent: 312500,
    points: 1250,
    tier: "Oro",
    joined: "2025-02-14",
  },
  {
    id: "c-2",
    name: "Lucía Fernández",
    email: "lucia.f@mail.com",
    phone: "+54 379 455-1290",
    orders: 41,
    spent: 487900,
    points: 2840,
    tier: "Diamante",
    joined: "2024-11-03",
  },
  {
    id: "c-3",
    name: "Diego Sosa",
    email: "diego.sosa@mail.com",
    phone: "+54 379 488-7711",
    orders: 12,
    spent: 98700,
    points: 540,
    tier: "Plata",
    joined: "2025-08-20",
  },
  {
    id: "c-4",
    name: "Sofía Ramírez",
    email: "sofia.r@mail.com",
    phone: "+54 379 401-5566",
    orders: 6,
    spent: 41200,
    points: 180,
    tier: "Bronce",
    joined: "2026-01-09",
  },
  {
    id: "c-5",
    name: "Javier Páez",
    email: "j.paez@mail.com",
    phone: "+54 379 477-9080",
    orders: 19,
    spent: 176400,
    points: 920,
    tier: "Oro",
    joined: "2025-05-27",
  },
];

// ---------- Club Pollería (fidelización) ----------
export const loyaltyTiers: {
  tier: LoyaltyTier;
  min: number;
  perk: string;
}[] = [
  { tier: "Bronce", min: 0, perk: "Acumulás 1 punto por cada $10" },
  { tier: "Plata", min: 500, perk: "Descuentos exclusivos los martes" },
  { tier: "Oro", min: 1000, perk: "10% extra de puntos en cada compra" },
  { tier: "Diamante", min: 2000, perk: "Regalo sorpresa en tu cumpleaños" },
];

export const rewards: Reward[] = [
  { id: "r-1", name: "$1.000 de descuento", cost: 1000, image: IMG.bannerPadre, highlight: true },
  { id: "r-2", name: "Medallones 1kg GRATIS", cost: 2500, image: IMG.medallones },
  { id: "r-3", name: "Patitas 1kg GRATIS", cost: 2500, image: IMG.patitas },
  { id: "r-4", name: "Cuartos Traseros 3kg GRATIS", cost: 2800, image: IMG.cuartosTraseros },
  { id: "r-5", name: "$2.500 de descuento", cost: 2200, image: IMG.suprema },
  { id: "r-6", name: "$5.000 de descuento", cost: 4000, image: IMG.pataMuslo10 },
];

export const pointsHistory: PointsEntry[] = [
  { id: "h-1", label: "Compra en tienda", date: "2026-05-31", points: 150, type: "compra" },
  { id: "h-2", label: "Bonificación por nivel Oro", date: "2026-05-30", points: 250, type: "bonus" },
  { id: "h-3", label: "Compra en tienda", date: "2026-05-29", points: 120, type: "compra" },
  { id: "h-4", label: "Canje: Medallones 1kg", date: "2026-05-22", points: -2500, type: "canje" },
  { id: "h-5", label: "Compra en tienda", date: "2026-05-18", points: 90, type: "compra" },
];

/** Cliente "logueado" de ejemplo para la vista de cliente del club. */
export const currentUser = {
  id: "c-1",
  name: "Martín Gómez",
  points: 1250,
  tier: "Oro" as LoyaltyTier,
  nextTier: "Diamante" as LoyaltyTier,
  pointsToNext: 750,
};

export function productById(id: string): Product | undefined {
  return products.find((p) => p.id === id);
}
