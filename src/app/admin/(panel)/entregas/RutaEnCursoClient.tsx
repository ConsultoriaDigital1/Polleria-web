"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Truck,
} from "lucide-react";
import { confirmarEntrega, type ConfirmarEntregaState } from "./actions";

export interface RutaStop {
  id: string;
  code: string;
  routeSeq: number | null;
  customer: string;
  phone: string | null;
  address: string | null;
  deliveryCode: string | null;
  status: string;
  mapUrl: string | null;
  deliveredAt: string | null;
}

interface Props {
  stops: RutaStop[];
  routeMapUrl: string | null;
  originName: string;
}

function horaCorta(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

export function RutaEnCursoClient({ stops, routeMapUrl, originName }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<ConfirmarEntregaState | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const total = stops.length;
  const entregados = stops.filter((s) => s.status === "entregado").length;
  const pct = total > 0 ? Math.round((entregados / total) * 100) : 0;
  const nextId = stops.find((s) => s.status === "en_camino")?.id ?? null;

  // Refresco automático para reflejar lo que confirma el repartidor.
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 15000);
    return () => clearInterval(t);
  }, [router]);

  const confirmar = () => {
    const c = code.trim();
    if (c.length < 4 || pending) return;
    setState(null);
    startTransition(async () => {
      const res = await confirmarEntrega(c);
      setState(res);
      if (res.ok) {
        setCode("");
        router.refresh();
      }
      inputRef.current?.focus();
    });
  };

  return (
    <section className="rounded-2xl border-2 border-violet-200 bg-white p-4 shadow-soft">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Truck size={18} className="text-violet-600" />
        <h2 className="font-semibold text-brand-ink">Reparto en curso</h2>
        <span className="chip bg-violet-100 text-violet-700">Sale de {originName}</span>
        <button
          onClick={() => router.refresh()}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1 text-xs font-semibold text-brand-ink/70 hover:bg-black/5"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Progreso */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="font-semibold text-brand-ink">
            {entregados} de {total} entregados
          </span>
          <span className="text-brand-ink/55">{total - entregados} en camino</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-cream">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Cargar código de entrega */}
      <div className="mb-4 rounded-xl bg-brand-cream/60 p-3">
        <label className="mb-1 block text-xs font-semibold text-brand-ink/70">
          Confirmar entrega por código
        </label>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && confirmar()}
            inputMode="numeric"
            placeholder="0000"
            className="w-32 rounded-lg border border-black/15 bg-white px-3 py-2.5 text-center text-xl font-bold tracking-[0.25em] text-brand-ink"
          />
          <button
            onClick={confirmar}
            disabled={pending || code.trim().length < 4}
            className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white transition ${
              pending || code.trim().length < 4
                ? "cursor-not-allowed bg-black/20"
                : "bg-emerald-600 hover:brightness-95"
            }`}
          >
            {pending ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {pending ? "Confirmando…" : "Marcar entregado"}
          </button>
        </div>
        {state && (
          <p
            className={`mt-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              state.ok
                ? "bg-emerald-50 text-emerald-700"
                : "bg-brand-red/10 text-brand-red"
            }`}
          >
            {state.ok ? `✅ Entregado a ${state.customer} (${state.pedido}).` : state.error}
          </p>
        )}
      </div>

      {routeMapUrl && (
        <a
          href={routeMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-2.5 text-sm font-bold text-white"
        >
          <Navigation size={15} /> Abrir ruta completa en Google Maps
        </a>
      )}

      {/* Paradas */}
      <ol className="space-y-2">
        {stops.map((s) => {
          const entregado = s.status === "entregado";
          const esProximo = s.id === nextId;
          const hora = horaCorta(s.deliveredAt);
          return (
            <li
              key={s.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                entregado
                  ? "border-emerald-100 bg-emerald-50/60"
                  : esProximo
                    ? "border-violet-300 bg-violet-50/60 ring-1 ring-violet-200"
                    : "border-black/5 bg-white"
              }`}
            >
              <span
                className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold ${
                  entregado
                    ? "bg-emerald-500 text-white"
                    : esProximo
                      ? "bg-violet-600 text-white"
                      : "bg-brand-cream text-brand-ink"
                }`}
              >
                {entregado ? <CheckCircle2 size={16} /> : (s.routeSeq ?? "–")}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold text-brand-ink">
                  {s.customer}
                  {esProximo && (
                    <span className="chip bg-violet-100 text-violet-700">Próximo</span>
                  )}
                  {entregado && hora && (
                    <span className="chip bg-emerald-100 text-emerald-700">Entregado {hora}</span>
                  )}
                </p>
                {s.address && (
                  <p className="truncate text-sm text-brand-ink/60">{s.address}</p>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-brand-ink/55">
                  <span className="font-mono font-semibold text-brand-ink/70">{s.code}</span>
                  {s.deliveryCode && !entregado && (
                    <span className="font-mono">
                      Código:{" "}
                      <b className="tracking-widest text-brand-ink">{s.deliveryCode}</b>
                    </span>
                  )}
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="inline-flex items-center gap-1 hover:text-brand-ink"
                    >
                      <Phone size={12} /> {s.phone}
                    </a>
                  )}
                </div>
              </div>

              {s.mapUrl && !entregado && (
                <a
                  href={s.mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-none rounded-lg border border-black/10 p-2 text-brand-red"
                  aria-label="Abrir en el mapa"
                >
                  <MapPin size={16} />
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
