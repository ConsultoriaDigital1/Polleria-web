"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Loader2, Truck } from "lucide-react";
import { cerrarPedidosEnvio, type CerrarPedidosState } from "./actions";

interface Props {
  sucursales: { id: string; name: string }[];
  pendientesEnvio: number;
  repartoPath: string;
  /** Envíos que ya están en camino (reparto en curso). */
  enCurso?: number;
}

export function EntregasClient({ sucursales, pendientesEnvio, repartoPath, enCurso = 0 }: Props) {
  const [sucursalId, setSucursalId] = useState(sucursales[0]?.id ?? "");
  const [state, setState] = useState<CerrarPedidosState | null>(null);
  const [pending, startTransition] = useTransition();
  const [copiado, setCopiado] = useState(false);

  const repartoUrl =
    typeof window !== "undefined" ? `${window.location.origin}${repartoPath}` : repartoPath;

  const cerrar = () => {
    if (!sucursalId || pending) return;
    setState(null);
    startTransition(async () => {
      const res = await cerrarPedidosEnvio(sucursalId);
      setState(res);
    });
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(repartoUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* clipboard no disponible */
    }
  };

  return (
    <section className="rounded-2xl bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center gap-2">
        <Truck size={18} className="text-brand-red" />
        <h2 className="font-semibold text-brand-ink">Cerrar pedidos para enviar</h2>
      </div>

      {enCurso > 0 && (
        <p className="mb-3 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">
          Hay {enCurso} {enCurso === 1 ? "envío" : "envíos"} en camino. Podés cerrar un nuevo lote
          con los envíos que se sigan pagando.
        </p>
      )}

      <p className="mb-3 text-sm text-brand-ink/60">
        Arma la ruta optimizada desde la sucursal elegida y despacha{" "}
        <b>{pendientesEnvio}</b> {pendientesEnvio === 1 ? "envío" : "envíos"} pagados. A cada
        cliente le avisamos que su pedido salió de la sucursal.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-semibold text-brand-ink/70">
            Sucursal de salida
          </span>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
          >
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={cerrar}
          disabled={pending || pendientesEnvio === 0 || !sucursalId}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-bold text-white transition ${
            pending || pendientesEnvio === 0 || !sucursalId
              ? "cursor-not-allowed bg-black/20"
              : "bg-brand-red hover:brightness-95"
          }`}
        >
          {pending && <Loader2 size={16} className="animate-spin" />}
          {pending ? "Cerrando…" : "Cerrar pedidos para enviar"}
        </button>
      </div>

      {state?.error && (
        <p className="mt-3 rounded-lg bg-brand-red/10 px-3 py-2 text-sm font-semibold text-brand-red">
          {state.error}
        </p>
      )}

      {state?.ok && (
        <div className="mt-3 space-y-2 rounded-lg bg-emerald-50 px-3 py-3 text-sm">
          <p className="font-semibold text-emerald-700">
            ✅ Despachamos {state.count} {state.count === 1 ? "envío" : "envíos"}. Ruta optimizada
            lista.
          </p>
          {state.mapsUrl && (
            <a
              href={state.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-brand-red hover:underline"
            >
              <ExternalLink size={14} /> Abrir ruta en Google Maps
            </a>
          )}
        </div>
      )}

      {/* Link para el repartidor */}
      <div className="mt-4 rounded-lg border border-dashed border-black/15 bg-brand-cream/50 px-3 py-3">
        <p className="mb-1 text-xs font-semibold text-brand-ink/70">
          Link para el repartidor (compartir por WhatsApp)
        </p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={repartoUrl}
            className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-2 py-1.5 text-xs text-brand-ink/70"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            onClick={copiarLink}
            className="inline-flex flex-none items-center gap-1 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-semibold text-brand-ink hover:bg-black/5"
          >
            {copiado ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>
    </section>
  );
}
