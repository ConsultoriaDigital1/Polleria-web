import QRCode from "qrcode";
import { Gift, TrendingUp, ShoppingBag, Star, Sparkles } from "lucide-react";
import { rewards, loyaltyTiers } from "@/lib/data";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getPoints, getCustomer } from "@/lib/repo";
import { getSessionOrDemo } from "@/lib/auth/session";
import { MemberCard } from "@/components/club/MemberCard";
import { ClubProgress } from "@/components/club/ClubProgress";
import { RewardsGrid } from "@/components/club/RewardsGrid";

export const dynamic = "force-dynamic";

/** Beneficios destacados de la semana (curados a mano). */
const weeklyPerks = [
  {
    emoji: "🔥",
    title: "2x1 en Medallones",
    detail: "Todos los miércoles para socios del club",
    accent: "from-brand-red to-brand-dark",
  },
  {
    emoji: "🚚",
    title: "Envío gratis",
    detail: "Nivel Oro y Diamante, en compras desde $20.000",
    accent: "from-brand-amber to-brand-gold",
  },
  {
    emoji: "⭐",
    title: "Puntos dobles",
    detail: "Este fin de semana en cajones de 10kg y 15kg",
    accent: "from-brand-ink to-black",
  },
  {
    emoji: "🎂",
    title: "Regalo de cumpleaños",
    detail: "Socios Diamante: sorpresa en tu mes",
    accent: "from-brand-red to-brand-amber",
  },
];

export default async function ClubPage() {
  const { session } = await getSessionOrDemo();

  const [summary, customer] = await Promise.all([
    getPoints(session.sub),
    getCustomer(session.sub),
  ]);
  const points = summary?.points ?? 0;
  const tier = summary?.tier ?? "Bronce";
  const pointsHistory = summary?.history ?? [];
  const since = customer ? new Date(customer.joined).getFullYear() : new Date().getFullYear();

  // Nivel siguiente y puntos faltantes calculados a partir de los umbrales.
  const idx = loyaltyTiers.findIndex((t) => t.tier === tier);
  const next = loyaltyTiers[idx + 1];
  const nextTier = next?.tier ?? tier;
  const pointsToNext = next ? Math.max(0, next.min - points) : 0;
  const target = next ? next.min : points;
  const progress = target > 0 ? Math.min(100, Math.round((points / target) * 100)) : 100;

  // QR con el id del socio, para escanear en caja y sumar puntos.
  const qrDataUrl = await QRCode.toDataURL(session.sub, {
    margin: 1,
    width: 240,
    color: { dark: "#1F1A17", light: "#ffffff" },
  });
  const memberId = session.sub.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();

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

      {/* Credencial de socio */}
      <section className="px-4">
        <MemberCard
          name={session.name}
          phone={session.phone}
          tier={tier}
          memberId={memberId}
          since={since}
          qrDataUrl={qrDataUrl}
        />
      </section>

      {/* Puntos y progreso */}
      <section className="px-4">
        <ClubProgress
          points={points}
          tier={tier}
          nextTier={nextTier}
          pointsToNext={pointsToNext}
          target={target}
          progress={progress}
        />
      </section>

      {/* Beneficios de la semana */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 px-4 text-base font-bold text-brand-ink">
          <Sparkles size={18} className="text-brand-red" /> Beneficios de la semana
        </h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {weeklyPerks.map((p) => (
            <div
              key={p.title}
              className={cn(
                "flex w-44 shrink-0 flex-col justify-between rounded-2xl bg-gradient-to-br p-4 text-white shadow-card",
                p.accent
              )}
            >
              <span className="text-2xl" aria-hidden>
                {p.emoji}
              </span>
              <div className="mt-6">
                <p className="text-sm font-extrabold leading-tight">{p.title}</p>
                <p className="mt-1 text-[11px] leading-snug text-white/75">{p.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Catálogo de canjes */}
      <section className="px-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-brand-ink">
          <Gift size={18} className="text-brand-red" /> ¿Qué puedo hacer con mis puntos?
        </h2>
        <RewardsGrid rewards={rewards} points={points} />
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
          {pointsHistory.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-brand-ink/45">
              Todavía no tenés movimientos. ¡Tu primera compra suma puntos!
            </p>
          )}
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
