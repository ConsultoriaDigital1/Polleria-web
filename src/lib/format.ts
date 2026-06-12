/** Formatea un número como precio en pesos argentinos. */
export function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formatea puntos con separador de miles. */
export function formatPoints(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}

/** Fecha corta es-AR: 31/05 */
export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

/** Fecha + hora: 31/05 14:30 */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
