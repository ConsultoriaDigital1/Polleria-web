import { listProducts } from "@/lib/repo";
import { ProductsManager } from "./ProductsManager";

export const dynamic = "force-dynamic";

export default async function AdminProductosPage() {
  const products = await listProducts();
  return <ProductsManager products={products} />;
}
