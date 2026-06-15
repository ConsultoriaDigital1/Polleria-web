"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import { createStaff, updateStaff, deleteStaff, NoDatabaseError } from "@/lib/repo";
import type { StaffRole } from "@/lib/types";

export interface SaveStaffState {
  ok?: boolean;
  error?: string;
}

const ROLES: StaffRole[] = ["cajero", "cocina", "repartidor", "encargado", "admin"];

async function requireAdmin(): Promise<string | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return "No autorizado.";
  return null;
}

export async function saveStaff(
  _prev: SaveStaffState,
  formData: FormData
): Promise<SaveStaffState> {
  const denied = await requireAdmin();
  if (denied) return { error: denied };

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "cajero").trim();
  const role = (ROLES.includes(roleRaw as StaffRole) ? roleRaw : "cajero") as StaffRole;
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const active = formData.get("active") === "on";

  if (!name) return { error: "El nombre es obligatorio." };

  const data = { name, role, phone: phone || null, email: email || null, active };

  try {
    if (id) {
      const updated = await updateStaff(id, data);
      if (!updated) return { error: "Integrante no encontrado." };
    } else {
      await createStaff(data);
    }
  } catch (e) {
    if (e instanceof NoDatabaseError) return { error: e.message };
    return { error: "No se pudo guardar el integrante." };
  }

  revalidatePath("/admin/equipo");
  return { ok: true };
}

export async function toggleStaffActive(id: string, active: boolean): Promise<void> {
  const denied = await requireAdmin();
  if (denied) return;
  try {
    await updateStaff(id, { active });
  } catch {
    return;
  }
  revalidatePath("/admin/equipo");
}

export async function removeStaff(id: string): Promise<void> {
  const denied = await requireAdmin();
  if (denied) return;
  try {
    await deleteStaff(id);
  } catch {
    return;
  }
  revalidatePath("/admin/equipo");
}
