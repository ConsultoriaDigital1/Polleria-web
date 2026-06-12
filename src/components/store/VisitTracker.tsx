"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/**
 * Registra una visita por sesión de navegador y por día.
 * Se monta en el layout de la tienda; no renderiza nada.
 */
export function VisitTracker() {
  useEffect(() => {
    const key = `er-visit-${new Date().toLocaleDateString("en-CA")}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // sin sessionStorage (modo privado estricto): registrar igual
    }
    track("visit", { path: window.location.pathname });
  }, []);

  return null;
}
