import { listCustomers, listProducts } from "@/lib/repo";
import { PuntosCalculator } from "./PuntosCalculator";

export const dynamic = "force-dynamic";

export default async function PuntosPage() {
  const [customers, products] = await Promise.all([
    listCustomers(),
    listProducts({ available: true }),
  ]);
  return <PuntosCalculator customers={customers} products={products} />;
}
