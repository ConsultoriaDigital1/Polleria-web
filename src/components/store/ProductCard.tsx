"use client";

import { Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/format";
import { useCart } from "@/store/cart";

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
      <div className="relative aspect-[4/3] overflow-hidden bg-brand-cream">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        {product.badge && (
          <span className="chip absolute left-2 top-2 bg-brand-gold text-brand-ink shadow">
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold leading-tight text-brand-ink">{product.name}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-brand-ink/55">{product.description}</p>

        <div className="mt-2 flex items-end gap-2">
          <span className="text-base font-bold text-brand-ink">{formatARS(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xs text-brand-ink/40 line-through">
              {formatARS(product.oldPrice)}
            </span>
          )}
        </div>

        <button
          onClick={() => add(product)}
          className="btn-primary mt-3 w-full"
          aria-label={`Agregar ${product.name}`}
        >
          <Plus size={16} /> Agregar
        </button>
      </div>
    </div>
  );
}
