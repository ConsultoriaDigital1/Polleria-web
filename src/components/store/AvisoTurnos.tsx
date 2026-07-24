import { Sunrise, Sunset } from "lucide-react";
import { AVISO_TURNOS } from "@/lib/entrega";
import { cn } from "@/lib/cn";

/**
 * Aviso principal de cuándo se recibe cada compra. Se muestra en la home y en
 * el carrito, así el cliente lo ve antes de elegir el horario de entrega.
 * El texto vive en lib/entrega para que sea uno solo en toda la app.
 */
export function AvisoTurnos({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl bg-brand-ink p-4 text-white shadow-soft md:p-5",
        className
      )}
    >
      <span className="flex shrink-0 items-center gap-0.5 text-brand-gold" aria-hidden>
        <Sunrise size={22} />
        <Sunset size={22} />
      </span>
      <p className="text-sm font-extrabold leading-snug md:text-lg">{AVISO_TURNOS}</p>
    </div>
  );
}
