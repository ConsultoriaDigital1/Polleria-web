"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Sparkles, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

const WHATSAPP_URL = "https://wa.me/543794525617";
const SALUDO =
  "¡Hola! Soy el asistente de Entre Ríos 🍗 Preguntame por productos, precios, sucursales o envíos.";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/**
 * Botones flotantes de la tienda: WhatsApp (abajo) y asistente de IA (arriba).
 * En mobile se levantan por encima de la BottomNav para no taparla.
 */
export function FloatingActions() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3 md:bottom-6">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar el asistente" : "Abrir el asistente"}
          aria-expanded={open}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-ink text-white shadow-card transition hover:scale-105 hover:bg-brand-red active:scale-95"
        >
          {open ? <X size={22} /> : <Sparkles size={22} />}
        </button>

        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Escribinos por WhatsApp"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card transition hover:scale-105 active:scale-95"
        >
          <MessageCircle size={26} strokeWidth={2.2} />
        </a>
      </div>

      {open && <ChatPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function ChatPanel({ onClose }: { onClose: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: SALUDO }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cerrar con Escape, como el carrito y el menú lateral.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // El saludo inicial es del cliente, no del modelo: no se manda.
        body: JSON.stringify({ messages: next.slice(1).slice(-12) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No pudimos responderte.");
      setMsgs([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No pudimos responderte.");
    } finally {
      setLoading(false);
    }
  }

  // El panel arranca justo arriba de la pila de botones (WhatsApp + IA), así no
  // tapa el botón que lo abre: la pila mide 56 + 12 + 48 px por encima de su
  // propio offset (bottom-24 en mobile, bottom-6 en escritorio).
  // El max-h evita que se salga por arriba en pantallas bajas (teléfono
  // horizontal, ventana chica): ahí el panel se achica en vez de desbordar.
  return (
    <div
      role="dialog"
      aria-label="Asistente de Pollería Entre Ríos"
      className="fixed bottom-56 right-4 z-40 flex h-[26rem] max-h-[calc(100dvh-15rem)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl2 bg-white shadow-card ring-1 ring-black/5 md:bottom-40 md:max-h-[calc(100dvh-11rem)]"
    >
      <header className="flex items-center gap-2 border-b border-black/5 bg-brand-cream px-4 py-3">
        <Sparkles size={18} className="text-brand-red" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-brand-ink">Asistente Entre Ríos</p>
          <p className="text-[11px] text-brand-ink/55">Respuestas generadas por IA</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-full p-1 text-brand-ink/50 transition hover:bg-black/5 hover:text-brand-ink"
        >
          <X size={18} />
        </button>
      </header>

      <div ref={scroller} className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={cn(
              "max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm",
              m.role === "user"
                ? "ml-auto bg-brand-red text-white"
                : "bg-brand-cream text-brand-ink"
            )}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 rounded-xl bg-brand-cream px-3 py-2 text-sm text-brand-ink/60">
            <Loader2 size={14} className="animate-spin" />
            Escribiendo…
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-black/5 p-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={500}
          placeholder="Escribí tu consulta…"
          className="flex-1 rounded-full bg-brand-cream px-4 py-2 text-sm text-brand-ink outline-none ring-brand-red/30 placeholder:text-brand-ink/40 focus:ring-2"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Enviar"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-red text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
