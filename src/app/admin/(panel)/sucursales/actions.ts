"use server";

import { revalidatePath } from "next/cache";
import { assertPerm } from "@/lib/auth/permissions";
import { NoDatabaseError, saveSucursal } from "@/lib/repo";

export interface SaveSucursalState {
  ok?: boolean;
  error?: string;
}

export async function saveSucursalAction(
  _previous: SaveSucursalState,
  formData: FormData
): Promise<SaveSucursalState> {
  const denied = await assertPerm("sucursales");
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const number = String(formData.get("number") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const mapsUrl = String(formData.get("mapsUrl") ?? "").trim();
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  const deliveryRadiusKm = Number(formData.get("deliveryRadiusKm"));
  const deliverySlots = formData.getAll("deliverySlots").map(String);
  const freeShippingDays = formData.getAll("freeShippingDays").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    return { error: "El ID solo puede contener letras minúsculas, números y guiones." };
  }
  if (!name || !street || !number || !region) {
    return { error: "Completá nombre, calle, altura y región." };
  }
  if (!Number.isFinite(deliveryRadiusKm) || deliveryRadiusKm <= 0 || deliveryRadiusKm > 100) return { error: "Ingresá un radio de envío entre 0,1 y 100 km." };
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { error: "Elegí una ubicación válida en el mapa." };
  }
  if (mapsUrl && !/^https:\/\/(?:www\.)?(?:google\.[^/]+\/maps|maps\.app\.goo\.gl)\//i.test(mapsUrl)) {
    return { error: "El enlace debe pertenecer a Google Maps." };
  }

  try {
    await saveSucursal({
      id,
      name,
      street,
      number,
      region,
      mapsUrl: mapsUrl || null,
      lat,
      lng,
      active: formData.get("active") === "on",
      deliveryEnabled: formData.get("deliveryEnabled") === "on",
      deliveryRadiusKm,
      deliverySlots,
      freeShippingDays,
    });
    revalidatePath("/admin/sucursales");
    revalidatePath("/api/sucursales");
    return { ok: true };
  } catch (error) {
    if (error instanceof NoDatabaseError) return { error: error.message };
    return { error: "No se pudo guardar la sucursal." };
  }
}
