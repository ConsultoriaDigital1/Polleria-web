"use client";

import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { useUI } from "@/store/ui";
import { formatARS } from "@/lib/format";

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const { lines, setQty, remove, total, clear } = useCart();
  const subtotal = total();
  /** Monto mínimo de compra para envío a domicilio. */
  const MIN_ENVIO = 200000;
  const enviaADomicilio = subtotal >= MIN_ENVIO;

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
              <div className="flex justify-between text-brand-ink/70">
                <span>Entrega</span>
                <span>{enviaADomicilio ? "Envío a domicilio" : "Retiro en sucursal"}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold text-brand-ink">
                <span>Total</span>
                <span>{formatARS(subtotal)}</span>
              </div>
            </div>
            {!enviaADomicilio && (
              <p className="mt-2 rounded-lg bg-brand-gold/20 px-3 py-2 text-xs text-brand-ink/70">
                🛵 El envío a domicilio está disponible en pedidos desde {formatARS(MIN_ENVIO)}.
              </p>
            )}
            <button className="btn-primary mt-3 w-full">Finalizar pedido</button>
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
