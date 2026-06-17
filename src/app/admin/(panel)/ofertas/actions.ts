"use server";

import { revalidatePath } from "next/cache";
import { assertPerm } from "@/lib/auth/permissions";
import { getProduct, updateProduct, NoDatabaseError } from "@/lib/repo";

export interface SetOfferState {
  ok?: boolean;
  error?: string;
}

function revalidateCatalog() {
  revalidatePath("/admin/ofertas");
  revalidatePath("/admin/productos");
  revalidatePath("/ofertas");
  revalidatePath("/productos");
  revalidatePath("/");
}

/**
 * Pone, actualiza o saca un producto de ofertas.
 *
 * Modelo de datos: un producto está "en oferta" cuando tiene `oldPrice`.
 * - `oldPrice` = precio normal (tachado en la tienda).
 * - `price`    = precio de oferta (el que se cobra).
 *
 * `offerPrice = null` saca el producto de ofertas y restaura el precio normal.
 */
export async function setOffer(id: string, offerPrice: number | null): Promise<SetOfferState> {
  const denied = await assertPerm("ofertas");
  if (denied) return { error: denied };

  const product = await getProduct(id);
  if (!product) return { error: "Producto no encontrado." };

  // Precio normal del producto (lo que vale sin oferta).
  const normalPrice = product.oldPrice ?? product.price;

  try {
    if (offerPrice === null) {
      // Sacar de ofertas: restaurar el precio normal.
      await updateProduct(id, { price: normalPrice, oldPrice: null });
    } else {
      if (!Number.isFinite(offerPrice) || offerPrice <= 0)
        return { error: "El precio de oferta debe ser mayor a 0." };
      if (offerPrice >= normalPrice)
        return { error: "El precio de oferta debe ser menor al precio normal." };
      await updateProduct(id, { price: offerPrice, oldPrice: normalPrice });
    }
  } catch (e) {
    if (e instanceof NoDatabaseError) return { error: e.message };
    return { error: "No se pudo actualizar la oferta." };
  }

  revalidateCatalog();
  return { ok: true };
}
