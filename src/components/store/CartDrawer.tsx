"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, MapPin, Minus, Plus, ShoppingBag, TicketPercent, Trash2, X } from "lucide-react";
import { useCart } from "@/store/cart";
import { useUI } from "@/store/ui";
import { formatARS } from "@/lib/format";
import { sucursales } from "@/lib/sucursales";
import { isInsideCorrientes, MIN_ENVIO_TOTAL } from "@/lib/geo";
import { MapPicker, type MapPoint } from "@/components/store/MapPicker";
import type { CouponQuote, DeliveryType } from "@/lib/types";

/** Número de WhatsApp del local (formato internacional, sin signos). */
const WHATSAPP_NUMERO = "5493794525617";

/** Paso del checkout: con qué medio quiere cerrar la compra el cliente. */
type Flujo = null | "whatsapp" | "mp";

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const close = useUI((s) => s.closeCart);
  const { lines, setQty, remove, total, clear } = useCart();
  const subtotal = total();
  const [couponCode, setCouponCode] = useState("");
  const [coupon, setCoupon] = useState<CouponQuote | null>(null);
  const [couponError, setCouponError] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const finalTotal = coupon?.total ?? subtotal;

  useEffect(() => {
    setCoupon(null);
    setCouponError("");
  }, [lines]);

  const applyCoupon = async () => {
    if (!couponCode.trim() || validatingCoupon) return;
    setValidatingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, items: lines.map((l) => ({ productId: l.product.id, qty: l.qty })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Cupón inválido.");
      setCoupon(data);
      setCouponCode(data.code);
    } catch (e) {
      setCoupon(null);
      setCouponError(e instanceof Error ? e.message : "Cupón inválido.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const [flujo, setFlujoRaw] = useState<Flujo>(null);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);

  // WhatsApp: sucursal de retiro (flujo clásico).
  const [sucursalId, setSucursalId] = useState("");
  const [sucursalError, setSucursalError] = useState(false);

  // Mercado Pago: datos de contacto + entrega.
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [entrega, setEntrega] = useState<DeliveryType>("retiro");
  const [direccion, setDireccion] = useState("");
  const [punto, setPunto] = useState<MapPoint | null>(null);

  const setFlujo = (f: Flujo) => {
    setErrorPago(null);
    setFlujoRaw(f);
  };

  // ---- Validaciones del flujo Mercado Pago ----
  const esEnvio = entrega === "envio";
  const nombreValido = nombre.trim().length >= 2;
  const telefonoValido = telefono.replace(/\D/g, "").length >= 6;
  const direccionValida = direccion.trim().length >= 4;
  const dentroDeZona = punto !== null && isInsideCorrientes(punto.lat, punto.lng);
  const alcanzaMinimo = !esEnvio || subtotal >= MIN_ENVIO_TOTAL;
  const faltaParaEnvio = Math.max(0, MIN_ENVIO_TOTAL - subtotal);

  const mpListo =
    nombreValido &&
    telefonoValido &&
    (esEnvio ? direccionValida && punto !== null && dentroDeZona && alcanzaMinimo : sucursalId !== "");

  const enviarPedidoWhatsApp = () => {
    if (!sucursalId) {
      setSucursalError(true);
      return;
    }
    setSucursalError(false);

    const sucursal = sucursales.find((s) => s.id === sucursalId);
    const items = lines
      .map((l) => `• ${l.qty}x ${l.product.name} — ${formatARS(l.qty * l.product.price)}`)
      .join("\n");
    const mensaje =
      `*PEDIDO DE LA WEB* 🍗\n\n` +
      `${items}\n\n` +
      (coupon ? `*Cupón ${coupon.code}:* ${coupon.description}\n*Descuento:* -${formatARS(coupon.discount)}\n` : "") +
      `*Total:* ${formatARS(finalTotal)}\n` +
      `*Sucursal de retiro:* ${sucursal?.name} (${sucursal?.address})`;

    const url = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
  };

  // Inicia el pago: crea el pedido + preferencia en el backend y redirige a MP.
  const pagarConMercadoPago = async () => {
    if (!mpListo || pagando) return;
    setErrorPago(null);
    setPagando(true);
    try {
      const res = await fetch("/api/checkout/mercadopago", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({
            productId: l.product.id,
            qty: l.qty,
            name: l.product.name,
            price: l.product.price,
          })),
          entrega,
          sucursalId: esEnvio ? undefined : sucursalId,
          direccion: esEnvio ? direccion.trim() : undefined,
          lat: esEnvio ? punto?.lat : undefined,
          lng: esEnvio ? punto?.lng : undefined,
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          couponCode: coupon?.code,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "No pudimos iniciar el pago.");
      }
      window.location.href = data.url as string;
    } catch (e) {
      setErrorPago(e instanceof Error ? e.message : "No pudimos iniciar el pago.");
      setPagando(false);
    }
  };

  return (
    <>
      <div
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col bg-white shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/5 px-4 py-3">
          <h2 className="flex items-center gap-2 font-semibold text-brand-ink">
            <ShoppingBag size={20} className="text-brand-red" /> Tu pedido
          </h2>
          <button onClick={close} aria-label="Cerrar" className="rounded-lg p-1 hover:bg-black/5">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-brand-ink/50">
              <ShoppingBag size={42} className="mb-3 opacity-40" />
              <p className="font-medium">Tu carrito está vacío</p>
              <p className="text-sm">Agregá productos para empezar tu pedido.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {lines.map((l) => (
                <li key={l.product.id} className="flex gap-3 rounded-xl border border-black/5 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={l.product.image}
                    alt={l.product.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold">{l.product.name}</span>
                      <button
                        onClick={() => remove(l.product.id)}
                        className="text-brand-ink/40 hover:text-brand-red"
                        aria-label="Quitar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <span className="text-sm text-brand-ink/60">{formatARS(l.product.price)}</span>
                    <div className="mt-auto flex items-center gap-2">
                      <button
                        onClick={() => setQty(l.product.id, l.qty - 1)}
                        className="rounded-md border border-black/10 p-1 hover:bg-black/5"
                        aria-label="Restar"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                      <button
                        onClick={() => setQty(l.product.id, l.qty + 1)}
                        className="rounded-md border border-black/10 p-1 hover:bg-black/5"
                        aria-label="Sumar"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="max-h-[70%] overflow-y-auto border-t border-black/5 px-4 py-3">
            <div className="space-y-1 text-sm">
              <div className="mb-3 rounded-xl border border-dashed border-brand-red/30 bg-brand-cream/60 p-3">
                <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-ink/70"><TicketPercent size={14} className="text-brand-red" /> ¿Tenés un cupón?</label>
                <div className="flex gap-2">
                  <input value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCoupon(null); }} onKeyDown={(e) => { if (e.key === "Enter") applyCoupon(); }} placeholder="Ingresá el código" className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm uppercase" />
                  <button type="button" onClick={applyCoupon} disabled={!couponCode.trim() || validatingCoupon} className="rounded-lg bg-brand-ink px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{validatingCoupon ? "…" : "Aplicar"}</button>
                </div>
                {coupon && <p className="mt-2 text-xs font-semibold text-emerald-700">✓ {coupon.description}</p>}
                {couponError && <p className="mt-2 text-xs font-semibold text-brand-red">{couponError}</p>}
              </div>
              {coupon && coupon.discount > 0 && <><div className="flex justify-between text-brand-ink/60"><span>Subtotal</span><span>{formatARS(subtotal)}</span></div><div className="flex justify-between font-semibold text-emerald-700"><span>Descuento</span><span>-{formatARS(coupon.discount)}</span></div></>}
              {coupon?.gift && <div className="flex justify-between font-semibold text-emerald-700"><span>Regalo</span><span>{coupon.gift.qty}x {coupon.gift.name}</span></div>}
              <div className="flex justify-between pt-1 text-base font-bold text-brand-ink">
                <span>Total</span>
                <span>{formatARS(finalTotal)}</span>
              </div>
            </div>

            {flujo === null && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-brand-ink/50">
                  🛵 Comprá a la mañana, recibí a la tarde · comprá a la tarde, recibí por la
                  mañana. Elegí cómo querés cerrar tu pedido:
                </p>

                {/* Pago online con Mercado Pago */}
                <button
                  type="button"
                  onClick={() => setFlujo("mp")}
                  className="flex w-full items-center justify-center rounded-xl border border-black/10 bg-white px-3 py-3 shadow-soft transition hover:border-[#009ee3] hover:shadow-md"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/mercadopago.svg" alt="Pagar con Mercado Pago" className="h-8 w-auto" />
                </button>

                {/* Cierre por WhatsApp */}
                <button
                  type="button"
                  onClick={() => setFlujo("whatsapp")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:brightness-95"
                >
                  <WhatsAppIcon /> Terminar pedido por WhatsApp
                </button>
              </div>
            )}

            {flujo === "whatsapp" && (
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setFlujo(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink/50 hover:text-brand-ink"
                >
                  <ArrowLeft size={13} /> Elegir otro medio
                </button>
                <label className="block">
                  <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-ink/70">
                    <MapPin size={14} className="text-brand-red" /> Sucursal de retiro
                  </span>
                  <select
                    value={sucursalId}
                    onChange={(e) => {
                      setSucursalId(e.target.value);
                      setSucursalError(false);
                    }}
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm ${
                      sucursalError ? "border-brand-red" : "border-black/10"
                    }`}
                  >
                    <option value="">Seleccioná una sucursal…</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.address}
                      </option>
                    ))}
                  </select>
                  {sucursalError && (
                    <p className="mt-1 text-xs text-brand-red">
                      Tenés que elegir una sucursal para finalizar el pedido.
                    </p>
                  )}
                </label>
                <button
                  onClick={enviarPedidoWhatsApp}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-bold text-white shadow-soft transition hover:brightness-95"
                >
                  <WhatsAppIcon /> Enviar pedido por WhatsApp
                </button>
              </div>
            )}

            {flujo === "mp" && (
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setFlujo(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-ink/50 hover:text-brand-ink"
                >
                  <ArrowLeft size={13} /> Elegir otro medio
                </button>

                <div className="space-y-3 rounded-2xl border border-black/5 bg-brand-cream/60 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-brand-ink/70">
                        Tu nombre
                      </span>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre y apellido"
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold text-brand-ink/70">
                        Tu WhatsApp
                      </span>
                      <input
                        type="tel"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="3794 ..."
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-brand-ink/70">
                      Forma de entrega
                    </span>
                    <select
                      value={entrega}
                      onChange={(e) => setEntrega(e.target.value as DeliveryType)}
                      className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                    >
                      <option value="retiro">🏪 Retiro en sucursal</option>
                      <option value="envio">🛵 Envío a domicilio (Corrientes capital)</option>
                    </select>
                  </label>

                  {!esEnvio && (
                    <label className="block">
                      <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-ink/70">
                        <MapPin size={14} className="text-brand-red" /> Sucursal de retiro
                      </span>
                      <select
                        value={sucursalId}
                        onChange={(e) => setSucursalId(e.target.value)}
                        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                      >
                        <option value="">Seleccioná una sucursal…</option>
                        {sucursales.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} · {s.address}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {esEnvio && (
                    <>
                      {!alcanzaMinimo && (
                        <p className="rounded-lg bg-brand-gold/15 px-3 py-2 text-xs font-semibold text-brand-ink">
                          El envío a domicilio es para pedidos desde{" "}
                          {formatARS(MIN_ENVIO_TOTAL)}. Te faltan {formatARS(faltaParaEnvio)}.
                        </p>
                      )}
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-brand-ink/70">
                          Dirección de entrega
                        </span>
                        <input
                          type="text"
                          value={direccion}
                          onChange={(e) => setDireccion(e.target.value)}
                          placeholder="Ej: Blas Parera 1749, piso/depto"
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                        />
                      </label>
                      <div>
                        <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-brand-ink/70">
                          <MapPin size={14} className="text-brand-red" /> Confirmá el punto exacto
                          en el mapa
                        </span>
                        <MapPicker value={punto} onChange={setPunto} searchQuery={direccion} />
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={pagarConMercadoPago}
                  disabled={!mpListo || pagando}
                  className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-soft transition ${
                    !mpListo || pagando
                      ? "cursor-not-allowed bg-black/20"
                      : "bg-[#009ee3] hover:brightness-95"
                  }`}
                >
                  {pagando && <Loader2 size={16} className="animate-spin" />}
                  {pagando
                    ? "Redirigiendo a Mercado Pago…"
                    : !nombreValido || !telefonoValido
                      ? "Completá tus datos"
                      : esEnvio && !alcanzaMinimo
                        ? `Mínimo ${formatARS(MIN_ENVIO_TOTAL)} para envío`
                        : esEnvio && (!direccionValida || !punto)
                          ? "Completá dirección y mapa"
                          : esEnvio && !dentroDeZona
                            ? "Punto fuera de Corrientes"
                            : !esEnvio && !sucursalId
                              ? "Elegí una sucursal"
                              : "Pagar con Mercado Pago"}
                </button>

                {errorPago && (
                  <p className="rounded-lg bg-brand-red/10 px-3 py-2 text-center text-xs font-semibold text-brand-red">
                    {errorPago}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={clear}
              className="mt-2 w-full text-center text-xs text-brand-ink/50 hover:text-brand-red"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function WhatsAppIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.9-4.44 9.9-9.9 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}
