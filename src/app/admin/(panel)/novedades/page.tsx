import { listNovedades } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { NovedadesManager } from "./NovedadesManager";

export const dynamic = "force-dynamic";

export default async function AdminNovedadesPage() {
  await requirePerm("novedades");
  const novedades = await listNovedades();
  return <NovedadesManager novedades={novedades} />;
}
