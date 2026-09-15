"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, ChevronDown, Loader2, MapPinned, Truck } from "lucide-react";
import { saveEnvios, type SaveEnviosState } from "./actions";
import type { DeliverySettings } from "@/lib/types";

const WEEK_DAYS = [
  { value: 0, label: "Domingo" }, { value: 1, label: "Lunes" }, { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" }, { value: 4, label: "Jueves" }, { value: 5, label: "Viernes" }, { value: 6, label: "Sábado" },
];

export function EnviosSettingsForm({ settings, originName }: { settings: DeliverySettings; originName: string }) {
  const [state, formAction, pending] = useActionState<SaveEnviosState, FormData>(saveEnvios, {});
  const [freeShippingEnabled, setFreeShippingEnabled] = useState(settings.freeShippingDays.length > 0);

  return <form action={formAction} className="space-y-5">
    <section className="rounded-2xl bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2"><Truck size={19} className="text-brand-red" /><div><h2 className="font-semibold text-brand-ink">Costo de envío</h2><p className="text-sm text-brand-ink/55">El cliente ve solo el importe final del envío, no el precio por kilómetro.</p></div></div>
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <label className="block"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-ink/55">Precio por km</span><div className="flex overflow-hidden rounded-xl border border-black/10 bg-white"><span className="flex items-center border-r border-black/10 bg-brand-cream px-3 text-sm font-bold text-brand-ink/55">$</span><input name="pricePerKm" type="number" min="0" step="1" defaultValue={settings.pricePerKm} className="min-w-0 flex-1 px-3 py-2.5 text-sm font-semibold text-brand-ink outline-none" /></div></label>
        <div className="rounded-xl border border-black/10 bg-brand-cream/50 p-3"><div className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-ink"><MapPinned size={16} className="text-brand-red" />Sucursal fija de salida</div><p className="text-sm text-brand-ink/70">{originName}</p><p className="mt-1 text-xs text-brand-ink/45">Por ahora todos los costos se calculan desde esta sucursal.</p></div>
      </div>
    </section>
    <section className="rounded-2xl bg-white p-5 shadow-soft">
      <h2 className="mb-3 font-semibold text-brand-ink">Bonificaciones</h2>
      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-xl border border-black/10 bg-brand-cream/40 p-3"><input name="freeAllSlots" type="checkbox" defaultChecked={settings.freeAllSlots} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-red" /><span><span className="block text-sm font-bold text-brand-ink">Envío gratis todos los horarios</span><span className="text-xs text-brand-ink/55">Fuerza costo $0 para cualquier entrega.</span></span></label>
        <div className="rounded-xl border border-black/10 bg-brand-cream/40 p-3">
          <label className="flex cursor-pointer items-start gap-3"><input name="freeShippingDaysEnabled" type="checkbox" checked={freeShippingEnabled} onChange={(event) => setFreeShippingEnabled(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-red" /><span><span className="block text-sm font-bold text-brand-ink">Envío gratis por día</span><span className="text-xs text-brand-ink/55">Elegí uno o más días de la semana para activar la bonificación.</span></span></label>
          {freeShippingEnabled && <div className="mt-3 border-t border-black/10 pt-3"><label className="block"><span className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-brand-ink/55">Días con envío gratis <ChevronDown size={14} /></span><select name="freeShippingDays" multiple size={7} defaultValue={settings.freeShippingDays.map(String)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-medium text-brand-ink outline-none focus:border-brand-red">{WEEK_DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}</select></label><p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs leading-5 text-brand-ink/65">La bonificación se aplica si el reparto está programado para uno de estos días o si la compra se realiza en uno de ellos. Por ejemplo, una compra hecha el sábado conserva el envío gratis aunque se entregue el domingo.</p></div>}
        </div>
      </div>
    </section>
    {state.error && <p className="rounded-lg bg-brand-red/10 px-3 py-2 text-sm font-semibold text-brand-red">{state.error}</p>}
    {state.ok && <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700"><CheckCircle2 size={16} /> Configuración guardada.</p>}
    <button type="submit" disabled={pending} className="btn-primary">{pending ? <Loader2 size={16} className="animate-spin" /> : null}{pending ? "Guardando..." : "Guardar configuración"}</button>
  </form>;
}