"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { categories } from "@/lib/data";
import { ProductCard } from "@/components/store/ProductCard";
import { cn } from "@/lib/cn";

export function ProductCatalog({ products }: { products: Product[] }) {
  const [cat, setCat] = useState<string>("todos");
  const list = cat === "todos" ? products : products.filter((p) => p.category === cat);

  return (
    <>
      {/* Filtros de categoría */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
              cat === c.id
                ? "bg-brand-red text-white"
                : "bg-white text-brand-ink/70 hover:bg-black/5"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </>
  );
}
