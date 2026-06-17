import { formatARS, formatDateTime } from "@/lib/format";
import { listOrders } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

const paymentLabels: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  mercadopago: "MercadoPago",
  transferencia: "Transferencia",
};

export default async function PedidosPage() {
  await requirePerm("pedidos");
  const orders = await listOrders();
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Pedidos</h1>
          <p className="text-sm text-brand-ink/55">{orders.length} pedidos en total</p>
        </div>
        <button className="btn-primary">Nuevo pedido</button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream text-left text-xs uppercase tracking-wide text-brand-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Pedido</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Detalle</th>
                <th className="px-4 py-3 font-semibold">Pago</th>
                <th className="px-4 py-3 font-semibold">Fecha</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-black/5 hover:bg-brand-cream/50">
                  <td className="px-4 py-3 font-semibold text-brand-ink">{o.id}</td>
                  <td className="px-4 py-3 text-brand-ink/80">{o.customer}</td>
                  <td className="px-4 py-3 text-brand-ink/60">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-brand-ink/70">{paymentLabels[o.payment]}</td>
                  <td className="px-4 py-3 text-brand-ink/60">{formatDateTime(o.date)}</td>
                  <td className="px-4 py-3 font-medium text-brand-ink">{formatARS(o.total)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
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
