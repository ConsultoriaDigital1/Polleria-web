"use client";

import { useActionState, useEffect, useState } from "react";
import { Star, Pencil, Plus, X } from "lucide-react";
import type { Customer } from "@/lib/types";
import { formatARS, formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";
import { saveCustomer, type SaveCustomerState } from "./actions";

const tierColors: Record<string, string> = {
  Bronce: "bg-orange-100 text-orange-700",
  Plata: "bg-slate-200 text-slate-700",
  Oro: "bg-amber-100 text-amber-700",
  Diamante: "bg-cyan-100 text-cyan-700",
};

export function ClientesManager({ customers }: { customers: Customer[] }) {
  // null = cerrado, undefined = crear nuevo, Customer = editar
  const [editing, setEditing] = useState<Customer | undefined | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Clientes</h1>
          <p className="text-sm text-brand-ink/55">{customers.length} clientes registrados</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing(undefined)}>
          <Plus size={16} /> Agregar cliente
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream text-left text-xs uppercase tracking-wide text-brand-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Documento</th>
                <th className="px-4 py-3 font-semibold">Pedidos</th>
                <th className="px-4 py-3 font-semibold">Gastado</th>
                <th className="px-4 py-3 font-semibold">Puntos</th>
                <th className="px-4 py-3 font-semibold">Nivel</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-black/5 hover:bg-brand-cream/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-sm font-bold text-white">
                        {c.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-brand-ink">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-ink/60">
                    <p>{c.email || "—"}</p>
                    <p className="text-xs">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-brand-ink/70">{c.document || "—"}</td>
                  <td className="px-4 py-3 text-brand-ink/80">{c.orders}</td>
                  <td className="px-4 py-3 font-medium text-brand-ink">{formatARS(c.spent)}</td>
                  <td className="px-4 py-3 font-medium text-brand-ink">{formatPoints(c.points)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("chip", tierColors[c.tier])}>
                      <Star size={12} className="fill-current" /> {c.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(c)}
                      className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-brand-ink/70 hover:bg-black/5"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-brand-ink/50">
                    Todavía no hay clientes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && <CustomerModal customer={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function CustomerModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<SaveCustomerState, FormData>(saveCustomer, {});

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-ink">
            {customer ? "Editar cliente" : "Nuevo cliente"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-brand-ink/50 hover:bg-black/5">
            <X size={18} />
          </button>
        </div>

        <form action={formAction} className="space-y-4 text-sm">
          {customer && <input type="hidden" name="id" value={customer.id} />}

          <Field label="Nombre">
            <input name="name" defaultValue={customer?.name} required className="input-admin" />
          </Field>

          <Field label={customer ? "Teléfono (no editable)" : "Teléfono"}>
            <input
              name="phone"
              defaultValue={customer?.phone}
              required={!customer}
              disabled={!!customer}
              className="input-admin disabled:bg-black/5 disabled:text-brand-ink/50"
            />
          </Field>

          <Field label="Correo (opcional)">
            <input name="email" type="email" defaultValue={customer?.email} className="input-admin" />
          </Field>

          <Field label="Documento (DNI/CUIT, opcional)">
            <input name="document" defaultValue={customer?.document} className="input-admin" />
          </Field>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{state.error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-black/10 px-4 py-2 font-semibold text-brand-ink/70 hover:bg-black/5"
            >
              Cancelar
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold text-brand-ink">{label}</span>
      {children}
    </label>
  );
}
