import { listOrders } from "@/lib/repo";
import { requirePerm } from "@/lib/auth/permissions";
import { OrdersManager } from "./OrdersManager";

export const dynamic = "force-dynamic";

export default async function PedidosPage() {
  await requirePerm("pedidos");
  // Los intentos todavía pendientes quedan fuera de la vista operativa. Los
  // no pagados y cancelados sí se muestran para poder auditar qué pasó.
  const orders = await listOrders({ statusNot: "pendiente" });
  return <OrdersManager orders={orders} />;
}
