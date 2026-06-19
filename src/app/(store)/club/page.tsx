import QRCode from "qrcode";
import Link from "next/link";
import Image from "next/image";
import { Gift, TrendingUp, ShoppingBag, Star, Sparkles, LogIn } from "lucide-react";
import { rewards, loyaltyTiers } from "@/lib/data";
import { formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";
import { getPoints, getCustomer } from "@/lib/repo";
import { getSession } from "@/lib/auth/session";
import { MemberCard } from "@/components/club/MemberCard";
import { ClubProgress } from "@/components/club/ClubProgress";
import { RewardsGrid } from "@/components/club/RewardsGrid";

export const dynamic = "force-dynamic";

/** Beneficios destacados de la semana (curados a mano). */
const weeklyPerks = [
  {
    image: "/1.jpeg",
    imageAlt: "Medallones de pollo Entre Ríos",
    imageClass: "object-cover",
    imageTone: "bg-brand-ink",
    overlay: "from-brand-ink/85 via-brand-ink/15 to-transparent",
    badge: "Miércoles",
    title: "2x1 en Medallones",
    detail: "Todos los miércoles para socios del club",
    accent: "from-brand-red to-brand-dark",
  },
  {
    image: "/fondo-polleria.png",
    imageAlt: "Sucursal Pollería Entre Ríos",
    imageClass: "object-cover",
    imageTone: "bg-brand-ink",
    overlay: "from-brand-ink/85 via-brand-ink/15 to-transparent",
    badge: "Oro y Diamante",
    title: "Envío gratis",
    detail: "Nivel Oro y Diamante, en compras desde $20.000",
    accent: "from-brand-amber to-brand-gold",
  },
  {
    image: "/6.jpeg",
    imageAlt: "Pata muslo de pollo",
    imageClass: "object-cover",
    imageTone: "bg-brand-ink",
    overlay: "from-brand-ink/85 via-brand-ink/15 to-transparent",
    badge: "Fin de semana",
    title: "Puntos dobles",
    detail: "Este fin de semana en cajones de 10kg y 15kg",
    accent: "from-brand-ink to-black",
  },
  {
    image: "/logo.jpg",
    imageAlt: "Logo Pollería Entre Ríos",
    imageClass: "object-contain p-6",
    imageTone: "bg-white",
    overlay: "from-brand-red/20 via-transparent to-transparent",
    badge: "Diamante",
    title: "Regalo de cumpleaños",
    detail: "Socios Diamante: sorpresa en tu mes",
    accent: "from-brand-red to-brand-amber",
  },
];

export default async function ClubPage() {
  const session = await getSession();

  // Solo cargamos datos personales si hay una sesión real; los invitados
  // pueden ver beneficios, canjes y niveles sin iniciar sesión.
  const [summary, customer] = session
    ? await Promise.all([getPoints(session.sub), getCustomer(session.sub)])
    : [null, null];
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
  const qrDataUrl = session
    ? await QRCode.toDataURL(session.sub, {
        margin: 1,
        width: 240,
        color: { dark: "#1F1A17", light: "#ffffff" },
      })
    : "";
  const memberId = session
    ? session.sub.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()
    : "";

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

      {session ? (
        <>
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
        </>
      ) : (
        /* Invitado: sin sesión mostramos un llamado a iniciar sesión. */
        <section className="px-4">
          <div className="club-pop relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red to-brand-dark p-6 text-white shadow-card">
            <span className="absolute -right-5 -bottom-6 text-8xl opacity-10" aria-hidden>
              🐓
            </span>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-gold">
              <Star size={12} className="fill-brand-gold" /> Club Pollería
            </p>
            <p className="mt-2 text-lg font-extrabold leading-tight">
              Sumá puntos en cada compra y canjealos por premios
            </p>
            <p className="mt-1 text-sm text-white/70">
              Iniciá sesión para ver tu credencial, tus puntos y tu historial.
            </p>
            <Link
              href="/ingresar?next=/club"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-red transition active:scale-[0.98]"
            >
              <LogIn size={18} /> Iniciar sesión
            </Link>
          </div>
        </section>
      )}

      {/* Beneficios de la semana */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 px-4 text-base font-bold text-brand-ink">
          <Sparkles size={18} className="text-brand-red" /> Beneficios de la semana
        </h2>
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
          {weeklyPerks.map((p) => (
            <div
              key={p.title}
              className="group flex w-52 shrink-0 flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-black/5"
            >
              <div className={cn("relative h-32 overflow-hidden", p.imageTone)}>
                <Image
                  src={p.image}
                  alt={p.imageAlt}
                  fill
                  sizes="208px"
                  className={cn("transition duration-500 group-hover:scale-105", p.imageClass)}
                />
                <div className={cn("absolute inset-0 bg-gradient-to-t", p.overlay)} />
                <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-brand-red shadow-sm backdrop-blur">
                  {p.badge}
                </span>
                <span
                  className={cn(
                    "absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg ring-2 ring-white/30",
                    p.accent
                  )}
                  aria-hidden
                >
                  <Sparkles size={17} />
                </span>
              </div>
              <div className="flex min-h-32 flex-col justify-between p-4">
                <div>
                  <p className="text-sm font-extrabold leading-tight text-brand-ink">{p.title}</p>
                  <p className="mt-1 text-[11px] leading-snug text-brand-ink/60">{p.detail}</p>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/5">
                  <div className={cn("h-full w-3/4 rounded-full bg-gradient-to-r", p.accent)} />
                </div>
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
