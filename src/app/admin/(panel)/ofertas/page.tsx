import { listProducts } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { OfertasManager } from "./OfertasManager";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requirePerm("ofertas");
  const products = await listProducts({ available: true });
  return <OfertasManager products={products} />;
}
