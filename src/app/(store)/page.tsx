import Link from "next/link";
import { ShieldCheck, Bird, Truck, MapPin, MessageCircle, Flame, Sunrise, Sunset } from "lucide-react";
import { listProducts, getSuperOferta } from "@/lib/repo";
import { PromoCarousel } from "@/components/store/PromoCarousel";
import { ProductCatalog } from "@/components/store/ProductCatalog";
import { SuperOfertaHero } from "@/components/store/SuperOfertaHero";
import { sucursales } from "@/lib/sucursales";

export const dynamic = "force-dynamic";

const WHATSAPP_URL = "https://wa.me/543794525617";
const SUPER_OFERTA_PRODUCT_ID = "p-pata-muslo-10kg";

export default async function HomePage() {
  const productos = await listProducts();
  const superOferta = await getSuperOferta();

  const esOferta = (p: (typeof productos)[number]) =>
    (p.oldPrice != null && p.oldPrice > p.price) || p.badge === "Promo del día";
  const ofertasDeLaSemana = productos.filter(
    (p) => p.id !== SUPER_OFERTA_PRODUCT_ID && esOferta(p)
  );

  return (
    <div className="space-y-8 md:space-y-14">
      {/* Hero: banner "Super Oferta" (editable desde /admin/ofertas).
          Si se desactiva desde el panel, vuelve el hero clásico. */}
      {superOferta.active ? <SuperOfertaHero oferta={superOferta} /> : <HeroClasico />}

      {/* Ofertas de la semana: promos comunes, sin repetir la super oferta del día */}
      {ofertasDeLaSemana.length > 0 && (
        <section className="px-4 md:px-6">
          <div className="mb-3 flex items-center justify-between md:mb-6">
            <h2 className="relative flex items-center gap-2 pb-1 text-lg font-bold uppercase text-brand-ink md:text-2xl">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-gold text-brand-ink md:h-10 md:w-10">
                <Flame size={20} />
              </span>
              Ofertas de la semana
              <span className="absolute bottom-0 left-0 h-0.5 w-12 rounded bg-brand-gold md:h-1 md:w-16" />
            </h2>
            <Link href="/ofertas" className="text-sm font-semibold text-brand-red md:text-base">
              Ver todas
            </Link>
          </div>
          <div className="rounded-2xl bg-gradient-to-r from-brand-gold/15 via-brand-gold/5 to-transparent p-2 ring-1 ring-brand-gold/30 md:rounded-3xl md:p-4">
            <PromoCarousel products={ofertasDeLaSemana} />
          </div>
        </section>
      )}

      {/* Productos */}
      <section className="px-4 md:px-6">
        <div className="mb-3 md:mb-6">
          <h2 className="relative pb-1 text-lg font-bold text-brand-ink md:text-2xl">
            Productos
            <span className="absolute bottom-0 left-0 h-0.5 w-12 rounded bg-brand-red md:h-1 md:w-16" />
          </h2>
        </div>
        <div className="space-y-4">
          <ProductCatalog products={productos} />
        </div>
      </section>

      {/* Franja de compra/entrega: la promesa de la casa */}
      <FranjaEntrega />

      {/* Sucursales */}
      <section className="px-4 md:px-6">
        <div className="mb-3 md:mb-6">
          <h2 className="relative pb-1 text-lg font-bold text-brand-ink md:text-2xl">
            Nuestras sucursales
            <span className="absolute bottom-0 left-0 h-0.5 w-12 rounded bg-brand-red md:h-1 md:w-16" />
          </h2>
          <p className="mt-2 text-xs text-brand-ink/60 md:text-sm">
            8 sucursales en Corrientes. Las marcadas con WhatsApp ya toman pedidos por ese medio;
            las demás estarán habilitadas próximamente.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
          {sucursales.map((s) => (
            <Link
              key={s.id}
              href={`/sucursales?s=${s.id}`}
              className="flex items-center gap-2 rounded-2xl bg-white p-3 shadow-soft transition hover:shadow-md hover:ring-1 hover:ring-brand-red/40 md:p-4"
            >
              <MapPin size={18} className="shrink-0 text-brand-red" />
              <div className="min-w-0">
                <p className="text-xs font-semibold leading-tight text-brand-ink md:text-sm">
                  {s.address}
                </p>
                {s.phone && (
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-green-600">
                    <MessageCircle size={12} /> Pedidos por WhatsApp
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Banner de envío / WhatsApp */}
      <section className="px-4 md:px-6">
        <div className="flex items-center gap-3 rounded-2xl bg-brand-gold p-4 shadow-soft md:gap-6 md:rounded-3xl md:p-8">
          <div className="flex-1">
            <h3 className="text-base font-extrabold leading-tight text-brand-ink md:text-3xl">
              Hacé tu pedido por WhatsApp
            </h3>
            <p className="mt-1 text-xs text-brand-ink/70 md:mt-2 md:text-base">
              📱 3794 525617 · Envíos a domicilio en pedidos desde $200.000. Aceptamos todos los medios de pago.
            </p>
          </div>
          <span className="text-4xl md:text-6xl" aria-hidden>
            🛵
          </span>
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-brand-red px-3 py-2 text-xs font-bold text-white md:px-6 md:py-3 md:text-base"
          >
            Pedir por WhatsApp
          </a>
        </div>
      </section>

      {/* Features (mobile: fila de 3) */}
      <section className="px-4 pb-2 md:hidden">
        <div className="grid grid-cols-3 gap-2 text-center">
          <Feature icon={ShieldCheck} title="Calidad" subtitle="Garantizada" compact />
          <Feature icon={Bird} title="Pollo Fresco" subtitle="Todos los Días" compact />
          <Feature icon={Truck} title="Envíos" subtitle="Desde $200.000" compact />
        </div>
      </section>
    </div>
  );
}

/** Franja con la promesa de entrega: comprás en un turno, recibís en el otro. */
function FranjaEntrega() {
  return (
    <section className="px-4 md:px-6">
      <div className="grid gap-2 md:grid-cols-2 md:gap-4">
        <div className="flex items-center gap-3 rounded-2xl bg-brand-ink p-3 text-white shadow-soft md:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold text-brand-ink md:h-12 md:w-12">
            <Sunrise size={22} />
          </span>
          <p className="text-sm font-extrabold uppercase leading-snug tracking-wide md:text-lg">
            Comprá a la mañana, <span className="text-brand-gold">recibí a la tarde</span>
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-brand-ink p-3 text-white shadow-soft md:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold text-brand-ink md:h-12 md:w-12">
            <Sunset size={22} />
          </span>
          <p className="text-sm font-extrabold uppercase leading-snug tracking-wide md:text-lg">
            Comprá a la tarde, <span className="text-brand-gold">recibí por la mañana</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/** Hero institucional original, usado cuando la Super Oferta está desactivada. */
function HeroClasico() {
  return (
    <section className="relative mx-4 mt-3 overflow-hidden rounded-2xl md:mx-6 md:mt-6 md:rounded-3xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fondo-polleria.png"
        alt="El mejor pollo, siempre fresco y al mejor precio — Pollería Entre Ríos"
        className="h-56 w-full object-cover object-top sm:h-72 md:h-[420px]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent md:bg-gradient-to-r md:from-black/80 md:via-black/50 md:to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-end p-4 md:max-w-xl md:justify-center md:p-12">
        <span className="hidden text-sm font-semibold uppercase tracking-[0.3em] text-brand-gold md:block">
          Pollería Entre Ríos · Corrientes
        </span>
        <h1 className="font-display text-2xl font-bold uppercase leading-tight text-white md:mt-3 md:text-5xl">
          El mejor pollo,
          <br /> siempre fresco
          <br /> y al mejor precio
        </h1>
        <p className="mt-2 hidden text-white/80 md:block md:text-lg">
          Calidad, variedad y sabor para compartir en familia. Pedí online o por WhatsApp.
        </p>
        <div className="mt-3 flex gap-3 md:mt-6">
          <Link href="/productos" className="btn-gold md:px-6 md:py-3 md:text-base">
            Pedí ahora
          </Link>
          <Link
            href="/ofertas"
            className="hidden items-center justify-center rounded-lg border border-white/40 px-6 py-3 text-base font-bold text-white hover:bg-white/10 md:inline-flex"
          >
            Ver ofertas
          </Link>
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon: Icon,
  title,
  subtitle,
  compact = false,
}: {
  icon: typeof ShieldCheck;
  title: string;
  subtitle: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1">
        <Icon className="text-brand-red" size={26} />
        <span className="text-xs font-bold text-brand-ink">{title}</span>
        <span className="text-[11px] text-brand-ink/55">{subtitle}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-soft">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-red/10 text-brand-red">
        <Icon size={24} />
      </span>
      <div>
        <p className="font-bold text-brand-ink">{title}</p>
        <p className="text-sm text-brand-ink/55">{subtitle}</p>
      </div>
    </div>
  );
}
