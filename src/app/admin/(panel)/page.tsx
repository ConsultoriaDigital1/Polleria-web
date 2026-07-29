import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { getDashboardSummary } from "@/lib/dashboard";
import { listOrders } from "@/lib/repo";
import { formatARS, formatCantidad } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SalesChart, PaymentPie } from "@/components/admin/Charts";

export const dynamic = "force-dynamic";

function changeLabel(change: number | null): string {
  if (change === null) return "Nuevo";
  return `${change > 0 ? "+" : ""}${change}% vs. ayer`;
}

function changeTone(change: number | null): "up" | "down" | "flat" {
  if (change === null || change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

export default async function AdminDashboard() {
  const [summary, orders] = await Promise.all([
    getDashboardSummary(),
    listOrders({ limit: 6 }),
  ]);
  const stats = [
    {
      label: "Ventas de hoy",
      value: formatARS(summary.salesToday.value),
      delta: changeLabel(summary.salesToday.change),
      trend: changeTone(summary.salesToday.change),
      icon: DollarSign,
    },
    {
      label: "Pedidos de hoy",
      value: formatCantidad(summary.ordersToday.value),
      delta: changeLabel(summary.ordersToday.change),
      trend: changeTone(summary.ordersToday.change),
      icon: ShoppingCart,
    },
    {
      label: "Clientes registrados",
      value: formatCantidad(summary.customers.total),
      delta: `${formatCantidad(summary.customers.newToday)} nuevos hoy`,
      trend: summary.customers.newToday > 0 ? "up" : "flat",
      icon: Users,
    },
    {
      label: "Productos vendidos hoy",
      value: formatCantidad(summary.productsSoldToday.value),
      delta: changeLabel(summary.productsSoldToday.change),
      trend: changeTone(summary.productsSoldToday.change),
      icon: Package,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Dashboard</h1>
        <p className="text-sm text-brand-ink/55">
          Resumen de actividad · {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            timeZone: "America/Argentina/Buenos_Aires",
          })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-4 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
                <s.icon size={20} />
              </span>
              <span
                className={`flex items-center gap-0.5 text-xs font-semibold ${
                  s.trend === "up"
                    ? "text-emerald-600"
                    : s.trend === "down"
                      ? "text-brand-red"
                      : "text-brand-ink/45"
                }`}
              >
                {s.trend === "up" ? (
                  <ArrowUpRight size={14} />
                ) : s.trend === "down" ? (
                  <ArrowDownRight size={14} />
                ) : (
                  <Minus size={14} />
                )}
                {s.delta}
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-brand-ink">{s.value}</p>
            <p className="text-sm text-brand-ink/55">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-soft lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-brand-ink">Ventas de los últimos 7 días</h2>
          </div>
          <SalesChart data={summary.salesByDay} />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <h2 className="mb-2 font-semibold text-brand-ink">Métodos de pago · últimos 7 días</h2>
          <PaymentPie data={summary.paymentMethods} />
        </div>
      </div>

      {/* Recent orders + top products */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-soft lg:col-span-2">
          <h2 className="mb-3 font-semibold text-brand-ink">Pedidos recientes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-brand-ink/50">
                  <th className="pb-2 pr-3 font-semibold">Pedido</th>
                  <th className="pb-2 pr-3 font-semibold">Cliente</th>
                  <th className="pb-2 pr-3 font-semibold">Total</th>
                  <th className="pb-2 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-t border-black/5">
                    <td className="py-2.5 pr-3 font-semibold text-brand-ink">{o.id}</td>
                    <td className="py-2.5 pr-3 text-brand-ink/70">{o.customer}</td>
                    <td className="py-2.5 pr-3 font-medium text-brand-ink">{formatARS(o.total)}</td>
                    <td className="py-2.5">
                      <StatusBadge status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <h2 className="mb-3 font-semibold text-brand-ink">Más vendidos · últimos 7 días</h2>
          {summary.topProducts.length > 0 ? (
            <ul className="space-y-3">
              {summary.topProducts.map((p) => (
                <li key={p.name}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-brand-ink">{p.name}</span>
                    <span className="text-brand-ink/55">{formatCantidad(p.sold)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                    <div className="h-full rounded-full bg-brand-gold" style={{ width: `${p.pct}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-8 text-center text-sm text-brand-ink/50">
              Todavía no hay ventas en este período.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
