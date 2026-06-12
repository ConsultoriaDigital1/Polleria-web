import { Star, Gift, TrendingUp, ShoppingBag } from "lucide-react";
import { currentUser, rewards, loyaltyTiers } from "@/lib/data";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getPoints } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const summary = await getPoints(currentUser.id);
  const points = summary?.points ?? currentUser.points;
  const tier = summary?.tier ?? currentUser.tier;
  const pointsHistory = summary?.history ?? [];

  // Nivel siguiente y puntos faltantes calculados a partir de los umbrales.
  const idx = loyaltyTiers.findIndex((t) => t.tier === tier);
  const next = loyaltyTiers[idx + 1];
  const nextTier = next?.tier ?? tier;
  const pointsToNext = next ? Math.max(0, next.min - points) : 0;
  const target = next ? next.min : points;
  const progress = target > 0 ? Math.min(100, Math.round((points / target) * 100)) : 100;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-2 md:pt-4">
      {/* Encabezado */}
      <section className="bg-gradient-to-b from-brand-gold/30 to-transparent px-4 pt-4">
        <div className="flex items-center gap-2">
          <Star size={22} className="fill-brand-gold text-brand-gold" />
          <h1 className="text-xl font-extrabold text-brand-ink">CLUB POLLERÍA</h1>
        </div>
        <p className="text-sm text-brand-ink/60">Más compras, más beneficios</p>
      </section>

      {/* Tarjeta de puntos */}
      <section className="px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red to-brand-dark p-5 text-white shadow-card">
          <span className="absolute -right-4 -top-4 text-7xl opacity-20" aria-hidden>
            🐓
          </span>
          <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
            Puntos disponibles
          </p>
          <p className="mt-1 text-4xl font-extrabold">{formatPoints(points)}</p>
          <p className="text-sm text-white/70">Equivale a ${formatPoints(points)}</p>

          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-gold px-3 py-1 text-sm font-bold text-brand-ink">
            <Star size={14} className="fill-brand-ink/80" /> Nivel {tier}
          </div>

          {/* Progreso al siguiente nivel */}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-white/80">
              <span>
                Te faltan {formatPoints(pointsToNext)} pts para {nextTier}
              </span>
              <span>
                {formatPoints(points)} / {formatPoints(target)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-brand-gold"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Catálogo de canjes */}
      <section className="px-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-ink">
          <Gift size={18} className="text-brand-red" /> ¿Qué puedo hacer con mis puntos?
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {rewards.map((r) => {
            const canRedeem = points >= r.cost;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex flex-col overflow-hidden rounded-2xl bg-white shadow-soft",
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
                    disabled={!canRedeem}
                    className={cn(
                      "mt-2 rounded-md px-2 py-1 text-[11px] font-bold transition",
                      canRedeem
                        ? "bg-brand-gold text-brand-ink hover:brightness-95"
                        : "cursor-not-allowed bg-black/5 text-brand-ink/40"
                    )}
                  >
                    {canRedeem ? "Canjear" : "Faltan pts"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Niveles */}
      <section className="px-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-ink">
          <TrendingUp size={18} className="text-brand-red" /> Niveles del club
        </h2>
        <div className="space-y-2">
          {loyaltyTiers.map((t) => (
            <div
              key={t.tier}
              className={cn(
                "flex items-center justify-between rounded-xl border p-3",
                t.tier === tier
                  ? "border-brand-gold bg-brand-gold/10"
                  : "border-black/5 bg-white"
              )}
            >
              <div className="flex items-center gap-2">
                <Star
                  size={18}
                  className={cn(
                    t.tier === tier ? "fill-brand-gold text-brand-gold" : "text-brand-ink/30"
                  )}
                />
                <div>
                  <p className="text-sm font-bold text-brand-ink">{t.tier}</p>
                  <p className="text-xs text-brand-ink/55">{t.perk}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-brand-ink/50">
                {formatPoints(t.min)}+ pts
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Historial de puntos */}
      <section className="px-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-brand-ink">
            <ShoppingBag size={18} className="text-brand-red" /> Historial de puntos
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
          {pointsHistory.map((h, i) => (
            <div
              key={h.id}
              className={cn(
                "flex items-center justify-between px-4 py-3",
                i !== 0 && "border-t border-black/5"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-lg",
                    h.type === "canje" ? "bg-brand-red/10" : "bg-brand-gold/20"
                  )}
                  aria-hidden
                >
                  {h.type === "canje" ? "🎁" : h.type === "bonus" ? "⭐" : "🛒"}
                </span>
                <div>
                  <p className="text-sm font-medium text-brand-ink">{h.label}</p>
                  <p className="text-xs text-brand-ink/50">
                    {new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(h.date))}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "text-sm font-bold",
                  h.points >= 0 ? "text-emerald-600" : "text-brand-red"
                )}
              >
                {h.points >= 0 ? "+" : ""}
                {formatPoints(h.points)} pts
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
