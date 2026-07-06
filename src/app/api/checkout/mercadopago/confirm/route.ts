import { NextRequest, NextResponse } from "next/server";
import { obtenerPago, estadoPedidoDesdePago } from "@/lib/mercadopago";
import { updateOrderStatus } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Confirma el resultado del pago cuando el cliente vuelve a /checkout/resultado.
// No confiamos en el status que viene en la URL: lo verificamos consultando el
// pago real en Mercado Pago y recién ahí actualizamos el estado del pedido.
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

  let mpStatus: string | null = null;

  if (paymentId) {
    const pago = await obtenerPago(paymentId);
    // El pago debe corresponder a este pedido (anti-spoofing básico).
    if (pago && (!pago.external_reference || pago.external_reference === orderId)) {
      mpStatus = pago.status;
    }
  }

  const nuevoEstado = estadoPedidoDesdePago(mpStatus);
  try {
    await updateOrderStatus(orderId, nuevoEstado);
  } catch {
    // Si el pedido no existe ya no hay nada que actualizar; devolvemos igual.
  }

  return NextResponse.json({ status: mpStatus ?? "pending", estado: nuevoEstado });
}
