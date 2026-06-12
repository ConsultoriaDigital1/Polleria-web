"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Phone, User, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

function IngresarForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, name: name.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "Algo salió mal. Probá de nuevo.");
      router.replace(next || "/cuenta");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-card">
          <h1 className="text-xl font-bold text-brand-ink">Ingresá con tu teléfono</h1>
          <p className="mt-1 text-sm text-brand-ink/55">
            Poné tu número para entrar o crear tu cuenta del Club Pollería.
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <form onSubmit={login} className="mt-5 space-y-3">
            <Field icon={Phone}>
              <input
                type="tel"
                autoFocus
                required
                inputMode="tel"
                placeholder="Ej: +54 11 5555 5555"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent text-brand-ink outline-none placeholder:text-brand-ink/35"
              />
            </Field>
            <Field icon={User}>
              <input
                type="text"
                placeholder="Tu nombre (si es tu primera vez)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-brand-ink outline-none placeholder:text-brand-ink/35"
              />
            </Field>
            <SubmitButton loading={loading}>Entrar</SubmitButton>
          </form>
        </div>

        <p className="mt-5 text-center text-xs text-brand-ink/45">
          <Link href="/" className="hover:text-brand-ink">
            Volver a la tienda
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, children }: { icon: typeof Phone; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-black/10 px-4 py-3 focus-within:border-brand-red">
      <Icon size={18} className="shrink-0 text-brand-red" />
      {children}
    </div>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-red py-3 text-sm font-semibold text-white transition hover:bg-brand-dark disabled:opacity-60"
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export default function IngresarPage() {
  return (
    <Suspense fallback={null}>
      <IngresarForm />
    </Suspense>
  );
}
