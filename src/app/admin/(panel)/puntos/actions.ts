"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import {
  creditPurchasePoints,
  createCustomer,
  listProducts,
  NoDatabaseError,
} from "@/lib/repo";

export interface CreditPointsState {
  ok?: boolean;
  error?: string;
  /** Resumen del último crédito, para mostrar feedback. */
  result?: { customerName: string; amount: number; points: number; total: number };
}

async function requireAdmin(): Promise<string | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return "No autorizado.";
  return null;
}

export async function creditPoints(
  _prev: CreditPointsState,
  formData: FormData
): Promise<CreditPointsState> {
  const denied = await requireAdmin();
  if (denied) return { error: denied };

  const mode = String(formData.get("mode") ?? "monto");

  // ----- Resolver el cliente: existente (customerId) o nuevo -----
  let customerId = String(formData.get("customerId") ?? "").trim();
  let customerName = String(formData.get("customerName") ?? "Cliente").trim();

  try {
    if (!customerId) {
      const newName = String(formData.get("newName") ?? "").trim();
      const newPhone = String(formData.get("newPhone") ?? "").trim();
      const newDocument = String(formData.get("newDocument") ?? "").trim();
      if (!newName) return { error: "Ingresá el nombre del cliente nuevo." };
      if (!newPhone) return { error: "Para un cliente nuevo necesitás el teléfono." };
      const created = await createCustomer({
        name: newName,
        phone: newPhone,
        document: newDocument || undefined,
      });
      customerId = created.id;
      customerName = created.name;
    }
  } catch (e) {
    if (e instanceof NoDatabaseError) return { error: e.message };
    return { error: "No se pudo guardar el cliente nuevo." };
  }

  // ----- Calcular el monto -----
  let amount = 0;
  let label = "Compra en local";

  if (mode === "productos") {
    let items: { productId: string; qty: number }[] = [];
    try {
      items = JSON.parse(String(formData.get("items") ?? "[]"));
    } catch {
      return { error: "Selección de productos inválida." };
    }
    const chosen = items.filter((i) => i.qty > 0);
    if (chosen.length === 0) return { error: "Agregá al menos un producto." };

    const products = await listProducts();
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const i of chosen) {
      const p = byId.get(i.productId);
      if (!p) return { error: `Producto inexistente: ${i.productId}` };
      amount += p.price * i.qty;
    }
    label = `Compra en local (${chosen.reduce((a, i) => a + i.qty, 0)} u.)`;
  } else {
    amount = Math.round(Number(formData.get("amount")));
    if (!Number.isFinite(amount) || amount <= 0) {
      return { error: "Ingresá un monto válido mayor a cero." };
    }
  }

  try {
    const { summary, points } = await creditPurchasePoints(customerId, amount, label);
    revalidatePath("/admin/puntos");
    revalidatePath("/admin/clientes");
    return {
      ok: true,
      result: {
        customerName,
        amount,
        points,
        total: summary?.points ?? 0,
      },
    };
  } catch (e) {
    if (e instanceof NoDatabaseError) return { error: e.message };
    if (e instanceof Error) return { error: e.message };
    return { error: "No se pudieron acreditar los puntos." };
  }
}
