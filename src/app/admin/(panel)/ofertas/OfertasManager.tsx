"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { setOffer } from "./actions";

export function OfertasManager({ products }: { products: Product[] }) {
  const offersCount = products.filter((p) => p.oldPrice != null).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Ofertas</h1>
        <p className="text-sm text-brand-ink/55">
          Tildá un producto para ponerlo en oferta y elegí el precio rebajado. En la tienda se
          muestra el precio normal tachado y el de oferta arriba. · {offersCount}{" "}
          {offersCount === 1 ? "producto en oferta" : "productos en oferta"}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        {products.length === 0 ? (
          <p className="p-10 text-center text-sm text-brand-ink/50">
            No hay productos disponibles para poner en oferta.
          </p>
        ) : (
          <ul className="divide-y divide-black/5">
            {products.map((p) => (
              <OfferRow key={p.id} product={p} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OfferRow({ product }: { product: Product }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isOffer = product.oldPrice != null;
  // Precio normal (lo que vale sin oferta) y precio de oferta vigente.
  const normalPrice = product.oldPrice ?? product.price;
  const currentOffer = isOffer ? product.price : "";

  const [draft, setDraft] = useState<string>(String(currentOffer));

  function apply(offerPrice: number | null) {
    setError(null);
    startTransition(async () => {
      const res = await setOffer(product.id, offerPrice);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  function onToggle(checked: boolean) {
    if (!checked) {
      setDraft("");
      apply(null);
      return;
    }
    // Al tildar, proponemos un 10% de descuento por defecto.
    const suggested = Math.max(1, Math.round((normalPrice * 0.9) / 100) * 100);
    setDraft(String(suggested));
    apply(suggested);
  }

  function onSavePrice() {
    const value = Math.round(Number(draft));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Ingresá un precio válido.");
      return;
    }
    apply(value);
  }

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
      <label className="flex flex-1 min-w-0 cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          checked={isOffer}
          disabled={pending}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-5 w-5 shrink-0 accent-brand-red"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className="h-10 w-10 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-brand-ink">{product.name}</p>
          <p className="text-sm">
            {isOffer ? (
              <>
                <span className="font-semibold text-brand-red">{formatARS(product.price)}</span>{" "}
                <span className="text-brand-ink/40 line-through">{formatARS(normalPrice)}</span>
              </>
            ) : (
              <span className="text-brand-ink/60">{formatARS(normalPrice)}</span>
            )}
          </p>
        </div>
      </label>

      <div className="flex items-center gap-2">
        {isOffer ? (
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-black/10 px-2.5 py-1.5">
              <span className="text-xs font-semibold text-brand-ink/45">$</span>
              <input
                type="number"
                min={1}
                step={1}
                value={draft}
                disabled={pending}
                onChange={(e) => setDraft(e.target.value)}
                className="w-24 bg-transparent text-sm font-semibold text-brand-ink outline-none"
                placeholder="Precio oferta"
              />
            </div>
            <button
              onClick={onSavePrice}
              disabled={pending || draft === String(currentOffer)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold",
                pending || draft === String(currentOffer)
                  ? "bg-black/5 text-brand-ink/40"
                  : "bg-brand-red text-white hover:bg-brand-red/90"
              )}
            >
              {pending ? "…" : "Guardar"}
            </button>
          </>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-brand-ink/40">
            <Tag size={14} /> Sin oferta
          </span>
        )}
      </div>

      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </li>
  );
}
