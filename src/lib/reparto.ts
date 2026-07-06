import "server-only";

/**
 * Acceso del repartidor: la página móvil `/reparto` se abre con un token en la
 * URL (`?token=...`) que se comparte por WhatsApp. El token vive en la variable
 * de entorno `REPARTO_TOKEN`. Si no está configurada, el acceso queda abierto
 * (útil en desarrollo local).
 */

export function repartoToken(): string | null {
  const t = process.env.REPARTO_TOKEN?.trim();
  return t ? t : null;
}

/** ¿El token recibido habilita el acceso del repartidor? */
export function isValidRepartoToken(provided: string | null | undefined): boolean {
  const expected = repartoToken();
  if (!expected) return true; // sin token configurado: acceso abierto (dev)
  return typeof provided === "string" && provided === expected;
}

/** Ruta relativa para el repartidor, con el token si está configurado. */
export function repartoPath(): string {
  const t = repartoToken();
  return t ? `/reparto?token=${encodeURIComponent(t)}` : "/reparto";
}
