import { NextRequest, NextResponse } from "next/server";
import { obtenerPago, estadoPedidoDesdePago } from "@/lib/mercadopago";
import { updateOrderStatus } from "@/lib/repo";

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

  const pago = await obtenerPago(paymentId);
  if (pago?.external_reference) {
    await updateOrderStatus(
      pago.external_reference,
      estadoPedidoDesdePago(pago.status)
    ).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    await procesar(req);
  } catch {
    // Nunca devolvemos error: MP reintentaría. Respondemos 200 siempre.
  }
  return NextResponse.json({ ok: true });
}

// MP a veces hace un GET de verificación sobre la notification_url.
export async function GET(req: NextRequest) {
  try {
    await procesar(req);
  } catch {
    // ídem POST
  }
  return NextResponse.json({ ok: true });
}
