import { UserPlus, TrendingUp, CalendarDays, Users } from "lucide-react";
import { getNewCustomersStats, getTopBuyers } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { formatARS, formatPoints } from "@/lib/format";

export const dynamic = "force-dynamic";

const tierColors: Record<string, string> = {
  Bronce: "bg-orange-100 text-orange-700",
  Plata: "bg-slate-200 text-slate-700",
  Oro: "bg-amber-100 text-amber-700",
  Diamante: "bg-cyan-100 text-cyan-700",
};

export default async function ReportesPage() {
  await requirePerm("reportes");
  const [stats, topBuyers] = await Promise.all([getNewCustomersStats(), getTopBuyers(10)]);

  const maxMonth = Math.max(1, ...stats.byMonth.map((m) => m.count));
  const delta = stats.thisMonth - stats.lastMonth;
  const cards = [
    { label: "Clientes totales", value: formatPoints(stats.total), icon: Users },
    { label: "Nuevos este mes", value: formatPoints(stats.thisMonth), icon: UserPlus },
    { label: "Últimos 30 días", value: formatPoints(stats.last30Days), icon: CalendarDays },
    {
      label: "vs. mes anterior",
      value: `${delta >= 0 ? "+" : ""}${formatPoints(delta)}`,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Reportes</h1>
        <p className="text-sm text-brand-ink/55">Estadísticas de clientes y fidelización</p>
      </div>

      {/* Tarjetas de clientes nuevos */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-4 shadow-soft">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
              <c.icon size={20} />
            </span>
            <p className="mt-3 text-2xl font-bold text-brand-ink">{c.value}</p>
            <p className="text-sm text-brand-ink/55">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Clientes nuevos por mes */}
        <div className="rounded-2xl bg-white p-5 shadow-soft lg:col-span-2">
          <h2 className="mb-4 font-semibold text-brand-ink">Clientes nuevos por mes</h2>
          <div className="flex h-48 items-end justify-between gap-3">
            {stats.byMonth.map((m) => (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold text-brand-ink/70">{m.count}</span>
                <div className="flex w-full flex-1 items-end">
                  <div
                    className="w-full rounded-t-lg bg-brand-gold transition-all"
                    style={{ height: `${(m.count / maxMonth) * 100}%`, minHeight: m.count > 0 ? 4 : 0 }}
                  />
                </div>
                <span className="text-xs capitalize text-brand-ink/55">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top de compradores */}
        <div className="rounded-2xl bg-white p-5 shadow-soft">
          <h2 className="mb-3 font-semibold text-brand-ink">Top de compradores</h2>
          <ol className="space-y-3">
            {topBuyers.map((c, i) => (
              <li key={c.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-cream text-xs font-bold text-brand-ink/70">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-brand-ink">{c.name}</p>
                  <p className="text-xs text-brand-ink/50">{c.orders} pedidos</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-brand-ink">{formatARS(c.spent)}</p>
                  <span className={`chip ${tierColors[c.tier]}`}>{c.tier}</span>
                </div>
              </li>
            ))}
            {topBuyers.length === 0 && (
              <li className="py-6 text-center text-sm text-brand-ink/50">Todavía no hay datos.</li>
            )}
          </ol>
        </div>
      </div>
    </div>
  );
}
