"use server";

import { revalidatePath } from "next/cache";
import { assertPerm } from "@/lib/auth/permissions";
import { confirmDeliveryByCode, dispatchDeliveries, NoDatabaseError } from "@/lib/repo";
import { sucursales } from "@/lib/sucursales";

export interface CerrarPedidosState {
  ok?: boolean;
  error?: string;
  /** Cantidad de envíos despachados. */
  count?: number;
  /** URL de Google Maps con la ruta optimizada. */
  mapsUrl?: string;
}

/**
 * "Cerrar pedidos para enviar": despacha todos los envíos pagados listos,
 * armando la ruta optimizada desde la sucursal elegida. Los pedidos pasan a
 * "en camino" y se disparan los avisos de WhatsApp (vía n8n).
 */
export async function cerrarPedidosEnvio(sucursalId: string): Promise<CerrarPedidosState> {
  const denied = await assertPerm("entregas");
  if (denied) return { error: denied };

  if (!sucursales.some((s) => s.id === sucursalId)) {
    return { error: "Elegí la sucursal desde la que sale el reparto." };
  }

  try {
    const result = await dispatchDeliveries(sucursalId);
    if (result.count === 0) {
      return { error: "No hay envíos pagados listos para despachar." };
    }
    revalidatePath("/admin/entregas");
    revalidatePath("/admin/pedidos");
    return { ok: true, count: result.count, mapsUrl: result.mapsUrl };
  } catch (e) {
    if (e instanceof NoDatabaseError) return { error: e.message };
    return { error: "No se pudieron cerrar los pedidos." };
  }
}

export interface ConfirmarEntregaState {
  ok?: boolean;
  error?: string;
  /** Cliente al que se le confirmó la entrega. */
  customer?: string;
  /** Código del pedido entregado (#1234). */
  pedido?: string;
}

/**
 * Marca una entrega como realizada desde el panel, ingresando el código de 4
 * dígitos que el cliente le dio al repartidor. Busca entre los envíos en camino
 * el que coincida y lo pasa a "entregado" (avisa al siguiente por WhatsApp).
 */
export async function confirmarEntrega(code: string): Promise<ConfirmarEntregaState> {
  const denied = await assertPerm("entregas");
  if (denied) return { error: denied };

  const trimmed = code.trim();
  if (!trimmed) return { error: "Ingresá el código del cliente." };

  let result;
  try {
    result = await confirmDeliveryByCode(trimmed);
  } catch (e) {
    if (e instanceof NoDatabaseError) return { error: e.message };
    return { error: "No se pudo confirmar la entrega." };
  }

  if (result.ok) {
    revalidatePath("/admin/entregas");
    revalidatePath("/admin/pedidos");
    return { ok: true, customer: result.order.customer, pedido: result.order.id };
  }

  const messages: Record<string, string> = {
    invalid_code: "No hay ningún envío en camino con ese código.",
    already_delivered: "Ese pedido ya figura como entregado.",
    no_code: "Ese pedido no es un envío.",
    not_found: "No encontramos el pedido.",
  };
  return { error: messages[result.reason] ?? "No se pudo confirmar." };
}
