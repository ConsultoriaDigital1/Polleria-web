import { requirePerm } from "@/lib/auth/permissions";
import { ThemeSettings } from "./ThemeSettings";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requirePerm("config");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Configuración</h1>
        <p className="text-sm text-brand-ink/55">Apariencia del panel</p>
      </div>
      <ThemeSettings />
    </div>
  );
}
