import { listNovedades } from "@/lib/repo";
import { NovedadesManager } from "./NovedadesManager";

export const dynamic = "force-dynamic";

export default async function AdminNovedadesPage() {
  const novedades = await listNovedades();
  return <NovedadesManager novedades={novedades} />;
}
