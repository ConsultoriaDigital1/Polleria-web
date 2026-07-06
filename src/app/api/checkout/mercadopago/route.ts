import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { crearPreferencia, mpHabilitado } from "@/lib/mercadopago";
import {
  createOrder,
  quoteOrder,
  getProduct,
  updateOrderStatus,
  NoDatabaseError,
} from "@/lib/repo";
import { hasDatabase } from "@/lib/prisma";
import { isInsideCorrientes, MIN_ENVIO_TOTAL } from "@/lib/geo";
import { sucursales } from "@/lib/sucursales";
import { formatARS } from "@/lib/format";

// Prisma + Mercado Pago necesitan el runtime Node (no Edge).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        qty: z.number().int().positive(),
        // name/price los manda el carrito; solo se usan como respaldo en el
        // modo sandbox (sin base de datos). Con DB manda el catálogo.
        name: z.string().optional(),
        price: z.number().optional(),
      })
    )
    .min(1),
  entrega: z.enum(["retiro", "envio"]),
  sucursalId: z.string().optional(),
  direccion: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  nombre: z.string().trim().min(2, "Decinos tu nombre."),
  telefono: z.string().trim().min(6, "Dejanos un WhatsApp de contacto."),
});

/**
 * Cotiza cuando no hay base de datos (modo sandbox local). Usa el producto de
 * ejemplo si existe y, si no, confía en el nombre/precio que mandó el carrito.
 * Así la prueba de Mercado Pago funciona con cualquier producto. En producción
 * SIEMPRE hay DB y se usa `quoteOrder` (precios autoritativos del catálogo).
 */
async function quoteFromMocks(
  items: { productId: string; qty: number; name?: string; price?: number }[]
) {
  const lines = [];
  for (const i of items) {
    const p = await getProduct(i.productId);
    const name = p?.name ?? i.name;
    const price = p?.price ?? i.price;
    if (!name || !Number.isFinite(price) || (price as number) <= 0) {
      throw new Error(`Datos inválidos del producto: ${i.productId}`);
    }
    lines.push({ productId: i.productId, name, qty: i.qty, price: price as number });
  }
  const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
  return { lines, total };
}

/** Deduce la URL pública del sitio para armar back_urls/notification_url. */
function baseDelSitio(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Modo demo: si `CHECKOUT_FAKE_PAYMENT` está activo, el botón de Mercado Pago
 * no redirige a MP: crea el pedido, lo marca como pagado (en_preparacion) y
 * vuelve directo a la pantalla de resultado. Sirve para recorrer todo el flujo
 * (pedido → reparto → entregado) en pruebas, sin pasar por el checkout real.
 */
function pagoSimulado(): boolean {
  const v = process.env.CHECKOUT_FAKE_PAYMENT?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

export async function POST(req: NextRequest) {
  const fake = pagoSimulado();
  if (!fake && !mpHabilitado()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado en el servidor." },
      { status: 503 }
    );
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Datos incompletos.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const body = parsed.data;

  // Validación de la entrega. Nada de esto se confía del navegador.
  let address: string | undefined;
  if (body.entrega === "retiro") {
    const sucursal = sucursales.find((s) => s.id === body.sucursalId);
    if (!sucursal) {
      return NextResponse.json(
        { error: "Elegí la sucursal donde vas a retirar el pedido." },
        { status: 400 }
      );
    }
    address = `Retiro en ${sucursal.name} (${sucursal.address})`;
  } else {
    const direccion = body.direccion?.trim() ?? "";
    if (direccion.length < 4) {
      return NextResponse.json(
        { error: "Completá la dirección de entrega." },
        { status: 400 }
      );
    }
    if (body.lat === undefined || body.lng === undefined) {
      return NextResponse.json(
        { error: "Marcá el punto de entrega en el mapa." },
        { status: 400 }
      );
    }
    if (!isInsideCorrientes(body.lat, body.lng)) {
      return NextResponse.json(
        {
          error:
            "Por el momento solo hacemos envíos dentro de la ciudad de Corrientes. Podés elegir retiro en sucursal.",
        },
        { status: 400 }
      );
    }
    address = direccion;
  }

  try {
    // Precios reales del catálogo + validación del mínimo de envío.
    // Sin base de datos (dev/sandbox) se cotiza contra los datos de ejemplo.
    const { lines, total } = hasDatabase
      ? await quoteOrder(body.items)
      : await quoteFromMocks(body.items);
    if (body.entrega === "envio" && total < MIN_ENVIO_TOTAL) {
      return NextResponse.json(
        {
          error: `El envío a domicilio es para pedidos desde ${formatARS(
            MIN_ENVIO_TOTAL
          )}. Sumá productos o elegí retiro en sucursal.`,
        },
        { status: 400 }
      );
    }

    // 1) Registramos el pedido (pendiente) vinculado al cliente. Con base de
    //    datos se persiste en Postgres; sin base (demo local) queda en memoria.
    const order = await createOrder({
      customer: { name: body.nombre, phone: body.telefono },
      items: body.items,
      payment: "mercadopago",
      address,
      entrega: body.entrega,
      sucursalId: body.entrega === "retiro" ? body.sucursalId : undefined,
      lat: body.entrega === "envio" ? body.lat : undefined,
      lng: body.entrega === "envio" ? body.lng : undefined,
      notes:
        body.entrega === "envio"
          ? `Pedido web · Mercado Pago · Envío a domicilio\nMapa: https://www.google.com/maps?q=${body.lat},${body.lng}`
          : "Pedido web · Mercado Pago · Retiro en sucursal",
    });
    const externalReference = order.internalId ?? order.id;
    const orderId = order.id;

    // Modo demo: marcamos el pago como aprobado y volvemos directo a la
    // pantalla de resultado, sin pasar por el checkout real de Mercado Pago.
    if (fake) {
      await updateOrderStatus(externalReference, "en_preparacion");
      const url = `/checkout/resultado?status=approved&external_reference=${encodeURIComponent(
        externalReference
      )}&demo=1`;
      return NextResponse.json({ url, orderId, demo: true });
    }

    // 2) Creamos la preferencia de Checkout Pro vinculada al pedido.
    const pref = await crearPreferencia({
      externalReference,
      baseUrl: baseDelSitio(req),
      items: lines.map((l) => ({
        id: l.productId,
        title: l.name,
        quantity: l.qty,
        unit_price: l.price,
      })),
    });

    const url = pref.init_point || pref.sandbox_init_point;
    if (!url) {
      return NextResponse.json(
        { error: "Mercado Pago no devolvió una URL de pago." },
        { status: 502 }
      );
    }

    return NextResponse.json({ url, orderId, preferenceId: pref.id });
  } catch (e) {
    if (e instanceof NoDatabaseError) {
      return NextResponse.json(
        { error: "El pago online no está disponible en este momento." },
        { status: 503 }
      );
    }
    const msg = e instanceof Error ? e.message : "Error desconocido.";
    return NextResponse.json(
      { error: `No pudimos iniciar el pago. ${msg}` },
      { status: 502 }
    );
  }
}
