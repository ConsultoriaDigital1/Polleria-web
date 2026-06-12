import { DollarSign, ShoppingCart, Users, Package, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { listOrders } from "@/lib/repo";
import { formatARS } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { SalesChart, PaymentPie } from "@/components/admin/Charts";

export const dynamic = "force-dynamic";

const stats = [
  { label: "Ventas del día", value: "$2.450.800", delta: "+12,5%", up: true, icon: DollarSign },
  { label: "Pedidos", value: "356", delta: "+8,2%", up: true, icon: ShoppingCart },
  { label: "Clientes", value: "278", delta: "+4,1%", up: true, icon: Users },
  { label: "Productos vendidos", value: "1.092", delta: "-2,3%", up: false, icon: Package },
];

const topProducts = [
  { name: "Pollo Entero", sold: 184, pct: 92 },
  { name: "Combo Familiar", sold: 142, pct: 71 },
  { name: "1/2 Pollo con Papas", sold: 118, pct: 59 },
  { name: "Pata y Muslo con Papas", sold: 96, pct: 48 },
  { name: "Alitas BBQ (12u)", sold: 64, pct: 32 },
];

export default async function AdminDashboard() {
  const orders = await listOrders({ limit: 6 });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Dashboard</h1>
        <p className="text-sm text-brand-ink/55">Resumen de actividad · {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</p>
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
                  s.up ? "text-emerald-600" : "text-brand-red"
                }`}
              >
                {s.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
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
            <h2 className="font-semibold text-brand-ink">Ventas de la semana</h2>
            <span className="text-sm font-semibold text-emerald-600">+18% vs. anterior</span>
          </div>
          <SalesChart />
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <h2 className="mb-2 font-semibold text-brand-ink">Métodos de pago</h2>
          <PaymentPie />
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
          <h2 className="mb-3 font-semibold text-brand-ink">Productos más vendidos</h2>
          <ul className="space-y-3">
            {topProducts.map((p) => (
              <li key={p.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-brand-ink">{p.name}</span>
                  <span className="text-brand-ink/55">{p.sold}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
                  <div className="h-full rounded-full bg-brand-gold" style={{ width: `${p.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
