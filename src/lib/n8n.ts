import type { Order, OrderStatus } from "./types";

/**
 * Avisos de pedidos hacia n8n. Cada vez que un pedido cambia de estado se
 * dispara un POST al webhook configurado en N8N_ORDER_WEBHOOK_URL con el
 * evento y el pedido completo (teléfono, dirección, punto del mapa, código
 * de entrega, etc.). Desde ese flujo n8n manda los WhatsApp al cliente:
 *
 *   pedido_confirmado → "Recibimos tu pago, estamos preparando tu pedido."
 *   pedido_en_camino  → "🛵 ¡Tu pedido salió de la sucursal!" (a todo el lote al despachar)
 *   pedido_proximo    → "¡Sos el próximo! Dale este código al repartidor: NNNN."
 *                       (al primero de la ruta al despachar, y al siguiente cada
 *                        vez que se confirma una entrega)
 *   pedido_entregado  → confirmación de entrega recibida.
 *   pedido_cancelado  → aviso de cancelación.
 *
 * Si la variable no está configurada, no se envía nada (no rompe el flujo).
 */

export type OrderEvent =
  | "pedido_creado"
  | "pedido_confirmado"
  | "pedido_en_camino"
  | "pedido_proximo"
  | "pedido_entregado"
  | "pedido_cancelado";

const DELIVERY_CANCEL_WEBHOOK_URL =
  "https://n8n.srv1224751.hstgr.cloud/webhook/pollerianoentregado";

/** Traduce un estado del pedido al evento que le avisamos a n8n. */
export function eventForStatus(status: OrderStatus): OrderEvent | null {
  switch (status) {
    case "en_preparacion":
      return "pedido_confirmado";
    case "en_camino":
      return "pedido_en_camino";
    case "entregado":
      return "pedido_entregado";
    case "cancelado":
      return "pedido_cancelado";
    default:
      return null;
  }
}

/**
 * Notifica un evento de pedido a n8n. Nunca lanza: si el webhook falla se
 * loguea y la operación original (cambio de estado, alta) sigue adelante.
 */
export async function notifyOrderEvent(event: OrderEvent, order: Order): Promise<void> {
  const url = process.env.N8N_ORDER_WEBHOOK_URL?.trim();
  if (!url) return;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret = process.env.N8N_ORDER_WEBHOOK_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        event,
        at: new Date().toISOString(),
        order,
      }),
    });
    if (!res.ok) {
      console.error(`[n8n] webhook de pedidos respondió ${res.status} para ${event} ${order.id}`);
    }
  } catch (e) {
    console.error(`[n8n] no se pudo notificar ${event} de ${order.id}:`, e);
  }
}

/** Avisa la cancelación hecha desde la pantalla del repartidor. */
export async function notifyDeliveryCancellation(order: Order): Promise<void> {
  const url =
    process.env.N8N_DELIVERY_CANCEL_WEBHOOK_URL?.trim() || DELIVERY_CANCEL_WEBHOOK_URL;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const secret =
    process.env.N8N_DELIVERY_CANCEL_WEBHOOK_SECRET?.trim() ||
    process.env.N8N_ORDER_WEBHOOK_SECRET?.trim();
  if (secret) headers.Authorization = `Bearer ${secret}`;

  const message = `El pedido ${order.id} fue cancelado por el repartidor.`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      body: JSON.stringify({
        event: "pedido_cancelado",
        message,
        mensaje: message,
        at: new Date().toISOString(),
        order,
      }),
    });
    if (!res.ok) {
      console.error(`[n8n] webhook de cancelación respondió ${res.status} para ${order.id}`);
    }
  } catch (e) {
    console.error(`[n8n] no se pudo notificar la cancelación de ${order.id}:`, e);
  }
}
