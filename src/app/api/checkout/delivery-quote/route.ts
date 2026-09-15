import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isInsideDeliveryLocality } from "@/lib/geo";
import { quoteDelivery } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  lat: z.number(),
  lng: z.number(),
  localidad: z.enum(["corrientes", "san-luis-del-palmar", "paso-de-la-patria"]),
  fechaEntrega: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  franjaHoraria: z.enum(["08-12", "17-20"]).optional(),
});

export async function POST(req: NextRequest) {
  let payload: unknown;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "Cuerpo invalido." }, { status: 400 }); }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Datos de envio incompletos." }, { status: 400 });
  const { lat, lng, localidad, fechaEntrega, franjaHoraria } = parsed.data;
  if (!isInsideDeliveryLocality(localidad, lat, lng)) return NextResponse.json({ error: "El punto esta fuera de la zona de envio." }, { status: 400 });
  try {
    return NextResponse.json(await quoteDelivery({ lat, lng, deliveryDate: fechaEntrega, deliverySlot: franjaHoraria }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No hay cobertura disponible." }, { status: 400 });
  }
}