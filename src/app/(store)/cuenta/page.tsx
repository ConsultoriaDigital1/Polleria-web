import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Star,
  Package,
  MapPin,
  CreditCard,
  Bell,
  HelpCircle,
  ChevronRight,
} from "lucide-react";
import { formatPoints } from "@/lib/format";
import { getPoints, getCustomer } from "@/lib/repo";
import { getSession } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

const menu = [
  { label: "Mis pedidos", icon: Package, href: "/cuenta" },
  { label: "Direcciones", icon: MapPin, href: "/cuenta" },
  { label: "Medios de pago", icon: CreditCard, href: "/cuenta" },
  { label: "Notificaciones", icon: Bell, href: "/cuenta" },
  { label: "Ayuda", icon: HelpCircle, href: "/cuenta" },
];

export default async function CuentaPage() {
  const session = await getSession();
  if (!session) redirect("/ingresar?next=/cuenta");

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
      <div className="flex items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-red text-xl font-bold text-white">
          {session.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-bold text-brand-ink">{session.name}</h1>
          <p className="text-sm text-brand-ink/55">Cliente desde {since}</p>
        </div>
      </div>

      {/* Tarjeta club */}
      <Link
        href="/club"
        className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-brand-red to-brand-dark p-4 text-white shadow-card"
      >
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-white/80">
            <Star size={14} className="fill-brand-gold text-brand-gold" /> Club Pollería · Nivel{" "}
            {tier}
          </p>
          <p className="mt-1 text-2xl font-extrabold">{formatPoints(points)} pts</p>
        </div>
        <ChevronRight />
      </Link>

      {/* Menú */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        {menu.map(({ label, icon: Icon, href }, i) => (
          <Link
            key={label}
            href={href}
            className={`flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-brand-ink hover:bg-brand-cream ${
              i !== 0 ? "border-t border-black/5" : ""
            }`}
          >
            <Icon size={20} className="text-brand-red" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={18} className="text-brand-ink/30" />
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

      <LogoutButton className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 py-3 text-sm font-semibold text-brand-ink/70 hover:bg-black/5" />
    </div>
  );
}
