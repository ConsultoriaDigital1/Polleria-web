"use client";

import { Printer } from "lucide-react";

/** Botón que abre el diálogo de impresión (o "Guardar como PDF") del navegador. */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-lg bg-brand-red px-4 py-2 text-sm font-bold text-white hover:brightness-95"
    >
      <Printer size={16} /> Imprimir / Guardar PDF
    </button>
  );
}
