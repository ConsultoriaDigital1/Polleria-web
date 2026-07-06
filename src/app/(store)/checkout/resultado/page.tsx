"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";
import { useCart } from "@/store/cart";

type Estado = "verificando" | "aprobado" | "pendiente" | "rechazado";

// Estado que Mercado Pago manda en la URL (render inmediato).
function clasificarMp(status: string): Estado {
  if (status === "approved") return "aprobado";
  if (status === "pending" || status === "in_process") return "pendiente";
  if (!status) return "verificando";
  return "rechazado";
}

// Estado interno del pedido (devuelto por /confirm) -> estado visual.
function mapEstadoInterno(estado: string): Estado | null {
  if (estado === "en_preparacion") return "aprobado";
  if (estado === "cancelado") return "rechazado";
  if (estado === "pendiente") return "pendiente";
  return null;
}

function ResultadoContenido() {
  const params = useSearchParams();
  const clear = useCart((s) => s.clear);

  // MP agrega status/payment_id/external_reference al volver del checkout.
  const urlStatus = params.get("status") || params.get("collection_status") || "";
  const paymentId = params.get("payment_id") || params.get("collection_id") || "";
  const orderId = params.get("external_reference") || params.get("orderId") || "";
  // Modo demo: el pago ya quedó aprobado en el servidor, no hace falta verificar.
  const demo = params.get("demo") === "1";

  const [estado, setEstado] = useState<Estado>(() =>
    demo ? "aprobado" : clasificarMp(urlStatus)
  );
  const yaCorrio = useRef(false);

  useEffect(() => {
    if (yaCorrio.current) return;
    yaCorrio.current = true;

    // Si MP ya dijo "aprobado" en la URL, vaciamos el carrito sin esperar.
    if (demo || clasificarMp(urlStatus) === "aprobado") clear();

    // En demo no verificamos contra MP: el pedido ya está aprobado.
    if (demo) {
      setEstado("aprobado");
      return;
    }

    if (!orderId) {
      setEstado((prev) => (prev === "verificando" ? "pendiente" : prev));
      return;
    }

    // Verificamos el estado REAL contra el backend (consulta a MP) y
    // actualizamos la UI con lo confirmado.
    fetch("/api/checkout/mercadopago/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, paymentId }),
    })
      .then((r) => r.json())
      .then((d) => {
        const e = d?.estado ? mapEstadoInterno(d.estado) : null;
        if (e) {
          setEstado(e);
          if (e === "aprobado") clear();
        } else {
          setEstado((prev) => (prev === "verificando" ? "pendiente" : prev));
        }
      })
      .catch(() => {
        setEstado((prev) => (prev === "verificando" ? "pendiente" : prev));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ui = {
    verificando: {
      color: "text-brand-ink/60",
      bg: "bg-black/5",
      titulo: "Verificando el pago…",
      texto:
        "Estamos confirmando el estado de tu pago. Aguardá un instante, no cierres la ventana.",
      icon: <Loader2 size={40} className="animate-spin" />,
    },
    aprobado: {
      color: "text-green-600",
      bg: "bg-green-50",
      titulo: "¡Pago aprobado! 🍗",
      texto:
        "Recibimos tu pago y ya estamos preparando tu pedido. Te vamos a avisar por WhatsApp cuando salga de la sucursal.",
      icon: <CheckCircle2 size={40} />,
    },
    pendiente: {
      color: "text-brand-gold",
      bg: "bg-brand-gold/10",
      titulo: "Pago pendiente",
      texto:
        "Tu pago está siendo procesado. En cuanto se acredite empezamos a preparar tu pedido. Podés cerrar esta ventana.",
      icon: <Clock3 size={40} />,
    },
    rechazado: {
      color: "text-brand-red",
      bg: "bg-brand-red/10",
      titulo: "No se pudo completar el pago",
      texto:
        "El pago fue rechazado o cancelado. Podés volver al carrito e intentar de nuevo, o terminar tu pedido por WhatsApp.",
      icon: <XCircle size={40} />,
    },
  }[estado];

  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-5 py-12 text-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full ${ui.bg} ${ui.color}`}>
        {ui.icon}
      </div>

      <h1 className={`mt-6 text-2xl font-extrabold ${ui.color}`}>{ui.titulo}</h1>
      <p className="mt-3 max-w-md text-sm text-brand-ink/70">{ui.texto}</p>

      {paymentId && (
        <p className="mt-2 text-xs text-brand-ink/40">N° de operación: {paymentId}</p>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/productos" className="btn-primary px-6 py-3">
          Seguir comprando
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-black/10 px-6 py-3 text-sm font-semibold text-brand-ink/70 hover:bg-black/5"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}

export default function ResultadoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-brand-ink/60">
          Verificando el pago…
        </div>
      }
    >
      <ResultadoContenido />
    </Suspense>
  );
}
