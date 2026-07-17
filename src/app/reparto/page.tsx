"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  Package,
  RefreshCw,
} from "lucide-react";

interface Stop {
  id: string | null;
  code: string;
  routeSeq: number | null;
  customer: string;
  phone: string | null;
  address: string | null;
  status: "en_camino" | "entregado" | string;
  isNext: boolean;
  deliveredAt: string | null;
  mapUrl: string | null;
}

interface RutaResponse {
  stops: Stop[];
  pendientes: number;
  entregados: number;
  total: number;
  routeMapUrl: string | null;
  /** Nombre del repartidor logueado (null si mira un admin). */
  repartidor: string | null;
}

function horaCorta(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso)
  );
}

const LOGIN_URL = "/admin/login?next=%2Freparto";

export default function RepartoPage() {
  const [data, setData] = useState<RutaResponse | null>(null);
  const [cargando, setCargando] = useState(true);
  const [sinSesion, setSinSesion] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const cargarRuta = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/reparto/ruta", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.status === 401) {
        setSinSesion(true);
        setData(null);
        return;
      }
      if (!res.ok) throw new Error(json?.error || "No se pudo cargar la ruta.");
      setSinSesion(false);
      setData(json as RutaResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar la ruta.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarRuta();
    // Refresco automático para reflejar cambios (p. ej. el local cierra otro lote).
    const t = setInterval(cargarRuta, 20000);
    return () => clearInterval(t);
  }, [cargarRuta]);

  const salir = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* sin conexión: igual mandamos al login */
    }
    window.location.href = LOGIN_URL;
  };

  const confirmar = async () => {
    const c = code.trim();
    if (!c || confirmando) return;
    setConfirmando(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/reparto/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) {
        setFeedback({ ok: true, msg: `✅ Entregado a ${json.customer} (${json.pedido}).` });
        setCode("");
        await cargarRuta();
      } else {
        setFeedback({ ok: false, msg: json?.error || "No se pudo confirmar." });
      }
    } catch {
      setFeedback({ ok: false, msg: "Error de conexión. Probá de nuevo." });
    } finally {
      setConfirmando(false);
      inputRef.current?.focus();
    }
  };

  // Sin sesión: invitación a entrar con el usuario del equipo.
  if (!cargando && sinSesion) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-4 bg-brand-cream px-6 text-center">
        <Navigation size={40} className="text-brand-red" />
        <h1 className="text-xl font-extrabold text-brand-ink">Reparto</h1>
        <p className="text-sm text-brand-ink/60">
          Iniciá sesión con tu usuario y contraseña para ver las entregas que tenés asignadas.
        </p>
        <a
          href={LOGIN_URL}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-red px-5 py-3 text-sm font-bold text-white shadow-soft"
        >
          <LogIn size={16} /> Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-brand-cream px-4 py-5">
      <header className="mb-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Navigation size={22} className="flex-none text-brand-red" />
            <h1 className="truncate text-lg font-extrabold text-brand-ink">
              {data?.repartidor ? `Reparto de ${data.repartidor}` : "Reparto"}
            </h1>
          </div>
          {data?.repartidor && (
            <p className="text-xs text-brand-ink/55">Estas son tus entregas asignadas.</p>
          )}
        </div>
        <div className="flex flex-none items-center gap-1.5">
          <button
            onClick={() => {
              setCargando(true);
              cargarRuta();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-brand-ink"
          >
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            onClick={salir}
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-ink/70"
            aria-label="Cerrar sesión"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      {/* Confirmar entrega por código */}
      <div className="mb-4 rounded-2xl bg-white p-4 shadow-soft">
        <label className="mb-1 block text-sm font-semibold text-brand-ink">
          Código del cliente
        </label>
        <p className="mb-2 text-xs text-brand-ink/55">
          Pedile al cliente el código de 4 dígitos e ingresalo para confirmar la entrega.
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            onKeyDown={(e) => e.key === "Enter" && confirmar()}
            inputMode="numeric"
            placeholder="0000"
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-3 text-center text-2xl font-bold tracking-[0.3em] text-brand-ink"
          />
          <button
            onClick={confirmar}
            disabled={confirmando || code.trim().length < 4}
            className={`flex-none rounded-lg px-4 text-sm font-bold text-white transition ${
              confirmando || code.trim().length < 4
                ? "cursor-not-allowed bg-black/20"
                : "bg-brand-red hover:brightness-95"
            }`}
          >
            {confirmando ? <Loader2 size={18} className="animate-spin" /> : "Confirmar"}
          </button>
        </div>
        {feedback && (
          <p
            className={`mt-2 rounded-lg px-3 py-2 text-sm font-semibold ${
              feedback.ok ? "bg-emerald-50 text-emerald-700" : "bg-brand-red/10 text-brand-red"
            }`}
          >
            {feedback.msg}
          </p>
        )}
      </div>

      {data?.routeMapUrl && (
        <a
          href={data.routeMapUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-3 text-sm font-bold text-white shadow-soft"
        >
          <Navigation size={16} /> Abrir ruta en Google Maps
        </a>
      )}

      {/* Lista de paradas */}
      {cargando ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-brand-ink/60">
          <Loader2 size={18} className="animate-spin" /> Cargando ruta…
        </div>
      ) : error ? (
        <p className="rounded-xl bg-brand-red/10 px-3 py-3 text-center text-sm font-semibold text-brand-red">
          {error}
        </p>
      ) : !data || data.stops.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center text-brand-ink/55">
          <Package size={36} className="opacity-40" />
          <p className="text-sm font-medium">No tenés entregas asignadas ahora.</p>
          <p className="text-xs">Cuando el local te cierre un reparto vas a ver la ruta acá.</p>
        </div>
      ) : (
        <>
          {/* Progreso del reparto */}
          <div className="mb-3 rounded-2xl bg-white p-4 shadow-soft">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-bold text-brand-ink">
                {data.entregados} de {data.total} entregados
              </span>
              <span className="text-brand-ink/55">{data.pendientes} sin entregar</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-brand-cream">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{
                  width: `${data.total > 0 ? Math.round((data.entregados / data.total) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <ol className="space-y-2">
            {data.stops.map((s) => {
              const entregado = s.status === "entregado";
              return (
                <li
                  key={s.id ?? s.code}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 shadow-soft ${
                    entregado
                      ? "border-emerald-100 bg-emerald-50/60"
                      : s.isNext
                        ? "border-brand-red bg-white ring-1 ring-brand-red/30"
                        : "border-black/5 bg-white"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-xs font-bold ${
                      entregado ? "bg-emerald-500 text-white" : "bg-brand-cream text-brand-ink"
                    }`}
                  >
                    {entregado ? <CheckCircle2 size={16} /> : (s.routeSeq ?? "–")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold text-brand-ink">
                      {s.customer}
                      {s.isNext && (
                        <span className="chip bg-brand-red/10 text-brand-red">Próximo</span>
                      )}
                      {entregado && horaCorta(s.deliveredAt) && (
                        <span className="chip bg-emerald-100 text-emerald-700">
                          Entregado {horaCorta(s.deliveredAt)}
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-brand-ink/60">{s.address}</p>
                  </div>
                  {s.mapUrl && !entregado && (
                    <a
                      href={s.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-none rounded-lg border border-black/10 p-2 text-brand-red"
                      aria-label="Abrir en el mapa"
                    >
                      <MapPin size={16} />
                    </a>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}
    </div>
  );
}
