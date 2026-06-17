import { listCustomers, listProducts } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { PuntosCalculator } from "./PuntosCalculator";

export const dynamic = "force-dynamic";

export default async function PuntosPage() {
  await requirePerm("puntos");
  const [customers, products] = await Promise.all([
    listCustomers(),
    listProducts({ available: true }),
  ]);
  return <PuntosCalculator customers={customers} products={products} />;
}
