import Link from "next/link";
import { Store } from "lucide-react";
import { formatARS, formatDateTime } from "@/lib/format";
import { listOrders, listActiveRoute, listRouteHistory, listStaff } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { sucursales } from "@/lib/sucursales";
import { googleMapsPointUrl, googleMapsRouteUrl, DEFAULT_ROUTE_ORIGIN } from "@/lib/route";
import type { Order } from "@/lib/types";
import { EntregasClient, type EnvioPendiente } from "./EntregasClient";
import { RutaEnCursoClient, type RutaStop } from "./RutaEnCursoClient";
import { HistorialRutas } from "./HistorialRutas";

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

  const [listos, ruta, historial, equipo] = await Promise.all([
    listOrders({ status: "en_preparacion" }),
    listActiveRoute(),
    listRouteHistory(),
    listStaff(),
  ]);
  const repartidores = equipo
    .filter((s) => s.role === "repartidor" && s.active)
    .map((s) => ({ id: s.id, name: s.name }));
  const staffName = (id?: string) => equipo.find((s) => s.id === id)?.name ?? null;

  const envios = listos.filter((o) => o.entrega === "envio");
  const retiros = listos.filter((o) => o.entrega === "retiro");
  const enCamino = ruta.filter((o) => o.status === "en_camino");

  const sucursalOptions = sucursales.map((s) => ({ id: s.id, name: s.name }));

  // Envíos pendientes con lo necesario para elegirlos y controlar el stock.
  const enviosPendientes: EnvioPendiente[] = envios.map((o) => ({
    id: o.internalId ?? o.id,
    code: o.id,
    customer: o.customer,
    phone: o.phone ?? null,
    address: o.address ?? null,
    date: o.date,
    total: o.total,
    items: o.items.map((i) => ({ name: i.name, qty: i.qty })),
    mapUrl: o.lat != null && o.lng != null ? googleMapsPointUrl({ lat: o.lat, lng: o.lng }) : null,
  }));

  // Cada cierre es un bloque independiente, incluso si sale el mismo repartidor.
  const routeKey = (o: Order) =>
    o.routeBatchId ?? `legacy:${o.repartidorId ?? "sin-asignar"}:${o.dispatchedAt ?? ""}`;
  const rutaActivas = [...new Set(ruta.map(routeKey))].map((key) => {
    const pedidos = ruta.filter((o) => routeKey(o) === key);
    const originSucursal = sucursales.find((s) => s.id === pedidos[0]?.originSucursalId);
    const routePoints = pedidos
      .filter((o) => o.lat != null && o.lng != null)
      .map((o) => ({ lat: o.lat as number, lng: o.lng as number }));
    const stops: RutaStop[] = pedidos.map((o) => ({
      id: o.internalId ?? o.id,
      code: o.id,
      routeSeq: o.routeSeq ?? null,
      customer: o.customer,
      phone: o.phone ?? null,
      address: o.address ?? null,
      deliveryCode: o.deliveryCode ?? null,
      status: o.status,
      mapUrl:
        o.lat != null && o.lng != null ? googleMapsPointUrl({ lat: o.lat, lng: o.lng }) : null,
      deliveredAt: o.status === "entregado" ? o.deliveredAt ?? o.updatedAt ?? null : null,
      repartidor: staffName(o.repartidorId),
    }));
    return {
      key,
      repartidor: staffName(pedidos[0]?.repartidorId) ?? "Sin asignar",
      dispatchedAt: pedidos[0]?.dispatchedAt ?? null,
      stops,
      originName: originSucursal?.name ?? "la sucursal",
      routeMapUrl:
        routePoints.length > 0
          ? googleMapsRouteUrl(
              originSucursal
                ? { lat: originSucursal.lat, lng: originSucursal.lng }
                : DEFAULT_ROUTE_ORIGIN,
              routePoints
            )
          : null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Entregas</h1>
        <p className="text-sm text-brand-ink/55">
          Pedidos pagados listos para entregar, separados por forma de entrega.
        </p>
      </div>

      {/* Reparto en curso: tracker en vivo con carga de códigos */}
      {rutaActivas.map((activa) => (
        <RutaEnCursoClient
          key={activa.key}
          stops={activa.stops}
          routeMapUrl={activa.routeMapUrl}
          originName={activa.originName}
          routeKey={activa.key}
          batchId={activa.key}
          repartidor={activa.repartidor}
          dispatchedAt={activa.dispatchedAt}
        />
      ))}

      <div className="flex justify-end">
        <a
          href="#historial-rutas"
          className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold text-brand-ink hover:bg-black/5"
        >
          Ver historial de rutas y pedidos
        </a>
      </div>

      {/* Cierre de pedidos: selección + control de stock + ruta optimizada */}
      <EntregasClient
        sucursales={sucursalOptions}
        repartidores={repartidores}
        envios={enviosPendientes}
        enCurso={enCamino.length}
      />

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

      <HistorialRutas
        rutas={historial}
        staffName={staffName}
        sucursalName={sucursalName}
      />
    </div>
  );
}
