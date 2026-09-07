"use client";

/**
 * `crypto.randomUUID` solo existe en contexto seguro (HTTPS o localhost).
 * Si el sitio se sirve por HTTP plano (ej. entrando directo por IP:puerto,
 * sin el proxy con TLS por delante) la función no existe y llamarla tira
 * un TypeError; usamos un id igual de único para ese caso.
 */
export function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback con forma de UUID v4 (no criptográficamente seguro, pero sirve
  // como id único y pasa las validaciones de servidor que exigen ese formato,
  // como el checkoutId de /api/checkout/mercadopago).
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
