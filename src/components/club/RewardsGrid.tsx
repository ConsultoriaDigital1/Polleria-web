"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, X, Ticket } from "lucide-react";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Reward } from "@/lib/types";

interface Props {
  rewards: Reward[];
  points: number;
}

interface CouponState {
  coupon: string;
  rewardName: string;
}

const CONFETTI_COLORS = ["#F6B40A", "#C8102E", "#F59E0B", "#1F1A17", "#ffffff"];

/** Grilla de canjes del club: descuenta puntos reales y muestra el cupón. */
export function RewardsGrid({ rewards, points }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<CouponState | null>(null);

  async function redeem(reward: Reward) {
    setError(null);
    setLoadingId(reward.id);
    try {
      const res = await fetch("/api/club/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rewardId: reward.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "No se pudo canjear. Probá de nuevo.");
      setDone({ coupon: json.data.coupon, rewardName: reward.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoadingId(null);
    }
  }

  function closeModal() {
    setDone(null);
    // Refresca puntos, historial y progreso renderizados en el servidor.
    router.refresh();
  }

  return (
    <>
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid grid-cols-3 gap-3">
        {rewards.map((r) => {
          const canRedeem = points >= r.cost;
          const loading = loadingId === r.id;
          return (
            <div
              key={r.id}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-card",
                r.highlight && "ring-2 ring-brand-gold"
              )}
            >
              <div className="aspect-square overflow-hidden bg-brand-cream">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.image} alt={r.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-1 flex-col p-2">
                <p className="text-[11px] font-semibold leading-tight text-brand-ink">{r.name}</p>
                <p className="mt-0.5 text-[11px] font-bold text-brand-red">
                  {formatPoints(r.cost)} pts
                </p>
                <button
                  disabled={!canRedeem || loading}
                  onClick={() => redeem(r)}
                  className={cn(
                    "mt-2 flex items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold transition active:scale-95",
                    canRedeem
                      ? "bg-brand-gold text-brand-ink hover:brightness-95"
                      : "cursor-not-allowed bg-black/5 text-brand-ink/40"
                  )}
                >
                  {loading && <Loader2 size={12} className="animate-spin" />}
                  {canRedeem ? "Canjear" : "Faltan pts"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {done && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          onClick={closeModal}
        >
          <div
            className="club-pop relative w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 text-center shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Confeti */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              {Array.from({ length: 28 }).map((_, i) => (
                <span
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${(i * 37) % 100}%`,
                    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                    animationDelay: `${(i % 7) * 0.12}s`,
                  }}
                />
              ))}
            </div>

            <button
              onClick={closeModal}
              className="absolute right-3 top-3 rounded-full p-1 text-brand-ink/40 hover:bg-black/5"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold/20">
              <Gift size={26} className="text-brand-red" />
            </div>
            <h3 className="mt-3 text-lg font-extrabold text-brand-ink">¡Canje exitoso!</h3>
            <p className="mt-1 text-sm text-brand-ink/60">{done.rewardName}</p>

            <div className="mt-4 rounded-xl border-2 border-dashed border-brand-gold bg-brand-cream p-4">
              <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-brand-ink/50">
                <Ticket size={14} className="text-brand-red" /> Tu cupón
              </p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-widest text-brand-red">
                {done.coupon}
              </p>
              <p className="mt-1 text-[11px] text-brand-ink/50">Mostralo en caja para usarlo</p>
            </div>

            <button onClick={closeModal} className="btn-primary mt-5 w-full">
              Listo
            </button>
          </div>
        </div>
      )}
    </>
  );
}
