/**
 * Reglas y textos de la entrega a domicilio (única modalidad: no hay retiro
 * por sucursal). Centralizado acá para que el carrito, el checkout, el panel
 * y las etiquetas usen exactamente los mismos rangos y las mismas leyendas.
 */

/** Rangos horarios en los que se puede recibir el pedido. */
export const DELIVERY_SLOTS = [
  { id: "08-12", label: "08:00 a 12:00", detalle: "Mañana", cutoffMinutes: 16 * 60 },
  { id: "17-20", label: "17:00 a 20:00", detalle: "Tarde", cutoffMinutes: 23 * 60 + 30 },
] as const;

export type DeliverySlotId = (typeof DELIVERY_SLOTS)[number]["id"];

/** ¿El valor recibido es uno de los rangos válidos? */
export function isDeliverySlot(value: unknown): value is DeliverySlotId {
  return DELIVERY_SLOTS.some((s) => s.id === value);
}

/** Etiqueta legible de un rango ("08:00 a 12:00"), o null si no es válido. */
export function deliverySlotLabel(id?: string | null): string | null {
  return DELIVERY_SLOTS.find((s) => s.id === id)?.label ?? null;
}

export const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";

export interface EstimatedDeliveryOption {
  id: DeliverySlotId;
  /** Fecha calendario de Argentina, en formato YYYY-MM-DD. */
  date: string;
  /** Ejemplo: "Viernes 1/8 · 8:00–12:00". */
  label: string;
}

interface ArgentinaDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function argentinaDateTime(now: Date): ArgentinaDateTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function isBusinessDay(date: Date): boolean {
  const weekday = date.getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

function nextBusinessDay(date: Date): Date {
  const next = new Date(date);
  do next.setUTCDate(next.getUTCDate() + 1);
  while (!isBusinessDay(next));
  return next;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Etiqueta de una fecha YYYY-MM-DD sin depender de la zona horaria del equipo. */
export function deliveryDateLabel(date?: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || dateOnly(parsed) !== date) return null;
  const weekday = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    timeZone: "UTC",
  }).format(parsed);
  const capitalized = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${capitalized} ${parsed.getUTCDate()}/${parsed.getUTCMonth() + 1}`;
}

/** Fecha y franja completas; en pedidos anteriores, conserva al menos la franja. */
export function deliveryEstimateLabel(
  slotId?: string | null,
  date?: string | null
): string | null {
  const slot = DELIVERY_SLOTS.find((item) => item.id === slotId);
  const dateLabel = deliveryDateLabel(date);
  if (!slot) return null;
  if (!dateLabel) return slot.label;
  return `${dateLabel} · ${slot.label.replace(/^0/, "").replace(" a ", "–")}`;
}

/**
 * Calcula las próximas entregas usando siempre hora Argentina.
 *
 * - Mañana: el próximo día hábil hasta las 16:00.
 * - Tarde: el próximo día hábil hasta las 23:30.
 * - Al alcanzar el corte, esa franja pasa al día hábil siguiente.
 * - Los pedidos hechos durante el fin de semana quedan para el lunes.
 */
export function estimatedDeliveryOptions(now = new Date()): EstimatedDeliveryOption[] {
  const local = argentinaDateTime(now);
  const today = new Date(Date.UTC(local.year, local.month - 1, local.day));
  const minutes = local.hour * 60 + local.minute;

  return DELIVERY_SLOTS.map((slot) => {
    let target = nextBusinessDay(today);
    if (isBusinessDay(today) && minutes >= slot.cutoffMinutes) {
      target = nextBusinessDay(target);
    }
    const date = dateOnly(target);
    return {
      id: slot.id,
      date,
      label: deliveryEstimateLabel(slot.id, date)!,
    };
  });
}

export function estimatedDeliveryOption(
  slotId: DeliverySlotId,
  now = new Date()
): EstimatedDeliveryOption {
  return estimatedDeliveryOptions(now).find((option) => option.id === slotId)!;
}

/** Aviso principal de cuándo se recibe cada compra. */
export const AVISO_TURNOS =
  "La mañana cierra a las 16:00 y la tarde a las 23:30, siempre con hora Argentina.";

/**
 * El mismo aviso separado por turno, para mostrarlo como dos reglas claras
 * (cada una con su ícono) en vez de un párrafo largo.
 */
export const AVISO_TURNOS_REGLAS = [
  {
    turno: "manana",
    compra: "Pedís hasta las 16:00",
    entrega: "podés elegir la mañana del próximo día hábil",
  },
  {
    turno: "tarde",
    compra: "Pedís hasta las 23:30",
    entrega: "podés elegir la tarde del próximo día hábil",
  },
] as const;

/** Recordatorio de cómo se debe cargar la dirección. */
export const AVISO_DIRECCION =
  "Importante: solo podemos reconocer calle y altura. No cargues piso, departamento, barrio ni referencias.";

/** Leyenda del paso del mapa. */
export const AVISO_MAPA =
  "Confirmá nuevamente que la ubicación marcada en el mapa sea la correcta: el repartidor va a ese punto exacto.";
