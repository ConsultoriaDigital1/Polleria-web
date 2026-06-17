"use client";

import { useState } from "react";
import { MapPin, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
/** Número de WhatsApp del local (formato internacional, sin signos). */
const WHATSAPP_NUMERO = "5493794525617";
import { useCart } from "@/store/cart";
import { useUI } from "@/store/ui";
import { useToast } from "@/store/toast";
import { formatARS } from "@/lib/format";
import { sucursales } from "@/lib/sucursales";

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const { lines, setQty, remove, total, clear } = useCart();
  const showToast = useToast((s) => s.show);
  const subtotal = total();
  const [sucursalId, setSucursalId] = useState("");
  const [sucursalError, setSucursalError] = useState(false);

  const enviarPedido = () => {
    if (!sucursalId) {
      setSucursalError(true);
      showToast("Seleccioná una sucursal para enviar tu pedido.");
      return;
    }
    setSucursalError(false);

    const sucursal = sucursales.find((s) => s.id === sucursalId);
    const items = lines
      .map((l) => `• ${l.qty}x ${l.product.name} — ${formatARS(l.qty * l.product.price)}`)
      .join("\n");
    const mensaje =
      `*PEDIDO DE LA WEB* 🍗\n\n` +
      `${items}\n\n` +
      `*Total:* ${formatARS(subtotal)}\n` +
      `*Sucursal de retiro:* ${sucursal?.name} (${sucursal?.address})`;

    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold text-brand-ink">
            <ShoppingBag size={20} className="text-brand-red" /> Tu pedido
          </h2>
          <button onClick={close} aria-label="Cerrar" className="rounded-lg p-1 hover:bg-black/5">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-brand-ink/50">
              <ShoppingBag size={42} className="mb-3 opacity-40" />
              <p className="font-medium">Tu carrito está vacío</p>
              <p className="text-sm">Agregá productos para empezar tu pedido.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.product.id} className="flex gap-3 rounded-xl border border-black/5 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.product.image}
                    alt={l.product.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">{l.product.name}</span>
                      <button
                        onClick={() => remove(l.product.id)}
                        className="text-brand-ink/40 hover:text-brand-red"
                        aria-label="Quitar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <span className="text-sm text-brand-ink/60">{formatARS(l.product.price)}</span>
                    <div className="mt-auto flex items-center gap-2">
                      <button
                        onClick={() => setQty(l.product.id, l.qty - 1)}
                        className="rounded-md border border-black/10 p-1 hover:bg-black/5"
                        aria-label="Restar"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                      <button
                        onClick={() => setQty(l.product.id, l.qty + 1)}
                        className="rounded-md border border-black/10 p-1 hover:bg-black/5"
                        aria-label="Sumar"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="border-t border-black/5 px-4 py-3">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-brand-ink/70">
                <span>Subtotal</span>
                <span>{formatARS(subtotal)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold text-brand-ink">
                <span>Total</span>
                <span>{formatARS(subtotal)}</span>
              </div>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-ink/70">
                <MapPin size={14} className="text-brand-red" /> Sucursal de retiro
              </span>
              <select
                value={sucursalId}
                onChange={(e) => {
                  setSucursalId(e.target.value);
                  setSucursalError(false);
                }}
                className={`w-full rounded-lg border bg-white px-3 py-2 text-sm ${
                  sucursalError ? "border-brand-red" : "border-black/10"
                }`}
              >
                <option value="">Seleccioná una sucursal…</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.address}
                  </option>
                ))}
              </select>
              {sucursalError && (
                <p className="mt-1 text-xs text-brand-red">
                  Tenés que elegir una sucursal para finalizar el pedido.
                </p>
              )}
            </label>
            <button onClick={enviarPedido} className="btn-primary mt-3 w-full">
              Enviar pedido por WhatsApp
            </button>
            <button
              onClick={clear}
              className="mt-2 w-full text-center text-xs text-brand-ink/50 hover:text-brand-red"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
