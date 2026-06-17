import Link from "next/link";
import { ShieldCheck, Bird, Truck, MapPin, MessageCircle } from "lucide-react";
import { listProducts, listNovedades } from "@/lib/repo";
import { PromoCarousel } from "@/components/store/PromoCarousel";
import { ProductCatalog } from "@/components/store/ProductCatalog";
import { sucursales } from "@/lib/sucursales";

export const dynamic = "force-dynamic";

const WHATSAPP_URL = "https://wa.me/543794525617";

export default async function HomePage() {
  const productos = await listProducts();
  const destacados = productos.slice(0, 8);
  const novedades = await listNovedades(true);

  return (
    <div className="space-y-8 md:space-y-14">
      {/* Hero */}
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

      {/* Features (escritorio: fila de 4 tarjetas) */}
      <section className="hidden px-6 md:block">
        <div className="grid grid-cols-4 gap-4">
          <Feature icon={ShieldCheck} title="Calidad garantizada" subtitle="Productos seleccionados" />
          <Feature icon={Bird} title="Pollo fresco" subtitle="Todos los días" />
          <Feature icon={Truck} title="Envío a domicilio" subtitle="En pedidos desde $200.000" />
          <Feature icon={MapPin} title="8 sucursales" subtitle="En toda la ciudad" />
        </div>
      </section>

      {/* Productos destacados */}
      <section className="px-4 md:px-6">
        <div className="mb-3 flex items-center justify-between md:mb-6">
          <h2 className="relative pb-1 text-lg font-bold text-brand-ink md:text-2xl">
            Promos del día
            <span className="absolute bottom-0 left-0 h-0.5 w-12 rounded bg-brand-red md:h-1 md:w-16" />
          </h2>
          <Link href="/productos" className="text-sm font-semibold text-brand-red md:text-base">
            Ver todo
          </Link>
        </div>
        <PromoCarousel products={destacados} />
      </section>

      {/* Novedades (editables desde /admin/novedades) */}
      {novedades.length > 0 && (
        <section className="px-4 md:px-6">
          <div className="mb-3 md:mb-6">
            <h2 className="relative pb-1 text-lg font-bold uppercase text-brand-ink md:text-2xl">
              Novedades
              <span className="absolute bottom-0 left-0 h-0.5 w-12 rounded bg-brand-red md:h-1 md:w-16" />
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 md:gap-5">
            {novedades.map((n) => {
              const img = (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={n.image}
                  alt={n.title ?? "Novedad de Pollería Entre Ríos"}
                  className="w-full rounded-2xl shadow-soft md:rounded-3xl"
                  loading="lazy"
                />
              );
              return n.link ? (
                <Link key={n.id} href={n.link} className="block transition hover:opacity-95">
                  {img}
                </Link>
              ) : (
                <div key={n.id}>{img}</div>
              );
            })}
          </div>
        </section>
      )}

      {/* Catálogo completo */}
      <section className="px-4 md:px-6">
        <div className="mb-3 md:mb-6">
          <h2 className="relative pb-1 text-lg font-bold text-brand-ink md:text-2xl">
            Nuestro catálogo
            <span className="absolute bottom-0 left-0 h-0.5 w-12 rounded bg-brand-red md:h-1 md:w-16" />
          </h2>
        </div>
        <div className="space-y-4">
          <ProductCatalog products={productos} />
        </div>
      </section>

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
