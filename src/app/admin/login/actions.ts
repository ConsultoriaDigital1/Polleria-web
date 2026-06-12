"use server";

import { redirect } from "next/navigation";
import { verifyAdminCredentials } from "@/lib/auth/admin";
import { setSessionCookie } from "@/lib/auth/session";

export interface AdminLoginState {
  error?: string;
}

export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const user = String(formData.get("user") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!user || !password) {
    return { error: "Ingresá usuario y contraseña." };
  }

  if (!verifyAdminCredentials(user, password)) {
    // Pequeña demora para frenar fuerza bruta.
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Usuario o contraseña incorrectos." };
  }

  await setSessionCookie({
    sub: "admin",
    name: "Administrador",
    phone: "",
    role: "admin",
  });

  // Solo permitir destinos internos del panel.
  redirect(next.startsWith("/admin") ? next : "/admin");
}
