import { Tag } from "lucide-react";
import { listProducts, listOffers } from "@/lib/repo";
import { ProductCard } from "@/components/store/ProductCard";

export const dynamic = "force-dynamic";

export default async function OfertasPage() {
  const [ofertas, all] = await Promise.all([listOffers(), listProducts()]);
  const populares = all.filter((p) => p.badge === "Más vendido" || p.badge === "Promo del día");

  return (
    <div className="space-y-6 px-4 pt-4 md:px-6 md:pt-8">
      <div className="flex items-center gap-2 rounded-2xl bg-brand-red p-4 text-white shadow-soft">
        <Tag size={28} />
        <div>
          <h1 className="text-lg font-bold leading-tight">Ofertas de la semana</h1>
          <p className="text-sm text-white/80">Aprovechá los mejores precios</p>
        </div>
      </div>

      {ofertas.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-bold text-brand-ink">Promos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {ofertas.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-base font-bold text-brand-ink">Más pedidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {populares.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
