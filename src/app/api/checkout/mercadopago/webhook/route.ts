import { NextRequest, NextResponse } from "next/server";
import { obtenerPagoEstricto, estadoPedidoDesdePago } from "@/lib/mercadopago";
import { getOrder, updateOrderStatus } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook de notificaciones de Mercado Pago (notification_url de la preferencia).
// MP avisa server-to-server cuando cambia un pago. Solo funciona si el sitio es
// público (en localhost MP no puede alcanzarlo; ahí confiamos en /confirm).
//
// MP puede mandar el id del pago de varias formas: ?type=payment&data.id=...,
// ?topic=payment&id=..., o en el body { type, data: { id } }. Cubrimos todas.
async function procesar(req: NextRequest): Promise<void> {
  const url = new URL(req.url);
  const sp = url.searchParams;

  let topic = sp.get("type") ?? sp.get("topic") ?? null;
  let paymentId = sp.get("data.id") ?? sp.get("id") ?? null;

  if (req.method === "POST") {
    const body = await req.json().catch(() => null);
    if (body && typeof body === "object") {
      if (typeof body.type === "string") topic = body.type;
      if (body.data && typeof body.data.id !== "undefined") {
        paymentId = String(body.data.id);
      }
    }
  }

  // Solo nos interesan notificaciones de pagos.
  if (topic && topic !== "payment") return;
  if (!paymentId) return;

  const pago = await obtenerPagoEstricto(paymentId);
  const orderId = pago.external_reference?.trim();
  if (!orderId) return;

  const order = await getOrder(orderId);
  if (!order) {
    console.error(`[mercadopago:webhook] pedido inexistente para el pago ${paymentId}.`);
    return;
  }
  if (
    pago.status === "approved" &&
    (pago.transaction_amount == null || Number(pago.transaction_amount) !== order.total)
  ) {
    console.error(
      `[mercadopago:webhook] monto inválido en pago ${paymentId}: esperado ${order.total}, recibido ${pago.transaction_amount}.`
    );
    return;
  }

  await updateOrderStatus(orderId, estadoPedidoDesdePago(pago.status));
  console.info(
    `[mercadopago:webhook] pago ${paymentId} (${pago.status}) aplicado a ${order.id}.`
  );
}

export async function POST(req: NextRequest) {
  try {
    await procesar(req);
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Un error temporal debe devolver 500 para que Mercado Pago reintente.
    console.error("[mercadopago:webhook] no se pudo procesar la notificación:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// MP a veces hace un GET de verificación sobre la notification_url.
export async function GET(req: NextRequest) {
  try {
    await procesar(req);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[mercadopago:webhook] falló la verificación:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
