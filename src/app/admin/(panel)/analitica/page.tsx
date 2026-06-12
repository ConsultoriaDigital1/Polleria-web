import { Eye, ShoppingCart, Clock, TrendingUp } from "lucide-react";
import { getAnalyticsSummary } from "@/lib/analytics";
import {
  VisitsAreaChart,
  HourlyBarChart,
  TopCartChart,
} from "@/components/admin/AnalyticsCharts";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const s = await getAnalyticsSummary();

  const visits7d = s.visitsByDay.reduce((a, d) => a + d.visitas, 0);
  const stats = [
    { label: "Visitas hoy", value: s.visitsToday.toLocaleString("es-AR"), icon: Eye },
    { label: "Visitas (últimos 7 días)", value: visits7d.toLocaleString("es-AR"), icon: TrendingUp },
    {
      label: "Hora pico",
      value: s.peakHour === null ? "—" : `${String(s.peakHour).padStart(2, "0")}:00`,
      icon: Clock,
    },
    { label: "Agregados al carrito hoy", value: s.cartAddsToday.toLocaleString("es-AR"), icon: ShoppingCart },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Analítica</h1>
        <p className="text-sm text-brand-ink/55">
          Visitas a la tienda y actividad del carrito · últimos 7 días
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((st) => (
          <div key={st.label} className="rounded-2xl bg-white p-4 shadow-soft">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
              <st.icon size={20} />
            </span>
            <p className="mt-3 text-2xl font-bold text-brand-ink">{st.value}</p>
            <p className="text-sm text-brand-ink/55">{st.label}</p>
          </div>
        ))}
      </div>

      {/* Visitas por día + por hora */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <h2 className="mb-2 font-semibold text-brand-ink">Visitas · últimos 7 días</h2>
          <VisitsAreaChart data={s.visitsByDay} />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-brand-ink">Visitas por hora</h2>
            {s.peakHour !== null && (
              <span className="rounded-full bg-brand-red/10 px-2.5 py-1 text-xs font-semibold text-brand-red">
                Pico: {String(s.peakHour).padStart(2, "0")}:00
              </span>
            )}
          </div>
          <HourlyBarChart data={s.visitsByHour} peakHour={s.peakHour} />
        </div>
      </div>

      {/* Top carrito */}
      <div className="rounded-2xl bg-white p-4 shadow-soft">
        <h2 className="mb-2 font-semibold text-brand-ink">
          Productos más agregados al carrito
        </h2>
        {s.topCart.length > 0 ? (
          <TopCartChart data={s.topCart} />
        ) : (
          <p className="py-10 text-center text-sm text-brand-ink/50">
            Todavía no hay actividad de carrito registrada. Los datos aparecen a medida que los
            clientes usan la tienda.
          </p>
        )}
      </div>
    </div>
  );
}
