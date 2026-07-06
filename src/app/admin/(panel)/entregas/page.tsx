import Link from "next/link";
import { MapPin, Store, Truck } from "lucide-react";
import { formatARS, formatDateTime } from "@/lib/format";
import { listOrders, listActiveRoute } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { repartoPath } from "@/lib/reparto";
import { sucursales } from "@/lib/sucursales";
import { googleMapsPointUrl, googleMapsRouteUrl, DEFAULT_ROUTE_ORIGIN } from "@/lib/route";
import type { Order } from "@/lib/types";
import { EntregasClient } from "./EntregasClient";
import { RutaEnCursoClient, type RutaStop } from "./RutaEnCursoClient";

export const dynamic = "force-dynamic";

function sucursalName(id?: string) {
  return sucursales.find((s) => s.id === id)?.name ?? id ?? "—";
}

function ItemsResumen({ order }: { order: Order }) {
  return (
    <span className="text-brand-ink/60">
      {order.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
    </span>
  );
}

export default async function EntregasPage() {
  await requirePerm("entregas");

  const [listos, ruta] = await Promise.all([
    listOrders({ status: "en_preparacion" }),
    listActiveRoute(),
  ]);

  const envios = listos.filter((o) => o.entrega === "envio");
  const retiros = listos.filter((o) => o.entrega === "retiro");
  const enCamino = ruta.filter((o) => o.status === "en_camino");

  const sucursalOptions = sucursales.map((s) => ({ id: s.id, name: s.name }));

  // Datos para el tracker en vivo del reparto en curso.
  const originId = ruta[0]?.originSucursalId;
  const originSucursal = sucursales.find((s) => s.id === originId);
  const originName = originSucursal?.name ?? "la sucursal";
  const routePoints = ruta
    .filter((o) => o.lat != null && o.lng != null)
    .map((o) => ({ lat: o.lat as number, lng: o.lng as number }));
  const routeMapUrl =
    routePoints.length > 0
      ? googleMapsRouteUrl(
          originSucursal ? { lat: originSucursal.lat, lng: originSucursal.lng } : DEFAULT_ROUTE_ORIGIN,
          routePoints
        )
      : null;
  const rutaStops: RutaStop[] = ruta.map((o) => ({
    id: o.internalId ?? o.id,
    code: o.id,
    routeSeq: o.routeSeq ?? null,
    customer: o.customer,
    phone: o.phone ?? null,
    address: o.address ?? null,
    deliveryCode: o.deliveryCode ?? null,
    status: o.status,
    mapUrl: o.lat != null && o.lng != null ? googleMapsPointUrl({ lat: o.lat, lng: o.lng }) : null,
    deliveredAt: o.status === "entregado" ? o.updatedAt ?? null : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Entregas</h1>
        <p className="text-sm text-brand-ink/55">
          Pedidos pagados listos para entregar, separados por forma de entrega.
        </p>
      </div>

      {/* Reparto en curso: tracker en vivo con carga de códigos */}
      {ruta.length > 0 && (
        <RutaEnCursoClient stops={rutaStops} routeMapUrl={routeMapUrl} originName={originName} />
      )}

      {/* Cierre de pedidos + ruta optimizada */}
      <EntregasClient
        sucursales={sucursalOptions}
        pendientesEnvio={envios.length}
        repartoPath={repartoPath()}
        enCurso={enCamino.length}
      />

      {/* Envíos a domicilio (pendientes de despacho) */}
      <section className="rounded-2xl bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <Truck size={18} className="text-brand-red" />
          <h2 className="font-semibold text-brand-ink">Envío a domicilio</h2>
          <span className="chip bg-blue-100 text-blue-700">{envios.length}</span>
        </div>
        {envios.length === 0 ? (
          <p className="text-sm text-brand-ink/50">No hay envíos pagados esperando despacho.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {envios.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="font-semibold text-brand-ink">{o.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brand-ink">
                    {o.customer} {o.phone && <span className="text-brand-ink/50">· {o.phone}</span>}
                  </p>
                  <p className="truncate text-brand-ink/60">{o.address}</p>
                  <ItemsResumen order={o} />
                </div>
                <span className="text-brand-ink/50">{formatDateTime(o.date)}</span>
                <span className="font-medium text-brand-ink">{formatARS(o.total)}</span>
                {o.lat != null && o.lng != null && (
                  <a
                    href={googleMapsPointUrl({ lat: o.lat, lng: o.lng })}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-red hover:underline"
                  >
                    <MapPin size={13} /> Mapa
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Retiro en sucursal */}
      <section className="rounded-2xl bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <Store size={18} className="text-brand-gold" />
          <h2 className="font-semibold text-brand-ink">Retiro en sucursal</h2>
          <span className="chip bg-amber-100 text-amber-700">{retiros.length}</span>
        </div>
        {retiros.length === 0 ? (
          <p className="text-sm text-brand-ink/50">No hay pedidos pagados para retirar.</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {retiros.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="font-semibold text-brand-ink">{o.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-brand-ink">
                    {o.customer} {o.phone && <span className="text-brand-ink/50">· {o.phone}</span>}
                  </p>
                  <p className="text-brand-ink/60">{sucursalName(o.sucursalId)}</p>
                  <ItemsResumen order={o} />
                </div>
                <span className="text-brand-ink/50">{formatDateTime(o.date)}</span>
                <span className="font-medium text-brand-ink">{formatARS(o.total)}</span>
                <Link
                  href={`/admin/pedidos`}
                  className="text-xs font-semibold text-brand-ink/50 hover:text-brand-ink"
                >
                  Ver
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
