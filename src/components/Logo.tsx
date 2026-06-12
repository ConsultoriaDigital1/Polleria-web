import { cn } from "@/lib/cn";

/** Logo "Pollería Entre Ríos" en SVG (gallo + texto). */
export function Logo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-2xl leading-none" aria-hidden>
        🐓
      </span>
      <div className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-[0.25em]",
            dark ? "text-white/70" : "text-brand-gold"
          )}
        >
          Pollería
        </span>
        <span
          className={cn(
            "font-display text-xl font-bold italic",
            dark ? "text-white" : "text-brand-red"
          )}
        >
          Entre Ríos
        </span>
      </div>
    </div>
  );
}
