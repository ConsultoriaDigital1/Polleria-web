/**
 * Reglas y textos de la entrega a domicilio (única modalidad: no hay retiro
 * por sucursal). Centralizado acá para que el carrito, el checkout, el panel
 * y las etiquetas usen exactamente los mismos rangos y las mismas leyendas.
 */

/** Rangos horarios en los que se puede recibir el pedido. */
export const DELIVERY_SLOTS = [
  { id: "08-12", label: "08:00 a 12:00", detalle: "Mañana" },
  { id: "17-20", label: "17:00 a 20:00", detalle: "Tarde" },
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

/** Aviso principal de cuándo se recibe cada compra. */
export const AVISO_TURNOS =
  "Las compras realizadas por la mañana se reciben por la tarde. Las compras realizadas por la tarde se reciben por la mañana del día siguiente.";

/**
 * El mismo aviso separado por turno, para mostrarlo como dos reglas claras
 * (cada una con su ícono) en vez de un párrafo largo.
 */
export const AVISO_TURNOS_REGLAS = [
  { turno: "manana", compra: "Comprás por la mañana", entrega: "lo recibís por la tarde" },
  {
    turno: "tarde",
    compra: "Comprás por la tarde",
    entrega: "lo recibís a la mañana del día siguiente",
  },
] as const;

/** Recordatorio de cómo se debe cargar la dirección. */
export const AVISO_DIRECCION =
  "Importante: solo podemos reconocer calle y altura. No cargues piso, departamento, barrio ni referencias.";

/** Leyenda del paso del mapa. */
export const AVISO_MAPA =
  "Confirmá nuevamente que la ubicación marcada en el mapa sea la correcta: el repartidor va a ese punto exacto.";
