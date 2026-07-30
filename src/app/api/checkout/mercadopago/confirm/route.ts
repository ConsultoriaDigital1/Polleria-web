import { NextRequest, NextResponse } from "next/server";
import { obtenerPago, estadoPedidoDesdePago } from "@/lib/mercadopago";
import { getOrder, updateOrderStatus } from "@/lib/repo";
import { deliverySlotLabel } from "@/lib/entrega";
import type { OrderStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Estados en los que el pago ya se dio por bueno. Si el pedido ya está acá, el
 * regreso del navegador no puede hacerlo retroceder: el webhook de Mercado Pago
 * (o el modo demo) mandan, y una back_url vieja no debe pisar esa decisión.
 */
const YA_CONFIRMADOS: OrderStatus[] = ["en_preparacion", "en_camino", "entregado"];

// Confirma el resultado del pago cuando el cliente vuelve a /checkout/resultado.
// No confiamos en el status que viene en la URL: lo verificamos consultando el
// pago real en Mercado Pago y recién ahí actualizamos el estado del pedido.
// Devuelve además los códigos del pedido para mostrárselos al cliente.
export async function POST(req: NextRequest) {
  let body: { orderId?: unknown; paymentId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const orderId = String(body.orderId ?? "").trim();
  const paymentId = String(body.paymentId ?? "").trim();

  if (!orderId) {
    return NextResponse.json({ error: "Falta orderId." }, { status: 400 });
  }

  const previo = await getOrder(orderId).catch(() => null);
  let mpStatus: string | null = null;

  if (paymentId) {
    const pago = await obtenerPago(paymentId);
    // El pago debe corresponder exactamente al pedido y al monto cotizado.
    if (
      pago &&
      previo &&
      pago.external_reference === (previo.internalId ?? orderId) &&
      pago.transaction_amount != null &&
      Number(pago.transaction_amount) === previo.total
    ) {
      mpStatus = pago.status;
    } else if (pago) {
      console.error(
        `[mercadopago:confirm] pago ${paymentId} no coincide con el pedido ${orderId}.`
      );
    }
  }

  let order = previo;

  if (previo && !YA_CONFIRMADOS.includes(previo.status)) {
    try {
      order = (await updateOrderStatus(orderId, estadoPedidoDesdePago(mpStatus))) ?? previo;
    } catch {
      // Si falla la actualización devolvemos igual lo que sabemos del pedido.
    }
  }

  return NextResponse.json({
    status: mpStatus ?? "pending",
    estado: order?.status ?? estadoPedidoDesdePago(mpStatus),
    // Códigos reales del pedido, para mostrarlos en la pantalla de resultado.
    codigo: order?.id ?? null,
    deliveryCode: order?.deliveryCode ?? null,
    franjaHoraria: deliverySlotLabel(order?.deliverySlot),
    regalo: order?.items.find((i) => i.price === 0)?.name ?? null,
  });
}
