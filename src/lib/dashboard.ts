import type { Order } from "./types";
import { customers as mockCustomers, orders as mockOrders } from "./data";
import { hasDatabase, prisma } from "./prisma";

const BUSINESS_TIME_ZONE = "America/Argentina/Buenos_Aires";
const DAY_MS = 24 * 60 * 60 * 1000;

const PAYMENT_LABELS: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
  transferencia: "Transferencia",
};

export interface DashboardSummary {
  salesToday: { value: number; change: number | null };
  ordersToday: { value: number; change: number | null };
  customers: { total: number; newToday: number };
  productsSoldToday: { value: number; change: number | null };
  salesByDay: { day: string; ventas: number }[];
  paymentMethods: { name: string; value: number }[];
  topProducts: { name: string; sold: number; pct: number }[];
}

interface DashboardOrder {
  date: Date;
  total: number;
  status: string;
  payment: string;
  items: { name: string; qty: number }[];
}

function argentinaDateParts(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Inicio de un día argentino, expresado como Date UTC para consultar Prisma. */
function argentinaDayStart(offsetDays = 0): Date {
  const { year, month, day } = argentinaDateParts(new Date());
  // Buenos Aires mantiene UTC-3; 03:00 UTC es medianoche local.
  return new Date(Date.UTC(year, month - 1, day + offsetDays, 3));
}

function argentinaDayKey(date: Date): string {
  const { year, month, day } = argentinaDateParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dayLabel(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    timeZone: BUSINESS_TIME_ZONE,
  })
    .format(date)
    .replace(".", "");
}

function isSale(status: string): boolean {
  return status === "en_preparacion" || status === "en_camino" || status === "entregado";
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function buildSummary(orders: DashboardOrder[], customerTotal: number, newCustomersToday: number): DashboardSummary {
  const todayKey = argentinaDayKey(new Date());
  const yesterdayKey = argentinaDayKey(argentinaDayStart(-1));
  const dayKeys = Array.from({ length: 7 }, (_, index) => argentinaDayKey(argentinaDayStart(index - 6)));
  const salesByDay = new Map(dayKeys.map((key) => [key, 0]));
  const paymentTotals = new Map<string, number>();
  const productTotals = new Map<string, number>();

  let salesToday = 0;
  let salesYesterday = 0;
  let ordersToday = 0;
  let ordersYesterday = 0;
  let productsToday = 0;
  let productsYesterday = 0;

  for (const order of orders) {
    const key = argentinaDayKey(order.date);
    if (order.status !== "pendiente") {
      if (key === todayKey) ordersToday++;
      if (key === yesterdayKey) ordersYesterday++;
    }
    if (!isSale(order.status)) continue;

    if (key === todayKey) {
      salesToday += order.total;
      productsToday += order.items.reduce((sum, item) => sum + item.qty, 0);
    }
    if (key === yesterdayKey) {
      salesYesterday += order.total;
      productsYesterday += order.items.reduce((sum, item) => sum + item.qty, 0);
    }
    if (salesByDay.has(key)) salesByDay.set(key, (salesByDay.get(key) ?? 0) + order.total);
    paymentTotals.set(order.payment, (paymentTotals.get(order.payment) ?? 0) + order.total);
    for (const item of order.items) {
      productTotals.set(item.name, (productTotals.get(item.name) ?? 0) + item.qty);
    }
  }

  const paymentTotal = [...paymentTotals.values()].reduce((sum, value) => sum + value, 0);
  const paymentMethods = [...paymentTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([payment, value]) => ({
      name: PAYMENT_LABELS[payment] ?? payment,
      value: paymentTotal > 0 ? Math.round((value / paymentTotal) * 100) : 0,
    }));

  const topEntries = [...productTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxSold = topEntries[0]?.[1] ?? 0;

  return {
    salesToday: { value: salesToday, change: percentageChange(salesToday, salesYesterday) },
    ordersToday: { value: ordersToday, change: percentageChange(ordersToday, ordersYesterday) },
    customers: { total: customerTotal, newToday: newCustomersToday },
    productsSoldToday: {
      value: productsToday,
      change: percentageChange(productsToday, productsYesterday),
    },
    salesByDay: dayKeys.map((key, index) => ({
      day: dayLabel(new Date(argentinaDayStart(index - 6).getTime())),
      ventas: salesByDay.get(key) ?? 0,
    })),
    paymentMethods,
    topProducts: topEntries.map(([name, sold]) => ({
      name,
      sold,
      pct: maxSold > 0 ? Math.round((sold / maxSold) * 100) : 0,
    })),
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const from = argentinaDayStart(-6);
  const to = argentinaDayStart(1);
  const today = argentinaDayStart(0);
  const yesterday = argentinaDayStart(-1);

  if (hasDatabase) {
    const [orders, customerTotal, newCustomersToday] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: from, lt: to } },
        select: {
          createdAt: true,
          total: true,
          status: true,
          payment: true,
          items: { select: { name: true, qty: true } },
        },
      }),
      prisma.customer.count(),
      prisma.customer.count({ where: { joinedAt: { gte: today, lt: to } } }),
    ]);

    const rows: DashboardOrder[] = orders.map((order) => ({
      date: order.createdAt,
      total: order.total,
      status: String(order.status),
      payment: String(order.payment),
      items: order.items,
    }));
    return buildSummary(rows, customerTotal, newCustomersToday);
  }

  const rows: DashboardOrder[] = mockOrders
    .filter((order) => {
      const date = new Date(order.date).getTime();
      return date >= from.getTime() && date < to.getTime();
    })
    .map((order: Order) => ({
      date: new Date(order.date),
      total: order.total,
      status: order.status,
      payment: order.payment,
      items: order.items.map((item) => ({ name: item.name, qty: item.qty })),
    }));

  return buildSummary(rows, mockCustomers.length, 0);
}
