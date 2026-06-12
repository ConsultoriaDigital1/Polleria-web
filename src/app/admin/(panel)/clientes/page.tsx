import { Star } from "lucide-react";
import { listCustomers } from "@/lib/repo";
import { formatARS, formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const tierColors: Record<string, string> = {
  Bronce: "bg-orange-100 text-orange-700",
  Plata: "bg-slate-200 text-slate-700",
  Oro: "bg-amber-100 text-amber-700",
  Diamante: "bg-cyan-100 text-cyan-700",
};

export default async function ClientesPage() {
  const customers = await listCustomers();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Clientes</h1>
        <p className="text-sm text-brand-ink/55">{customers.length} clientes registrados</p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream text-left text-xs uppercase tracking-wide text-brand-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Contacto</th>
                <th className="px-4 py-3 font-semibold">Pedidos</th>
                <th className="px-4 py-3 font-semibold">Gastado</th>
                <th className="px-4 py-3 font-semibold">Puntos</th>
                <th className="px-4 py-3 font-semibold">Nivel</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-black/5 hover:bg-brand-cream/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-sm font-bold text-white">
                        {c.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-brand-ink">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-ink/60">
                    <p>{c.email}</p>
                    <p className="text-xs">{c.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-brand-ink/80">{c.orders}</td>
                  <td className="px-4 py-3 font-medium text-brand-ink">{formatARS(c.spent)}</td>
                  <td className="px-4 py-3 font-medium text-brand-ink">{formatPoints(c.points)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("chip", tierColors[c.tier])}>
                      <Star size={12} className="fill-current" /> {c.tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
