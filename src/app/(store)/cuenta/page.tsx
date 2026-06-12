import Link from "next/link";
import { Star, MapPin, ShoppingBag, ChevronRight, Phone } from "lucide-react";
import { formatPoints } from "@/lib/format";
import { getPoints, getCustomer } from "@/lib/repo";
import { getSessionOrDemo } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

const menu = [
  {
    label: "Hacer un pedido",
    description: "Mirá el catálogo y las promos del día",
    icon: ShoppingBag,
    href: "/productos",
  },
  {
    label: "Sucursales",
    description: "Dónde estamos y horarios de atención",
    icon: MapPin,
    href: "/sucursales",
  },
];

export default async function CuentaPage() {
  const { session, isDemo } = await getSessionOrDemo();

  const [summary, customer] = await Promise.all([
    getPoints(session.sub),
    getCustomer(session.sub),
  ]);
  const points = summary?.points ?? 0;
  const tier = summary?.tier ?? "Bronce";
  const since = customer ? new Date(customer.joined).getFullYear() : new Date().getFullYear();

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 pt-4 md:pt-8">
      {/* Cabecera de usuario */}
      <div className="club-pop flex items-center gap-4 rounded-2xl bg-white p-4 shadow-soft">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-red to-brand-dark text-2xl font-bold text-white">
          {session.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold text-brand-ink">{session.name}</h1>
          <p className="flex items-center gap-1 text-sm text-brand-ink/55">
            <Phone size={13} /> {session.phone}
          </p>
          <p className="text-xs text-brand-ink/45">Cliente desde {since}</p>
        </div>
      </div>

      {/* Tarjeta club */}
      <Link
        href="/club"
        className="club-pop club-shine relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red to-brand-dark p-5 text-white shadow-card transition active:scale-[0.99]"
        style={{ animationDelay: "0.08s" }}
      >
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            <Star size={14} className="fill-brand-gold text-brand-gold" /> Club Pollería · Nivel{" "}
            {tier}
          </p>
          <p className="mt-1 text-3xl font-extrabold">{formatPoints(points)} pts</p>
          <p className="mt-1 text-xs text-white/65">Ver mi credencial, beneficios y canjes</p>
        </div>
        <ChevronRight className="shrink-0" />
      </Link>

      {/* Accesos */}
      <div
        className="club-pop overflow-hidden rounded-2xl bg-white shadow-soft"
        style={{ animationDelay: "0.16s" }}
      >
        {menu.map(({ label, description, icon: Icon, href }, i) => (
          <Link
            key={label}
            href={href}
            className={`flex items-center gap-3 px-4 py-4 hover:bg-brand-cream ${
              i !== 0 ? "border-t border-black/5" : ""
            }`}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-red/10">
              <Icon size={19} className="text-brand-red" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-brand-ink">{label}</span>
              <span className="block truncate text-xs text-brand-ink/50">{description}</span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-brand-ink/30" />
          </Link>
        ))}
      </div>

      {session.role === "admin" && (
        <Link
          href="/admin"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-ink py-3 text-sm font-semibold text-white hover:bg-brand-ink/90"
        >
          Ir al panel de administración
        </Link>
      )}

      {!isDemo && (
        <LogoutButton className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-ink/70 hover:bg-black/5" />
      )}
    </div>
  );
}
