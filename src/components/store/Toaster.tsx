"use client";

import { CheckCircle2, X } from "lucide-react";
import { useToast } from "@/store/toast";

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 md:bottom-6">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`flex items-center gap-2 rounded-xl bg-brand-ink px-4 py-3 text-sm text-white shadow-card ${
            t.leaving ? "animate-toast-out" : "animate-toast-in"
          }`}
        >
          <CheckCircle2 size={18} className="shrink-0 text-brand-gold" />
          <span>{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Cerrar notificación"
            className="ml-2 shrink-0 text-white/60 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
