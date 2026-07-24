"use client";

import { useState } from "react";
import { Bike, ChevronDown, ChevronUp, Clock, Truck } from "lucide-react";
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

function horaSalida(rutas: RutaEnCursoProps[]): string | null {
  const iso = rutas.map((r) => r.dispatchedAt).filter(Boolean).sort().at(-1);
  if (!iso) return null;
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

/**
 * Repartos en curso resumidos en una tarjeta por repartidor: se ve de un vistazo
 * quién está en la calle y cómo viene, y recién al elegir una tarjeta se abre el
 * detalle de sus rutas (paradas, códigos y cierre del lote).
 */
export function RepartidoresActivos({ repartidores }: Props) {
  const [abierto, setAbierto] = useState<string | null>(null);

  const enCurso = repartidores.find((r) => r.id === abierto) ?? null;
  const totalPedidos = repartidores.reduce(
    (n, r) => n + r.rutas.reduce((m, ruta) => m + ruta.stops.length, 0),
    0
  );

  return (
    <section className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Truck size={18} className="text-violet-600" />
        <h2 className="font-semibold text-brand-ink">Repartidores con rutas activas</h2>
        <span className="chip bg-violet-100 text-violet-700">{repartidores.length}</span>
        {totalPedidos > 0 && (
          <span className="chip bg-brand-cream text-brand-ink/70">
            {totalPedidos} {totalPedidos === 1 ? "pedido" : "pedidos"} en la calle
          </span>
        )}
      </div>

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
              const stops = r.rutas.flatMap((ruta) => ruta.stops);
              const entregados = stops.filter((s) => s.status === "entregado").length;
              const pct = stops.length > 0 ? Math.round((entregados / stops.length) * 100) : 0;
              const completo = entregados === stops.length;
              const activa = abierto === r.id;
              const salida = horaSalida(r.rutas);
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
                    <span
                      className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-bold ${
                        completo ? "bg-emerald-500 text-white" : "bg-violet-600 text-white"
                      }`}
                    >
                      {iniciales(r.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-brand-ink">{r.name}</p>
                      <p className="flex items-center gap-2 text-xs text-brand-ink/55">
                        <span>
                          {entregados} de {stops.length} entregados
                        </span>
                        {salida && (
                          <span className="inline-flex items-center gap-1">
                            <Clock size={11} /> {salida}
                          </span>
                        )}
                      </p>
                    </div>
                    {activa ? (
                      <ChevronUp size={16} className="flex-none text-brand-ink/40" />
                    ) : (
                      <ChevronDown size={16} className="flex-none text-brand-ink/40" />
                    )}
                  </div>

                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-brand-cream">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        completo ? "bg-emerald-500" : "bg-violet-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {r.rutas.length > 1 && (
                      <span className="chip bg-brand-cream text-brand-ink/70">
                        {r.rutas.length} lotes
                      </span>
                    )}
                    {completo ? (
                      <span className="chip bg-emerald-100 text-emerald-700">Listo para cerrar</span>
                    ) : (
                      <span className="chip bg-violet-100 text-violet-700">
                        <Bike size={11} className="mr-1 inline" />
                        {stops.length - entregados} en camino
                      </span>
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
