import { prisma, hasDatabase } from "./prisma";
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
  OrderStatus,
  Customer,
  LoyaltyTier,
  PointsEntry,
  Category,
  Novedad,
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
    customer: o.customerName,
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
  let list = mockOrders.slice();
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
  return mockOrders.find((o) => o.id === idOrCode) ?? null;
}

export interface CreateOrderInput {
  customerId?: string;
  customer?: { name: string; phone: string; email?: string; document?: string };
  items: { productId: string; qty: number }[];
  payment: Order["payment"];
  address?: string;
  notes?: string;
}

export async function createOrder(input: CreateOrderInput): Promise<Order> {
  ensureDb();

  // Resolver productos reales y calcular total en el servidor (no confiar en el cliente).
  const ids = input.items.map((i) => i.productId);
  const dbProducts = await prisma.product.findMany({ where: { id: { in: ids } } });
  const byId = new Map(dbProducts.map((p) => [p.id, p]));

  const lines = input.items.map((i) => {
    const p = byId.get(i.productId);
    if (!p) throw new Error(`Producto inexistente: ${i.productId}`);
    if (!p.available) throw new Error(`Producto sin stock: ${p.name}`);
    if (i.qty <= 0) throw new Error(`Cantidad inválida para ${p.name}`);
    return { productId: p.id, name: p.name, qty: i.qty, price: p.price };
  });
  const total = lines.reduce((a, l) => a + l.qty * l.price, 0);

  // Resolver / crear cliente.
  let customerId = input.customerId ?? null;
  let customerName = input.customer?.name ?? "Cliente";
  if (!customerId && input.customer) {
    const c = await prisma.customer.upsert({
      where: { phone: input.customer.phone },
      update: {
        name: input.customer.name,
        email: input.customer.email ?? undefined,
        document: input.customer.document ?? undefined,
      },
      create: {
        name: input.customer.name,
        phone: input.customer.phone,
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
      phone: input.customer?.phone,
      address: input.address,
      notes: input.notes,
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

export async function updateOrderStatus(idOrCode: string, status: OrderStatus): Promise<Order | null> {
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
  return mapOrder(updated);
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
  let list = mockCustomers.slice();
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
  return mockCustomers.find((c) => c.id === id) ?? null;
}

export async function findCustomer(by: { phone?: string; email?: string }): Promise<Customer | null> {
  if (hasDatabase) {
    const c = await prisma.customer.findFirst({
      where: { OR: [by.phone ? { phone: by.phone } : {}, by.email ? { email: by.email } : {}] },
      include: { orders: { select: { total: true } } },
    });
    return c ? mapCustomer(c) : null;
  }
  return (
    mockCustomers.find(
      (c) => (by.phone && c.phone === by.phone) || (by.email && c.email === by.email)
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
  const c = await prisma.customer.upsert({
    where: { phone: input.phone },
    update: {
      name: input.name,
      email: input.email ?? undefined,
      document: input.document ?? undefined,
    },
    create: {
      name: input.name,
      phone: input.phone,
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
  const mock = mockCustomers.find((c) => c.phone === input.phone);
  return {
    id: mock?.id ?? `guest-${input.phone}`,
    name: input.name?.trim() || mock?.name || "Cliente",
    phone: input.phone,
    role,
  };
}
