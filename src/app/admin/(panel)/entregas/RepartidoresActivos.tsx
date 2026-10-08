"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Truck } from "lucide-react";
import { RutaEnCursoClient, type RutaEnCursoProps } from "./RutaEnCursoClient";

/** Un repartidor con una o más rutas todavía en la calle. */
export interface RepartidorActivo {
  id: string;
  name: string;
  rutas: RutaEnCursoProps[];
}

interface Props {
  repartidores: RepartidorActivo[];
}

function iniciales(name: string): string {
  const partes = name.split(/\s+/).filter(Boolean).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/**
 * Repartos en curso resumidos en una tarjeta por repartidor: se ve de un vistazo
 * quién está en la calle y cómo viene, y recién al elegir una tarjeta se abre el
 * detalle de sus rutas (paradas, códigos y cierre del lote).
 */
export function RepartidoresActivos({ repartidores }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const router = useRouter();
  const pendientes = repartidores.some((r) => r.rutas.some((ruta) => ruta.stops.some((stop) =>
    ["pendiente", "enviado"].includes(stop.codeMessageStatus ?? "")
  )));
  useEffect(() => {
    if (abierto || !pendientes) return;
    const timer = setInterval(() => router.refresh(), 20000);
    return () => clearInterval(timer);
  }, [abierto, pendientes, router]);
  const avisos = repartidores.flatMap((r) => r.rutas.flatMap((ruta) => ruta.stops))
    .filter((stop) => stop.status !== "entregado" && ["fallido", "sin_verificar"].includes(stop.codeMessageStatus ?? ""));

  const enCurso = repartidores.find((r) => r.id === abierto) ?? null;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Truck size={18} className="text-violet-600" />
        <h2 className="font-semibold text-brand-ink">Repartidores con rutas activas</h2>
        <span className="chip bg-violet-100 text-violet-700">{repartidores.length}</span>
        <span className="chip bg-emerald-100 text-emerald-700">Solo activos</span>
      </div>

      {avisos.length > 0 && (
        <p role="alert" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
          {avisos.length} {avisos.length === 1 ? "pedido tiene" : "pedidos tienen"} el envío del código fallido o sin verificar. Revisá las rutas y contactá a esos clientes.
        </p>
      )}

      {repartidores.length === 0 ? (
        <p className="rounded-lg bg-brand-cream/60 px-3 py-3 text-sm text-brand-ink/50">
          No hay repartos en curso. Cerrá un lote más abajo para que salga un repartidor.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-brand-ink/60">
            Tocá un repartidor para ver sus paradas, cargar códigos de entrega y cerrar el lote.
          </p>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {repartidores.map((r) => {
              const activa = abierto === r.id;
              const avisosRepartidor = r.rutas.flatMap((ruta) => ruta.stops)
                .filter((stop) => stop.status !== "entregado" && ["fallido", "sin_verificar"].includes(stop.codeMessageStatus ?? "")).length;
              return (
                <button
                  key={r.id}
                  onClick={() => setAbierto(activa ? null : r.id)}
                  aria-expanded={activa}
                  className={`rounded-xl border p-3 text-left transition ${
                    activa
                      ? "border-violet-300 bg-violet-50/60 ring-1 ring-violet-200"
                      : "border-black/10 bg-white hover:bg-black/[0.02]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                      {iniciales(r.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-brand-ink">{r.name}</p>
                      <p className="text-xs font-semibold text-emerald-600">Activo</p>
                      {avisosRepartidor > 0 && <p className="text-xs font-bold text-amber-800">{avisosRepartidor} avisos para revisar</p>}
                    </div>
                    {activa ? (
                      <ChevronUp size={16} className="flex-none text-brand-ink/40" />
                    ) : (
                      <ChevronDown size={16} className="flex-none text-brand-ink/40" />
                    )}
                  </div>

                </button>
              );
            })}
          </div>

          {/* Detalle: solo el reparto elegido, para no llenar la pantalla */}
          {enCurso && (
            <div className="mt-4 space-y-4">
              {enCurso.rutas.map((ruta) => (
                <RutaEnCursoClient key={ruta.routeKey} {...ruta} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
