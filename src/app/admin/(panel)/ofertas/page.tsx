import { listProducts, getSuperOferta } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { OfertasManager } from "./OfertasManager";
import { SuperOfertaEditor } from "./SuperOfertaEditor";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requirePerm("ofertas");
  const [products, superOferta] = await Promise.all([
    listProducts({ available: true }),
    getSuperOferta(),
  ]);
  return (
    <div className="space-y-8">
      <SuperOfertaEditor oferta={superOferta} />
      <OfertasManager products={products} />
    </div>
  );
}
