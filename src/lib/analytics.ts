import { prisma, hasDatabase } from "./prisma";
import { products as mockProducts } from "./data";

export type AnalyticsEventType = "visit" | "cart_add";

// Zona horaria del negocio: los buckets de día/hora se calculan en hora argentina,
// independientemente de la zona del servidor.
const TZ = "America/Argentina/Buenos_Aires";

interface RawEvent {
  type: AnalyticsEventType;
  productId: string | null;
  createdAt: Date;
}

// Fallback en memoria para cuando no hay DATABASE_URL (solo dev).
// Se cuelga de globalThis para sobrevivir al hot-reload de Next.
const memEvents: RawEvent[] = ((globalThis as Record<string, unknown>).__memAnalytics ??=
  []) as RawEvent[];

export async function recordEvent(input: {
  type: AnalyticsEventType;
  productId?: string | null;
  path?: string | null;
}): Promise<void> {
  if (hasDatabase) {
    await prisma.analyticsEvent.create({
      data: { type: input.type, productId: input.productId ?? null, path: input.path ?? null },
    });
    return;
  }
  memEvents.push({ type: input.type, productId: input.productId ?? null, createdAt: new Date() });
}

function dayKey(d: Date): string {
  // en-CA => YYYY-MM-DD
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

function hourOf(d: Date): number {
  return Number(d.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: TZ })) % 24;
}

export interface AnalyticsSummary {
  visitsToday: number;
  cartAddsToday: number;
  /** Visitas por día de los últimos 7 días (el último es hoy). */
  visitsByDay: { day: string; label: string; visitas: number }[];
  /** Visitas por hora (0-23) acumuladas en los últimos 7 días. */
  visitsByHour: { hour: string; visitas: number }[];
  /** Hora pico (de los últimos 7 días), null si no hay datos. */
  peakHour: number | null;
  /** Productos más agregados al carrito en los últimos 7 días. */
  topCart: { name: string; agregados: number }[];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const events: RawEvent[] = hasDatabase
    ? await prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { type: true, productId: true, createdAt: true },
      })
    : memEvents.filter((e) => e.createdAt >= since);

  const todayKey = dayKey(now);

  // Últimos 7 días (incluye hoy), en orden cronológico.
  const dayBuckets = new Map<string, number>();
  const dayLabels = new Map<string, string>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = dayKey(d);
    dayBuckets.set(key, 0);
    dayLabels.set(
      key,
      d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", timeZone: TZ })
    );
  }

  const hourBuckets = new Array<number>(24).fill(0);
  const cartCounts = new Map<string, number>();
  let visitsToday = 0;
  let cartAddsToday = 0;

  for (const e of events) {
    const key = dayKey(e.createdAt);
    if (e.type === "visit") {
      if (dayBuckets.has(key)) dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
      hourBuckets[hourOf(e.createdAt)]++;
      if (key === todayKey) visitsToday++;
    } else if (e.type === "cart_add") {
      if (e.productId) cartCounts.set(e.productId, (cartCounts.get(e.productId) ?? 0) + 1);
      if (key === todayKey) cartAddsToday++;
    }
  }

  // Resolver nombres de los productos más agregados.
  const topIds = [...cartCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  let names = new Map<string, string>();
  if (topIds.length > 0) {
    if (hasDatabase) {
      const rows = await prisma.product.findMany({
        where: { id: { in: topIds.map(([id]) => id) } },
        select: { id: true, name: true },
      });
      names = new Map(rows.map((p) => [p.id, p.name]));
    } else {
      names = new Map(mockProducts.map((p) => [p.id, p.name]));
    }
  }

  const maxHour = Math.max(...hourBuckets);

  return {
    visitsToday,
    cartAddsToday,
    visitsByDay: [...dayBuckets.entries()].map(([day, visitas]) => ({
      day,
      label: dayLabels.get(day) ?? day,
      visitas,
    })),
    visitsByHour: hourBuckets.map((visitas, h) => ({
      hour: `${String(h).padStart(2, "0")}h`,
      visitas,
    })),
    peakHour: maxHour > 0 ? hourBuckets.indexOf(maxHour) : null,
    topCart: topIds.map(([id, agregados]) => ({ name: names.get(id) ?? id, agregados })),
  };
}
