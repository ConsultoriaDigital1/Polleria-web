"use client";

import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/store/ProductCard";

export function PromoCarousel({ products }: { products: Product[] }) {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: true },
    [
      AutoScroll({
        speed: 1,
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        stopOnFocusIn: true,
      }),
    ]
  );

  return (
    <div ref={emblaRef} className="overflow-hidden" aria-label="Promos del día">
      <div className="-ml-3 flex touch-pan-y md:-ml-5">
        {products.map((p) => (
          <div
            key={p.id}
            className="min-w-0 shrink-0 basis-1/2 pl-3 sm:basis-1/3 md:pl-5 lg:basis-1/4"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}
