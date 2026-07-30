import { formatARS, formatDateTime } from "@/lib/format";
import { listOrders } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { deliverySlotLabel } from "@/lib/entrega";
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
  // Los intentos todavía pendientes quedan fuera de la vista operativa. Los
  // cancelados sí se muestran para poder auditar qué pasó y cuándo.
  const orders = (await listOrders()).filter((order) => order.status !== "pendiente");
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Pedidos</h1>
          <p className="text-sm text-brand-ink/55">
            {orders.length} pedidos confirmados o cancelados
          </p>
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
                <th className="px-4 py-3 font-semibold">Entrega</th>
                <th className="px-4 py-3 font-semibold">Pago</th>
                <th className="px-4 py-3 font-semibold">Creado</th>
                <th className="px-4 py-3 font-semibold">Pago confirmado</th>
                <th className="px-4 py-3 font-semibold">Cancelado</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-black/5 hover:bg-brand-cream/50">
                  <td className="px-4 py-3 font-semibold text-brand-ink">{o.id}</td>
                  <td className="px-4 py-3 text-brand-ink/80">
                    <p>{o.customer}</p>
                    {o.phone && (
                      <a
                        href={`tel:${o.phone}`}
                        className="mt-0.5 block whitespace-nowrap text-xs font-semibold text-brand-red hover:underline"
                      >
                        {o.phone}
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-ink/60">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-brand-ink/70">
                    {deliverySlotLabel(o.deliverySlot) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-ink/70">{paymentLabels[o.payment]}</td>
                  <td className="px-4 py-3 text-brand-ink/60">{formatDateTime(o.date)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-brand-ink/60">
                    {o.paidAt ? formatDateTime(o.paidAt) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium text-brand-red">
                    {o.cancelledAt ? formatDateTime(o.cancelledAt) : "—"}
                  </td>
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
