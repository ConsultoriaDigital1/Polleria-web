"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCcw, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const INITIAL_MESSAGE =
  "Puedo analizar ventas, precios históricos, ofertas, stock, clientes, visitas y tiempos de entrega. ¿Qué querés revisar?";

const SUGGESTIONS = [
  "¿Cómo variaron los precios y qué ofertas funcionaron mejor?",
  "¿Cuánto tarda cada etapa de preparación y entrega?",
  "Dame tres mejoras concretas para el negocio",
];

export function BusinessAIChat({ enabled }: { enabled: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    const content = text.trim();
    if (!content || loading || !enabled) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/admin/ai/reportes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1).slice(-12) }),
      });
      const data = (await response.json()) as { reply?: string; error?: string };
      if (!response.ok || !data.reply) throw new Error(data.error ?? "No pude responder.");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pude responder.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex h-[58vh] min-h-[28rem] max-h-[44rem] flex-col overflow-hidden rounded-2xl bg-white shadow-soft">
      <header className="flex items-center justify-between gap-3 border-b border-black/5 bg-brand-ink px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
            <Sparkles size={18} />
          </span>
          <div>
            <h2 className="text-sm font-semibold">Analista IA del negocio</h2>
            <p className="text-[11px] text-white/60">Consulta los datos actuales en cada respuesta</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessages([{ role: "assistant", content: INITIAL_MESSAGE }]);
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/65 hover:bg-white/10 hover:text-white"
        >
          <RotateCcw size={14} /> Nueva charla
        </button>
      </header>

      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto bg-[#faf9f7] p-4" aria-live="polite">
        {messages.map((message, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
              message.role === "user"
                ? "ml-auto bg-brand-red text-white"
                : "bg-white text-brand-ink shadow-sm ring-1 ring-black/5"
            )}
          >
            {message.content}
          </div>
        ))}
        {messages.length === 1 && enabled && (
          <div className="flex flex-wrap gap-2 pt-1">
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => sendMessage(suggestion)}
                className="rounded-full border border-brand-red/15 bg-white px-3 py-2 text-left text-xs font-medium text-brand-ink/65 transition hover:border-brand-red/40 hover:text-brand-red"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {loading && (
          <div className="flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-brand-ink/55 shadow-sm ring-1 ring-black/5">
            <Loader2 size={15} className="animate-spin" /> Analizando datos…
          </div>
        )}
        {!enabled && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Configurá la clave de IA del servidor para habilitar el chat.
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void sendMessage(input);
        }}
        className="flex items-end gap-2 border-t border-black/5 bg-white p-3"
      >
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={500}
          rows={2}
          disabled={!enabled || loading}
          placeholder="Preguntá por ventas, precios, ofertas, clientes o entregas…"
          aria-label="Consulta para el analista IA"
          className="max-h-28 min-h-[2.75rem] flex-1 resize-y rounded-xl bg-brand-cream px-4 py-3 text-sm text-brand-ink outline-none ring-brand-red/30 placeholder:text-brand-ink/40 focus:ring-2 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!enabled || loading || !input.trim()}
          aria-label="Enviar consulta"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-red text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <Send size={17} />
        </button>
      </form>
    </section>
  );
}
