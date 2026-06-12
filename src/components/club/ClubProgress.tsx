"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { formatPoints } from "@/lib/format";
import type { LoyaltyTier } from "@/lib/types";

interface Props {
  points: number;
  tier: LoyaltyTier;
  nextTier: LoyaltyTier;
  pointsToNext: number;
  target: number;
  progress: number;
}

/** Contador animado de puntos + barra de progreso al siguiente nivel. */
export function ClubProgress({ points, tier, nextTier, pointsToNext, target, progress }: Props) {
  const [display, setDisplay] = useState(0);

  // Cuenta ascendente de 0 a los puntos reales al montar.
  useEffect(() => {
    const duration = 1000;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(points * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [points]);

  const isMax = pointsToNext === 0;

  return (
    <div className="club-pop rounded-2xl bg-white p-5 shadow-soft" style={{ animationDelay: "0.1s" }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/50">
            Puntos disponibles
          </p>
          <p className="text-4xl font-extrabold text-brand-ink tabular-nums">
            {formatPoints(display)}
          </p>
          <p className="text-sm text-brand-ink/50">Equivalen a ${formatPoints(points)}</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3 py-1.5 text-sm font-bold text-brand-ink">
          <Star size={14} className="fill-brand-ink/80" /> {tier}
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex justify-between text-xs text-brand-ink/55">
          <span>
            {isMax
              ? "¡Alcanzaste el nivel máximo!"
              : `Te faltan ${formatPoints(pointsToNext)} pts para ${nextTier}`}
          </span>
          <span className="tabular-nums">
            {formatPoints(points)} / {formatPoints(target)}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-ink/10">
          <div
            className="club-progress-fill h-full rounded-full bg-gradient-to-r from-brand-gold to-brand-amber"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
