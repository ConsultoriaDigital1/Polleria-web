"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { createProduct, updateProduct, NoDatabaseError } from "@/lib/repo";
import type { Category } from "@/lib/types";

export interface SaveProductState {
  ok?: boolean;
  error?: string;
}

const CATEGORIES: Category[] = ["cortes", "cajones", "rebozados"];

async function requireAdmin(): Promise<string | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return "No autorizado.";
  return null;
}

function revalidateCatalog() {
  revalidatePath("/admin/productos");
  revalidatePath("/productos");
  revalidatePath("/ofertas");
  revalidatePath("/");
}

export async function saveProduct(
  _prev: SaveProductState,
  formData: FormData
): Promise<SaveProductState> {
  const denied = await requireAdmin();
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = String(formData.get("image") ?? "").trim();
  const badge = String(formData.get("badge") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;
  const price = Math.round(Number(formData.get("price")));
  const oldPriceRaw = String(formData.get("oldPrice") ?? "").trim();
  const oldPrice = oldPriceRaw ? Math.round(Number(oldPriceRaw)) : null;
  const available = formData.get("available") === "on";

  if (!name) return { error: "El nombre es obligatorio." };
  if (!Number.isFinite(price) || price <= 0) return { error: "El precio debe ser mayor a 0." };
  if (oldPrice !== null && (!Number.isFinite(oldPrice) || oldPrice <= price))
    return { error: "El precio anterior debe ser mayor al precio actual." };
  if (!CATEGORIES.includes(category)) return { error: "Categoría inválida." };
  if (!image) return { error: "La imagen es obligatoria (URL o ruta)." };

  const data = {
    name,
    description,
    price,
    oldPrice,
    category,
    image,
    badge: badge || null,
    available,
  };

  try {
    if (id) {
      const updated = await updateProduct(id, data);
      if (!updated) return { error: "Producto no encontrado." };
    } else {
      await createProduct(data);
    }
  } catch (e) {
    if (e instanceof NoDatabaseError) return { error: e.message };
    return { error: "No se pudo guardar el producto." };
  }

  revalidateCatalog();
  return { ok: true };
}

export async function toggleProductAvailability(id: string, available: boolean): Promise<void> {
  const denied = await requireAdmin();
  if (denied) return;
  try {
    await updateProduct(id, { available });
  } catch {
    return;
  }
  revalidateCatalog();
}
