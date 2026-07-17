import { prisma, hasDatabase } from "./prisma";
import { normalizePhone } from "./phone";
import type {
  Product as DbProduct,
  Order as DbOrder,
  OrderItem as DbOrderItem,
  Customer as DbCustomer,
  PointsEntry as DbPointsEntry,
  Staff as DbStaff,
} from "@prisma/client";
import type {
  Product,
  Order,
  OrderItem,
  OrderStatus,
  Customer,
  LoyaltyTier,
  PointsEntry,
  Category,
  Novedad,
  SuperOferta,
  Staff,
  StaffRole,
} from "./types";
import {
  products as mockProducts,
  customers as mockCustomers,
  orders as mockOrders,
  pointsHistory as mockPoints,
  staff as mockStaff,
  loyaltyTiers,
  categories,
} from "./data";
import { OTP_RESEND_MS, OTP_MAX_ATTEMPTS, isAdminPhone } from "./auth/otp";
import type { Role } from "./auth/session";
import { hashPassword, verifyPassword } from "./auth/password";
import { eventForStatus, notifyOrderEvent } from "./n8n";
import { sucursales } from "./sucursales";
import { optimizeRoute, googleMapsRouteUrl, DEFAULT_ROUTE_ORIGIN } from "./route";

/** Se lanza cuando una operación de escritura necesita base de datos y no hay. */
export class NoDatabaseError extends Error {
  constructor() {
    super("Operación no disponible: no hay base de datos configurada (DATABASE_URL).");
    this.name = "NoDatabaseError";
  }
}

function ensureDb() {
  if (!hasDatabase) throw new NoDatabaseError();
}

/** Clientes creados en runtime cuando no hay DB (solo desarrollo local). */
const globalForRepo = globalThis as unknown as {
  runtimeCustomers?: Map<string, Customer>;
  runtimeOrders?: Map<string, Order>;
  runtimeSeq?: { n: number };
};
const runtimeCustomers = globalForRepo.runtimeCustomers ?? new Map<string, Customer>();
if (!globalForRepo.runtimeCustomers) globalForRepo.runtimeCustomers = runtimeCustomers;

/**
 * Pedidos en memoria para el modo sin base de datos (demo/pruebas). Persisten
 * mientras viva el proceso del server de desarrollo, así se puede recorrer todo
 * el flujo (pago → preparación → reparto → entregado) sin Postgres.
 */
const runtimeOrders = globalForRepo.runtimeOrders ?? new Map<string, Order>();
if (!globalForRepo.runtimeOrders) globalForRepo.runtimeOrders = runtimeOrders;
const runtimeSeq = globalForRepo.runtimeSeq ?? { n: 1042 };
if (!globalForRepo.runtimeSeq) globalForRepo.runtimeSeq = runtimeSeq;

function runtimeCustomerId(phone: string) {
  return `guest-${phone}`;
}

/** Calcula el nivel del Club según los puntos acumulados. */
export function tierForPoints(points: number): LoyaltyTier {
  let tier: LoyaltyTier = "Bronce";
  for (const t of loyaltyTiers) if (points >= t.min) tier = t.tier;
  return tier;
}

// ---------- Mappers DB -> tipos públicos ----------
function mapProduct(p: DbProduct): Product {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    oldPrice: p.oldPrice ?? undefined,
    category: p.category as Category,
    image: p.image,
    badge: p.badge ?? undefined,
    available: p.available,
  };
}

function mapOrder(o: DbOrder & { items: DbOrderItem[] }): Order {
  return {
    id: o.code ?? `#${1000 + o.seq}`,
    internalId: o.id,
    customer: o.customerName,
    phone: o.phone ?? undefined,
    address: o.address ?? undefined,
    entrega: (o.entrega as Order["entrega"]) ?? undefined,
    sucursalId: o.sucursalId ?? undefined,
    lat: o.lat ?? undefined,
    lng: o.lng ?? undefined,
    deliveryCode: o.deliveryCode ?? undefined,
    routeSeq: o.routeSeq ?? undefined,
    dispatchedAt: o.dispatchedAt?.toISOString(),
    updatedAt: o.updatedAt?.toISOString(),
    originSucursalId: o.originSucursalId ?? undefined,
    notes: o.notes ?? undefined,
    items: o.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      qty: i.qty,
      price: i.price,
    })),
    total: o.total,
    status: o.status as OrderStatus,
    payment: o.payment,
    date: o.createdAt.toISOString(),
  };
}

function mapCustomer(c: DbCustomer & { orders?: { total: number }[] }): Customer {
  const ords = c.orders ?? [];
  return {
    id: c.id,
    name: c.name,
    email: c.email ?? "",
    phone: c.phone,
    document: c.document ?? undefined,
    orders: ords.length,
    spent: ords.reduce((a, o) => a + o.total, 0),
    points: c.points,
    tier: c.tier as LoyaltyTier,
    joined: c.joinedAt.toISOString(),
  };
}

function mapStaff(s: DbStaff): Staff {
  return {
    id: s.id,
    name: s.name,
    role: s.role as StaffRole,
    phone: s.phone ?? undefined,
    email: s.email ?? undefined,
    username: s.username ?? undefined,
    hasPassword: Boolean(s.passwordHash),
    permissions: s.permissions ?? [],
    active: s.active,
    createdAt: s.createdAt.toISOString(),
  };
}

/**
 * Club de puntos: se acumula 1 punto por cada $10 gastados.
 * Centralizado acá para que el cálculo sea idéntico en toda la app.
 */
export const PESOS_PER_POINT = 10;

/** Puntos que genera un monto gastado (redondeado hacia abajo). */
export function pointsForAmount(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount / PESOS_PER_POINT);
}

function mapPoint(e: DbPointsEntry): PointsEntry {
  return {
    id: e.id,
    label: e.label,
    date: e.createdAt.toISOString(),
    points: e.points,
    type: e.type,
  };
}

// ---------- Catálogo ----------
export interface ProductFilter {
  category?: Category;
  available?: boolean;
  search?: string;
}

export async function listProducts(f: ProductFilter = {}): Promise<Product[]> {
  if (hasDatabase) {
    const rows = await prisma.product.findMany({
      where: {
        category: f.category,
        available: f.available,
        ...(f.search
          ? {
              OR: [
                { name: { contains: f.search, mode: "insensitive" } },
                { description: { contains: f.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapProduct);
  }
  return mockProducts.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.available !== undefined && p.available !== f.available) return false;
    if (f.search) {
      const q = f.search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q))
        return false;
    }
    return true;
  });
}

export async function getProduct(id: string): Promise<Product | null> {
  if (hasDatabase) {
    const p = await prisma.product.findUnique({ where: { id } });
    return p ? mapProduct(p) : null;
  }
  return mockProducts.find((p) => p.id === id) ?? null;
}

export async function listOffers(): Promise<Product[]> {
  if (hasDatabase) {
    const rows = await prisma.product.findMany({
      where: { oldPrice: { not: null } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapProduct);
  }
  return mockProducts.filter((p) => p.oldPrice != null || p.badge === "Promo del día");
}

export function listCategories() {
  return categories;
}

export interface ProductInput {
  name: string;
  description: string;
  price: number;
  oldPrice?: number | null;
  category: Category;
  image: string;
  badge?: string | null;
  available?: boolean;
}

/** Crea un producto. El id se deriva del nombre (slug) si no se pasa. */
export async function createProduct(input: ProductInput & { id?: string }): Promise<Product> {
  ensureDb();
  const id =
    input.id ??
    input.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const p = await prisma.product.create({
    data: {
      id,
      name: input.name,
      description: input.description,
      price: input.price,
      oldPrice: input.oldPrice ?? null,
      category: input.category,
      image: input.image,
      badge: input.badge ?? null,
      available: input.available ?? true,
    },
  });
  return mapProduct(p);
}

/** Actualiza campos sueltos de un producto (precio, imagen, etc.). */
export async function updateProduct(
  id: string,
  input: Partial<ProductInput>
): Promise<Product | null> {
  ensureDb();
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return null;
  const p = await prisma.product.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      oldPrice: input.oldPrice === undefined ? undefined : input.oldPrice,
      category: input.category,
      image: input.image,
      badge: input.badge === undefined ? undefined : input.badge,
      available: input.available,
    },
  });
  return mapProduct(p);
}

// ---------- Novedades (banners de la home) ----------

/** Novedades por defecto cuando no hay base de datos (o está vacía). */
const defaultNovedades: Novedad[] = [
  { id: "nov-1", image: "/2.jpeg", title: "Día del Padre", active: true, position: 0 },
  { id: "nov-2", image: "/4.jpeg", title: "Compartí en familia", active: true, position: 1 },
];

function mapNovedad(n: {
  id: string;
  title: string | null;
  image: string;
  link: string | null;
  active: boolean;
  position: number;
}): Novedad {
  return {
    id: n.id,
    title: n.title ?? undefined,
    image: n.image,
    link: n.link ?? undefined,
    active: n.active,
    position: n.position,
  };
}

export async function listNovedades(onlyActive = false): Promise<Novedad[]> {
  if (hasDatabase) {
    const rows = await prisma.novedad.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapNovedad);
  }
  return onlyActive ? defaultNovedades.filter((n) => n.active) : defaultNovedades;
}

export interface NovedadInput {
  title?: string | null;
  image: string;
  link?: string | null;
  active?: boolean;
  position?: number;
}

export async function createNovedad(input: NovedadInput): Promise<Novedad> {
  ensureDb();
  const n = await prisma.novedad.create({
    data: {
      title: input.title ?? null,
      image: input.image,
      link: input.link ?? null,
      active: input.active ?? true,
      position: input.position ?? 0,
    },
  });
  return mapNovedad(n);
}

export async function updateNovedad(
  id: string,
  input: Partial<NovedadInput>
): Promise<Novedad | null> {
  ensureDb();
  const existing = await prisma.novedad.findUnique({ where: { id } });
  if (!existing) return null;
  const n = await prisma.novedad.update({
    where: { id },
    data: {
      title: input.title === undefined ? undefined : input.title,
      image: input.image,
      link: input.link === undefined ? undefined : input.link,
      active: input.active,
      position: input.position,
    },
  });
  return mapNovedad(n);
}

export async function deleteNovedad(id: string): Promise<boolean> {
  ensureDb();
  try {
    await prisma.novedad.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ---------- Super Oferta (banner principal de la home) ----------

/**
 * Super oferta por defecto: se muestra cuando no hay base de datos o cuando
 * todavía no se editó desde el panel. Los valores se pisan al guardar.
 */
const defaultSuperOferta: SuperOferta = {
  id: "main",
  title: "Caja de Patamuslo 10kg",
  subtitle: "Stock limitado para aprovechar hoy.",
  price: 28500,
  oldPrice: 34000,
  image: "/super-oferta-patamuslo-10kg.png",
  link: "/productos",
  active: true,
};

function mapSuperOferta(s: {
  id: string;
  title: string;
  subtitle: string | null;
  price: number;
  oldPrice: number | null;
  image: string;
  video: string | null;
  link: string | null;
  active: boolean;
}): SuperOferta {
  return {
    id: s.id,
    title: s.title,
    subtitle: s.subtitle ?? undefined,
    price: s.price,
    oldPrice: s.oldPrice ?? undefined,
    image: s.image,
    video: s.video ?? undefined,
    link: s.link ?? undefined,
    active: s.active,
  };
}

export async function getSuperOferta(): Promise<SuperOferta> {
  if (hasDatabase) {
    const row = await prisma.superOferta.findUnique({ where: { id: "main" } });
    if (row) return mapSuperOferta(row);
  }
  return defaultSuperOferta;
}

export interface SuperOfertaInput {
  title: string;
  subtitle?: string | null;
  price: number;
  oldPrice?: number | null;
  image: string;
  video?: string | null;
  link?: string | null;
  active?: boolean;
}

export async function upsertSuperOferta(input: SuperOfertaInput): Promise<SuperOferta> {
  ensureDb();
  const data = {
    title: input.title,
    subtitle: input.subtitle ?? null,
    price: input.price,
    oldPrice: input.oldPrice ?? null,
    image: input.image,
    video: input.video ?? null,
    link: input.link ?? null,
    active: input.active ?? true,
  };
  const s = await prisma.superOferta.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });
  return mapSuperOferta(s);
}

// ---------- Pedidos ----------
export interface OrderFilter {
  status?: OrderStatus;
  customerId?: string;
  limit?: number;
}

export async function listOrders(f: OrderFilter = {}): Promise<Order[]> {
  if (hasDatabase) {
    const rows = await prisma.order.findMany({
      where: { status: f.status, customerId: f.customerId },
      include: { items: true },
      orderBy: { createdAt: "desc" },
      take: f.limit,
    });
    return rows.map(mapOrder);
  }
  // Sin DB: pedidos en memoria (demo) primero, más nuevos arriba, luego mocks.
  const runtime = [...runtimeOrders.values()].sort((a, b) => b.date.localeCompare(a.date));
  let list = [...runtime, ...mockOrders];
  if (f.status) list = list.filter((o) => o.status === f.status);
  if (f.limit) list = list.slice(0, f.limit);
  return list;
}

export async function getOrder(idOrCode: string): Promise<Order | null> {
  if (hasDatabase) {
    const o = await prisma.order.findFirst({
      where: { OR: [{ code: idOrCode }, { id: idOrCode }] },
      include: { items: true },
    });
    return o ? mapOrder(o) : null;
  }
  return (
    runtimeOrders.get(idOrCode) ??
    [...runtimeOrders.values()].find((o) => o.id === idOrCode) ??
    mockOrders.find((o) => o.id === idOrCode) ??
    null
  );
}

export interface CreateOrderInput {
  customerId?: string;
  customer?: { name: string; phone: string; email?: string; document?: string };
  // name/price son opcionales: se usan como respaldo en el modo sin DB (demo).
  items: { productId: string; qty: number; name?: string; price?: number }[];
  payment: Order["payment"];
  address?: string;
  notes?: string;
  entrega?: Order["entrega"];
  sucursalId?: string;
  lat?: number;
  lng?: number;
}

/**
 * Resuelve los renglones de un pedido contra el catálogo real y calcula el
 * total en el servidor (nunca se confía en los precios del cliente).
 * La usan createOrder y el checkout de Mercado Pago (para validar el mínimo
 * de envío antes de crear nada).
 */
export async function quoteOrder(
  items: { productId: string; qty: number }[]
): Promise<{ lines: { productId: string; name: string; qty: number; price: number }[]; total: number }> {
  ensureDb();
  const ids = items.map((i) => i.productId);
  const dbProducts = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  const lines = items.map((i) => {
    const p = byId.get(i.productId);
    if (!p) throw new Error(`Producto inexistente: ${i.productId}`);
    if (!p.available) throw new Error(`Producto sin stock: ${p.name}`);
    if (i.qty <= 0) throw new Error(`Cantidad inválida para ${p.name}`);
    return { productId: p.id, name: p.name, qty: i.qty, price: p.price };
  });
  const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
  return { lines, total };
}

/** Código de entrega de 4 dígitos que el cliente le da al repartidor. */
function generateDeliveryCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Cotiza los renglones en el modo sin DB (demo). Usa el producto de ejemplo si
 * existe y, si no, el name/price que mandó el carrito. No lanza si el catálogo
 * no tiene el producto: así la demo funciona con cualquier ítem.
 */
async function quoteOrderMem(
  items: { productId: string; qty: number; name?: string; price?: number }[]
): Promise<{ lines: OrderItem[]; total: number }> {
  const lines: OrderItem[] = [];
  for (const i of items) {
    const p = await getProduct(i.productId);
    const name = p?.name ?? i.name ?? i.productId;
    const price = p?.price ?? i.price ?? 0;
    lines.push({ productId: i.productId, name, qty: i.qty, price });
  }
  const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
  return { lines, total };
}

/** Alta de pedido en memoria (demo sin base de datos). */
async function createOrderMem(input: CreateOrderInput): Promise<Order> {
  const { lines, total } = await quoteOrderMem(input.items);
  runtimeSeq.n += 1;
  const internalId = `mem-${runtimeSeq.n}`;
  const order: Order = {
    id: `#${runtimeSeq.n}`,
    internalId,
    customer: input.customer?.name ?? "Cliente",
    phone: input.customer ? normalizePhone(input.customer.phone) : undefined,
    address: input.address,
    entrega: input.entrega,
    sucursalId: input.entrega === "retiro" ? input.sucursalId : undefined,
    lat: input.entrega === "envio" ? input.lat : undefined,
    lng: input.entrega === "envio" ? input.lng : undefined,
    deliveryCode: input.entrega === "envio" ? generateDeliveryCode() : undefined,
    notes: input.notes,
    items: lines,
    total,
    status: "pendiente",
    payment: input.payment,
    date: new Date().toISOString(),
  };
  runtimeOrders.set(internalId, order);
  return order;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  if (!hasDatabase) return createOrderMem(input);

  const { lines, total } = await quoteOrder(input.items);

  // Resolver / crear cliente. El teléfono se normaliza SIEMPRE antes del
  // upsert: es la clave que asocia la compra con el cliente, y si se guarda
  // como lo tipeó la persona ("+54 379…" vs "0379 15…") el mismo cliente
  // termina duplicado y su historial de compras partido en dos.
  let customerId = input.customerId ?? null;
  let customerName = input.customer?.name ?? "Cliente";
  const phone = input.customer ? normalizePhone(input.customer.phone) : undefined;
  if (!customerId && input.customer) {
    const c = await prisma.customer.upsert({
      where: { phone: phone! },
      update: {
        name: input.customer.name,
        email: input.customer.email ?? undefined,
        document: input.customer.document ?? undefined,
      },
      create: {
        name: input.customer.name,
        phone: phone!,
        email: input.customer.email ?? null,
        document: input.customer.document ?? null,
      },
    });
    customerId = c.id;
    customerName = c.name;
  } else if (customerId) {
    const c = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!c) throw new Error(`Cliente inexistente: ${customerId}`);
    customerName = c.name;
  }

  const created = await prisma.order.create({
    data: {
      customerId,
      customerName,
      phone,
      address: input.address,
      notes: input.notes,
      entrega: input.entrega ?? null,
      sucursalId: input.sucursalId ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      // Solo los envíos llevan código de entrega (lo valida el repartidor).
      deliveryCode: input.entrega === "envio" ? generateDeliveryCode() : null,
      total,
      payment: input.payment,
      items: { create: lines },
    },
    include: { items: true },
  });

  const withCode = await prisma.order.update({
    where: { id: created.id },
    data: { code: `#${1000 + created.seq}` },
    include: { items: true },
  });

  return mapOrder(withCode);
}

/** Busca un pedido en memoria por internalId o por código (#1234). */
function findMemOrder(idOrCode: string): Order | undefined {
  return (
    runtimeOrders.get(idOrCode) ??
    [...runtimeOrders.values()].find((o) => o.id === idOrCode)
  );
}

export async function updateOrderStatus(idOrCode: string, status: OrderStatus): Promise<Order | null> {
  if (!hasDatabase) {
    const order = findMemOrder(idOrCode);
    if (!order) return null;
    const changed = order.status !== status;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    if (changed) {
      const event = eventForStatus(status);
      if (event) await notifyOrderEvent(event, order);
    }
    return order;
  }
  ensureDb();
  const existing = await prisma.order.findFirst({
    where: { OR: [{ code: idOrCode }, { id: idOrCode }] },
  });
  if (!existing) return null;
  const updated = await prisma.order.update({
    where: { id: existing.id },
    data: { status },
    include: { items: true },
  });
  const order = mapOrder(updated);

  // Avisar a n8n solo cuando el estado realmente cambió (evita duplicados
  // cuando MP reintenta webhooks o el panel guarda sin cambios).
  if (existing.status !== status) {
    const event = eventForStatus(status);
    if (event) await notifyOrderEvent(event, order);
  }

  return order;
}

/** Resultado de validar el código de entrega de un pedido. */
export type DeliveryResult =
  | { ok: true; order: Order }
  | { ok: false; reason: "not_found" | "no_code" | "invalid_code" | "already_delivered" };

/**
 * Avisa al SIGUIENTE cliente de la ruta que es el próximo. "Siguiente" es la
 * orden que sigue `en_camino` (no entregada) con menor `routeSeq`. Se llama
 * después de despachar el lote y después de confirmar cada entrega.
 */
async function notifyNextAfterDelivery(delivered: {
  originSucursalId: string | null;
}): Promise<void> {
  if (!hasDatabase) {
    const next = [...runtimeOrders.values()]
      .filter(
        (o) =>
          o.status === "en_camino" &&
          o.routeSeq != null &&
          (!delivered.originSucursalId || o.originSucursalId === delivered.originSucursalId)
      )
      .sort((a, b) => (a.routeSeq ?? 0) - (b.routeSeq ?? 0))[0];
    if (next) await notifyOrderEvent("pedido_proximo", next);
    return;
  }
  const next = await prisma.order.findFirst({
    where: {
      status: "en_camino",
      routeSeq: { not: null },
      ...(delivered.originSucursalId ? { originSucursalId: delivered.originSucursalId } : {}),
    },
    orderBy: { routeSeq: "asc" },
    include: { items: true },
  });
  if (next) await notifyOrderEvent("pedido_proximo", mapOrder(next));
}

/**
 * Confirma la entrega de un pedido validando el código que el cliente le dio
 * al repartidor. Si es correcto, el pedido pasa a "entregado" (dispara el
 * evento pedido_entregado) y se avisa al siguiente cliente de la ruta.
 */
export async function confirmDelivery(idOrCode: string, code: string): Promise<DeliveryResult> {
  if (!hasDatabase) {
    const existing = findMemOrder(idOrCode);
    if (!existing) return { ok: false, reason: "not_found" };
    if (existing.status === "entregado") return { ok: false, reason: "already_delivered" };
    if (!existing.deliveryCode) return { ok: false, reason: "no_code" };
    if (existing.deliveryCode !== code.trim()) return { ok: false, reason: "invalid_code" };
    const order = await updateOrderStatus(existing.internalId ?? existing.id, "entregado");
    if (!order) return { ok: false, reason: "not_found" };
    await notifyNextAfterDelivery({ originSucursalId: existing.originSucursalId ?? null });
    return { ok: true, order };
  }
  ensureDb();
  const existing = await prisma.order.findFirst({
    where: { OR: [{ code: idOrCode }, { id: idOrCode }] },
    include: { items: true },
  });
  if (!existing) return { ok: false, reason: "not_found" };
  if (existing.status === "entregado") return { ok: false, reason: "already_delivered" };
  if (!existing.deliveryCode) return { ok: false, reason: "no_code" };
  if (existing.deliveryCode !== code.trim()) return { ok: false, reason: "invalid_code" };

  const order = await updateOrderStatus(existing.id, "entregado");
  if (!order) return { ok: false, reason: "not_found" };
  await notifyNextAfterDelivery(existing);
  return { ok: true, order };
}

/**
 * Variante para el repartidor: confirma la entrega ingresando SÓLO el código
 * del cliente (sin saber qué pedido es). Busca entre los pedidos `en_camino`
 * el que tenga ese código y lo marca entregado. Así el repartidor puede
 * recorrer en el orden que quiera y cargar "el código de cualquiera".
 * Si hay más de uno con el mismo código (raro, son 4 dígitos), toma el de
 * menor `routeSeq`.
 */
export async function confirmDeliveryByCode(code: string): Promise<DeliveryResult> {
  const trimmed = code.trim();
  if (!hasDatabase) {
    const all = [...runtimeOrders.values()];
    const match = all
      .filter((o) => o.status === "en_camino" && o.deliveryCode === trimmed)
      .sort((a, b) => (a.routeSeq ?? 0) - (b.routeSeq ?? 0))[0];
    if (!match) {
      const already = all.some((o) => o.status === "entregado" && o.deliveryCode === trimmed);
      return { ok: false, reason: already ? "already_delivered" : "invalid_code" };
    }
    const order = await updateOrderStatus(match.internalId ?? match.id, "entregado");
    if (!order) return { ok: false, reason: "not_found" };
    await notifyNextAfterDelivery({ originSucursalId: match.originSucursalId ?? null });
    return { ok: true, order };
  }
  ensureDb();
  const match = await prisma.order.findFirst({
    where: { status: "en_camino", deliveryCode: trimmed },
    orderBy: { routeSeq: "asc" },
    include: { items: true },
  });
  if (!match) {
    const already = await prisma.order.findFirst({
      where: { status: "entregado", deliveryCode: trimmed },
      select: { id: true },
    });
    return { ok: false, reason: already ? "already_delivered" : "invalid_code" };
  }

  const order = await updateOrderStatus(match.id, "entregado");
  if (!order) return { ok: false, reason: "not_found" };
  await notifyNextAfterDelivery(match);
  return { ok: true, order };
}

/** Pedidos del reparto en curso (últimas 12 h), ordenados por la ruta. */
export async function listActiveRoute(): Promise<Order[]> {
  const cutoffMs = Date.now() - 12 * 60 * 60 * 1000;
  if (!hasDatabase) {
    return [...runtimeOrders.values()]
      .filter(
        (o) =>
          o.routeSeq != null &&
          (o.status === "en_camino" || o.status === "entregado") &&
          o.dispatchedAt != null &&
          new Date(o.dispatchedAt).getTime() >= cutoffMs
      )
      .sort((a, b) => (a.routeSeq ?? 0) - (b.routeSeq ?? 0));
  }
  const cutoff = new Date(cutoffMs);
  const rows = await prisma.order.findMany({
    where: {
      routeSeq: { not: null },
      dispatchedAt: { gte: cutoff },
      status: { in: ["en_camino", "entregado"] },
    },
    orderBy: { routeSeq: "asc" },
    include: { items: true },
  });
  return rows.map(mapOrder);
}

export interface DispatchResult {
  /** Pedidos ya despachados, en el orden de la ruta. */
  route: Order[];
  /** URL de Google Maps con la ruta optimizada (vacía si no hubo envíos). */
  mapsUrl: string;
  count: number;
}

/**
 * "Cerrar pedidos para enviar": toma todos los envíos pagados listos
 * (`en_preparacion`, con punto en el mapa), arma la ruta optimizada desde la
 * sucursal elegida y los despacha (pasan a `en_camino` con su `routeSeq`).
 * Avisa a n8n: "salió de la sucursal" a todos y "sos el próximo" al primero.
 */
export async function dispatchDeliveries(sucursalId: string): Promise<DispatchResult> {
  const sucursal = sucursales.find((s) => s.id === sucursalId);
  const origin = sucursal ? { lat: sucursal.lat, lng: sucursal.lng } : DEFAULT_ROUTE_ORIGIN;

  if (!hasDatabase) {
    const pending = [...runtimeOrders.values()].filter(
      (o) =>
        o.status === "en_preparacion" &&
        o.entrega === "envio" &&
        o.lat != null &&
        o.lng != null
    );
    if (pending.length === 0) return { route: [], mapsUrl: "", count: 0 };

    const ordered = optimizeRoute(
      origin,
      pending.map((o) => ({ order: o, lat: o.lat as number, lng: o.lng as number }))
    );
    const nowIso = new Date().toISOString();
    ordered.forEach((stop, i) => {
      stop.order.status = "en_camino";
      stop.order.routeSeq = i + 1;
      stop.order.dispatchedAt = nowIso;
      stop.order.originSucursalId = sucursalId;
    });
    const routeOrders = ordered.map((s) => s.order);
    for (const o of routeOrders) await notifyOrderEvent("pedido_en_camino", o);
    if (routeOrders[0]) await notifyOrderEvent("pedido_proximo", routeOrders[0]);
    const mapsUrl = googleMapsRouteUrl(
      origin,
      ordered.map((s) => ({ lat: s.lat, lng: s.lng }))
    );
    return { route: routeOrders, mapsUrl, count: routeOrders.length };
  }

  ensureDb();
  const pending = await prisma.order.findMany({
    where: {
      status: "en_preparacion",
      entrega: "envio",
      lat: { not: null },
      lng: { not: null },
    },
    include: { items: true },
  });
  if (pending.length === 0) return { route: [], mapsUrl: "", count: 0 };

  const stops = pending.map((o) => ({
    id: o.id,
    lat: o.lat as number,
    lng: o.lng as number,
  }));
  const ordered = optimizeRoute(origin, stops);

  const now = new Date();
  await prisma.$transaction(
    ordered.map((stop, i) =>
      prisma.order.update({
        where: { id: stop.id },
        data: {
          status: "en_camino",
          routeSeq: i + 1,
          dispatchedAt: now,
          originSucursalId: sucursalId,
        },
      })
    )
  );

  // Releemos con items para armar los avisos y la respuesta, en orden de ruta.
  const rows = await prisma.order.findMany({
    where: { id: { in: ordered.map((s) => s.id) } },
    include: { items: true },
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const routeOrders = ordered.map((s) => mapOrder(byId.get(s.id)!));

  for (const o of routeOrders) {
    await notifyOrderEvent("pedido_en_camino", o);
  }
  if (routeOrders[0]) await notifyOrderEvent("pedido_proximo", routeOrders[0]);

  const mapsUrl = googleMapsRouteUrl(
    origin,
    ordered.map((s) => ({ lat: s.lat, lng: s.lng }))
  );
  return { route: routeOrders, mapsUrl, count: routeOrders.length };
}

// ---------- Clientes ----------
export async function listCustomers(search?: string): Promise<Customer[]> {
  if (hasDatabase) {
    const rows = await prisma.customer.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
            ],
          }
        : undefined,
      include: { orders: { select: { total: true } } },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapCustomer);
  }
  let list = [
    ...runtimeCustomers.values(),
    ...mockCustomers.filter((c) => !runtimeCustomers.has(c.id)),
  ];
  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(search)
    );
  }
  return list;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  if (hasDatabase) {
    const c = await prisma.customer.findUnique({
      where: { id },
      include: { orders: { select: { total: true } } },
    });
    return c ? mapCustomer(c) : null;
  }
  return runtimeCustomers.get(id) ?? mockCustomers.find((c) => c.id === id) ?? null;
}

export async function findCustomer(by: { phone?: string; email?: string }): Promise<Customer | null> {
  // Se busca por el teléfono normalizado, que es como quedó guardado.
  const phone = by.phone ? normalizePhone(by.phone) : undefined;
  if (hasDatabase) {
    const c = await prisma.customer.findFirst({
      where: { OR: [phone ? { phone } : {}, by.email ? { email: by.email } : {}] },
      include: { orders: { select: { total: true } } },
    });
    return c ? mapCustomer(c) : null;
  }
  return (
    [...runtimeCustomers.values(), ...mockCustomers].find(
      (c) =>
        (phone && normalizePhone(c.phone) === phone) || (by.email && c.email === by.email)
    ) ?? null
  );
}

export async function createCustomer(input: {
  name: string;
  phone: string;
  email?: string;
  document?: string;
}): Promise<Customer> {
  ensureDb();
  const phone = normalizePhone(input.phone);
  const c = await prisma.customer.upsert({
    where: { phone },
    update: {
      name: input.name,
      email: input.email ?? undefined,
      document: input.document ?? undefined,
    },
    create: {
      name: input.name,
      phone,
      email: input.email ?? null,
      document: input.document ?? null,
    },
    include: { orders: { select: { total: true } } },
  });
  return mapCustomer(c);
}

/** Actualiza los datos de contacto de un cliente existente (incluye documento). */
export async function updateCustomer(
  id: string,
  input: { name?: string; email?: string | null; document?: string | null }
): Promise<Customer | null> {
  ensureDb();
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) return null;
  const c = await prisma.customer.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email === undefined ? undefined : input.email,
      document: input.document === undefined ? undefined : input.document,
    },
    include: { orders: { select: { total: true } } },
  });
  return mapCustomer(c);
}

// ---------- Club de puntos ----------
export interface PointsSummary {
  customerId: string;
  points: number;
  tier: LoyaltyTier;
  history: PointsEntry[];
}

export async function getPoints(customerId: string): Promise<PointsSummary | null> {
  if (hasDatabase) {
    const c = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { pointsLog: { orderBy: { createdAt: "desc" } } },
    });
    if (!c) return null;
    return {
      customerId: c.id,
      points: c.points,
      tier: c.tier as LoyaltyTier,
      history: c.pointsLog.map(mapPoint),
    };
  }
  const c = mockCustomers.find((x) => x.id === customerId);
  if (!c) return null;
  return {
    customerId: c.id,
    points: c.points,
    tier: c.tier,
    history: customerId === "c-1" ? mockPoints : [],
  };
}

export async function addPoints(
  customerId: string,
  entry: { points: number; label: string; type: PointsEntry["type"] }
): Promise<PointsSummary | null> {
  ensureDb();
  const c = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!c) return null;

  const newPoints = c.points + entry.points;
  if (newPoints < 0) throw new Error("Puntos insuficientes para el canje.");
  const newTier = tierForPoints(newPoints);

  await prisma.$transaction([
    prisma.pointsEntry.create({
      data: { customerId, label: entry.label, points: entry.points, type: entry.type },
    }),
    prisma.customer.update({
      where: { id: customerId },
      data: { points: newPoints, tier: newTier },
    }),
  ]);

  return getPoints(customerId);
}

/**
 * Acredita a un cliente los puntos que corresponden a un monto gastado.
 * Pensado para el panel admin: el encargado carga el monto (o productos) de
 * una compra presencial y se computan los puntos canjeables.
 */
export async function creditPurchasePoints(
  customerId: string,
  amount: number,
  label = "Compra en local"
): Promise<{ summary: PointsSummary | null; points: number; amount: number }> {
  ensureDb();
  const points = pointsForAmount(amount);
  if (points <= 0) {
    const summary = await getPoints(customerId);
    return { summary, points: 0, amount };
  }
  const summary = await addPoints(customerId, { points, label, type: "compra" });
  return { summary, points, amount };
}

// ---------- Equipo (empleados) ----------
export async function listStaff(): Promise<Staff[]> {
  if (hasDatabase) {
    const rows = await prisma.staff.findMany({
      orderBy: [{ active: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(mapStaff);
  }
  return mockStaff.slice();
}

export interface StaffInput {
  name: string;
  role: StaffRole;
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  /** contraseña en texto plano; se hashea antes de guardar. */
  password?: string | null;
  permissions?: string[];
  active?: boolean;
}

/** Se lanza cuando el nombre de usuario ya está en uso por otro integrante. */
export class UsernameTakenError extends Error {
  constructor() {
    super("Ese nombre de usuario ya está en uso.");
    this.name = "UsernameTakenError";
  }
}

function isUniqueViolation(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002");
}

export async function createStaff(input: StaffInput): Promise<Staff> {
  ensureDb();
  try {
    const s = await prisma.staff.create({
      data: {
        name: input.name,
        role: input.role,
        phone: input.phone ?? null,
        email: input.email ?? null,
        username: input.username ?? null,
        passwordHash: input.password ? hashPassword(input.password) : null,
        permissions: input.permissions ?? [],
        active: input.active ?? true,
      },
    });
    return mapStaff(s);
  } catch (e) {
    if (isUniqueViolation(e)) throw new UsernameTakenError();
    throw e;
  }
}

export async function updateStaff(
  id: string,
  input: Partial<StaffInput>
): Promise<Staff | null> {
  ensureDb();
  const existing = await prisma.staff.findUnique({ where: { id } });
  if (!existing) return null;
  try {
    const s = await prisma.staff.update({
      where: { id },
      data: {
        name: input.name,
        role: input.role,
        phone: input.phone === undefined ? undefined : input.phone,
        email: input.email === undefined ? undefined : input.email,
        username: input.username === undefined ? undefined : input.username,
        // Solo se actualiza la contraseña si se envía una nueva no vacía.
        passwordHash: input.password ? hashPassword(input.password) : undefined,
        permissions: input.permissions === undefined ? undefined : input.permissions,
        active: input.active,
      },
    });
    return mapStaff(s);
  } catch (e) {
    if (isUniqueViolation(e)) throw new UsernameTakenError();
    throw e;
  }
}

/**
 * Login de un empleado por usuario + contraseña. Devuelve el `Staff` (sin el
 * hash) si las credenciales son válidas y el integrante está activo, o `null`.
 * Sin base de datos no hay empleados con login (los mocks no tienen contraseña).
 */
export async function verifyStaffLogin(
  username: string,
  password: string
): Promise<Staff | null> {
  if (!hasDatabase) return null;
  const row = await prisma.staff.findUnique({ where: { username } });
  if (!row || !row.active || !row.passwordHash) return null;
  if (!verifyPassword(password, row.passwordHash)) return null;
  return mapStaff(row);
}

export async function deleteStaff(id: string): Promise<boolean> {
  ensureDb();
  try {
    await prisma.staff.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ---------- Estadísticas (reportes) ----------
export interface NewCustomersStats {
  total: number;
  thisMonth: number;
  lastMonth: number;
  last30Days: number;
  /** Altas por mes, de más viejo a más nuevo (últimos 6 meses). */
  byMonth: { month: string; label: string; count: number }[];
}

/** Estadísticas de altas de clientes nuevos, calculadas sobre `joinedAt`. */
export async function getNewCustomersStats(): Promise<NewCustomersStats> {
  const customers = await listCustomers();
  const now = new Date();
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const thisKey = monthKey(now);
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = monthKey(lastMonthDate);
  const cutoff30 = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  // Esqueleto de los últimos 6 meses (incluido el actual).
  const months: { month: string; label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: monthKey(d),
      label: d.toLocaleDateString("es-AR", { month: "short" }),
      count: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.month, m]));

  let thisMonth = 0;
  let lastMonth = 0;
  let last30Days = 0;
  for (const c of customers) {
    const d = new Date(c.joined);
    const key = monthKey(d);
    if (key === thisKey) thisMonth++;
    if (key === lastKey) lastMonth++;
    if (d.getTime() >= cutoff30) last30Days++;
    const bucket = byKey.get(key);
    if (bucket) bucket.count++;
  }

  return { total: customers.length, thisMonth, lastMonth, last30Days, byMonth: months };
}

/** Top de clientes por monto gastado. */
export async function getTopBuyers(limit = 10): Promise<Customer[]> {
  const customers = await listCustomers();
  return customers
    .slice()
    .sort((a, b) => b.spent - a.spent || b.orders - a.orders)
    .slice(0, limit);
}

// ---------- Login por teléfono (OTP WhatsApp) ----------

/** Almacén en memoria de OTP para cuando no hay base de datos (solo dev). */
type MemOtp = { codeHash: string; expiresAt: number; attempts: number; createdAt: number };
const memOtp = new Map<string, MemOtp>();

/**
 * Guarda (reemplaza) el código OTP de un teléfono.
 * Aplica un anti-spam: rechaza un envío nuevo si el anterior es muy reciente.
 */
export async function storeOtp(phone: string, codeHash: string, expiresAt: Date): Promise<void> {
  const now = Date.now();
  if (hasDatabase) {
    const existing = await prisma.otpCode.findUnique({ where: { phone } });
    if (existing && now - existing.createdAt.getTime() < OTP_RESEND_MS) {
      throw new Error("Acabamos de enviarte un código. Esperá unos segundos antes de pedir otro.");
    }
    await prisma.otpCode.upsert({
      where: { phone },
      update: { codeHash, expiresAt, attempts: 0, createdAt: new Date(now) },
      create: { phone, codeHash, expiresAt },
    });
    return;
  }
  const existing = memOtp.get(phone);
  if (existing && now - existing.createdAt < OTP_RESEND_MS) {
    throw new Error("Acabamos de enviarte un código. Esperá unos segundos antes de pedir otro.");
  }
  memOtp.set(phone, { codeHash, expiresAt: expiresAt.getTime(), attempts: 0, createdAt: now });
}

export type OtpResult = "ok" | "expired" | "invalid" | "locked" | "none";

/** Verifica el código de un teléfono y, si es válido, lo consume. */
export async function verifyOtp(phone: string, codeHash: string): Promise<OtpResult> {
  const now = Date.now();

  if (hasDatabase) {
    const row = await prisma.otpCode.findUnique({ where: { phone } });
    if (!row) return "none";
    if (row.expiresAt.getTime() < now) {
      await prisma.otpCode.delete({ where: { phone } });
      return "expired";
    }
    if (row.attempts >= OTP_MAX_ATTEMPTS) {
      await prisma.otpCode.delete({ where: { phone } });
      return "locked";
    }
    if (row.codeHash === codeHash) {
      await prisma.otpCode.delete({ where: { phone } });
      return "ok";
    }
    await prisma.otpCode.update({ where: { phone }, data: { attempts: { increment: 1 } } });
    return "invalid";
  }

  const row = memOtp.get(phone);
  if (!row) return "none";
  if (row.expiresAt < now) {
    memOtp.delete(phone);
    return "expired";
  }
  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    memOtp.delete(phone);
    return "locked";
  }
  if (row.codeHash === codeHash) {
    memOtp.delete(phone);
    return "ok";
  }
  row.attempts += 1;
  return "invalid";
}

export interface SessionSubject {
  id: string;
  name: string;
  phone: string;
  role: Role;
}

/**
 * Crea o recupera el cliente tras un OTP válido y devuelve el sujeto de sesión.
 * El rol se decide por `ADMIN_PHONES`: si el teléfono está en la lista, queda
 * como admin (y se persiste en la base si la hay).
 */
export async function loginByPhone(input: { phone: string; name?: string }): Promise<SessionSubject> {
  const role: Role = isAdminPhone(input.phone) ? "admin" : "cliente";

  if (hasDatabase) {
    const c = await prisma.customer.upsert({
      where: { phone: input.phone },
      update: {
        // No pisar el nombre existente con uno vacío; promover a admin si corresponde.
        ...(input.name ? { name: input.name } : {}),
        ...(role === "admin" ? { role } : {}),
      },
      create: {
        phone: input.phone,
        name: input.name?.trim() || "Cliente",
        role,
      },
    });
    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      // Un admin sigue siendo admin aunque salga de ADMIN_PHONES.
      role: c.role === "admin" || role === "admin" ? "admin" : "cliente",
    };
  }

  // Sin base de datos (dev): sujeto sintético basado en el teléfono.
  const phone = normalizePhone(input.phone);
  const mock = mockCustomers.find((c) => normalizePhone(c.phone) === phone);
  const id = mock?.id ?? runtimeCustomerId(phone);
  const existing = runtimeCustomers.get(id) ?? mock;
  const name = input.name?.trim() || existing?.name || "Cliente";
  const customer: Customer = existing
    ? { ...existing, name, phone }
    : {
        id,
        name,
        email: "",
        phone,
        orders: 0,
        spent: 0,
        points: 0,
        tier: "Bronce",
        joined: new Date().toISOString(),
      };
  runtimeCustomers.set(id, customer);

  return {
    id: customer.id,
    name: customer.name,
    phone,
    role,
  };
}
