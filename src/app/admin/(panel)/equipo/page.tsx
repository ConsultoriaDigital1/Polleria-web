import { listStaff } from "@/lib/repo";
import { EquipoManager } from "./EquipoManager";

export const dynamic = "force-dynamic";

export default async function EquipoPage() {
  const team = await listStaff();
  return <EquipoManager team={team} />;
}
