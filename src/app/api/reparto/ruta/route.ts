import { NextRequest, NextResponse } from "next/server";
import { isValidRepartoToken } from "@/lib/reparto";
import { listActiveRoute } from "@/lib/repo";
import { googleMapsPointUrl, googleMapsRouteUrl, DEFAULT_ROUTE_ORIGIN } from "@/lib/route";
import { sucursales } from "@/lib/sucursales";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/reparto/ruta?token=...
 * Ruta del reparto en curso para la página móvil del repartidor. NO expone el
 * código de entrega (lo dice el cliente al recibir el pedido). El "próximo" es
 * el primer pedido que sigue en camino.
 */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!isValidRepartoToken(token)) {
    return NextResponse.json({ error: "Link inválido." }, { status: 401 });
  }

  const route = await listActiveRoute();
  const nextId = route.find((o) => o.status === "en_camino")?.internalId ?? null;

  const stops = route.map((o) => ({
    id: o.internalId,
    code: o.id,
    routeSeq: o.routeSeq ?? null,
    customer: o.customer,
    phone: o.phone ?? null,
    address: o.address ?? null,
    status: o.status,
    isNext: (o.internalId ?? null) === nextId,
    deliveredAt: o.status === "entregado" ? o.updatedAt ?? null : null,
    mapUrl: o.lat != null && o.lng != null ? googleMapsPointUrl({ lat: o.lat, lng: o.lng }) : null,
  }));

  // Ruta completa en Google Maps: origen = sucursal de salida del lote.
  const originId = route[0]?.originSucursalId;
  const sucursal = sucursales.find((s) => s.id === originId);
  const origin = sucursal ? { lat: sucursal.lat, lng: sucursal.lng } : DEFAULT_ROUTE_ORIGIN;
  const points = route
    .filter((o) => o.lat != null && o.lng != null)
    .map((o) => ({ lat: o.lat as number, lng: o.lng as number }));
  const routeMapUrl = points.length > 0 ? googleMapsRouteUrl(origin, points) : null;

  const pendientes = route.filter((o) => o.status === "en_camino").length;
  const entregados = route.filter((o) => o.status === "entregado").length;
  return NextResponse.json({
    stops,
    pendientes,
    entregados,
    total: route.length,
    routeMapUrl,
  });
}
