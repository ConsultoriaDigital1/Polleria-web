import { listProducts } from "@/lib/repo";
import { ProductCatalog } from "@/components/store/ProductCatalog";

export const dynamic = "force-dynamic";

export default async function ProductosPage() {
  const products = await listProducts();

  return (
    <div className="space-y-4 px-4 pt-4 md:px-6 md:pt-8">
      <h1 className="text-lg font-bold text-brand-ink md:text-3xl">Nuestros Productos</h1>
      <ProductCatalog products={products} />
    </div>
  );
}
