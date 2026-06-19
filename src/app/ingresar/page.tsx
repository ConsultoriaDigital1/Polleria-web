"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, KeyRound, Phone, User, Loader2 } from "lucide-react";
import { Logo } from "@/components/Logo";

type Step = "phone" | "code";
const PHONE_PREFIX = "+549";
const PHONE_DIGITS_LENGTH = 10;

function IngresarForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [step, setStep] = useState<Step>("phone");
  const [phoneDigits, setPhoneDigits] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const phone = `${PHONE_PREFIX}${phoneDigits}`;

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (phoneDigits.length !== PHONE_DIGITS_LENGTH) {
      setError("Ingresá característica + número, sin 0 ni 15. Ej: 3794525617.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "No se pudo enviar el código.");
      setStep("code");
      setCode("");
      setNotice(
        json?.data?.delivery === "console"
          ? "Código generado. Revisá la consola del servidor."
          : "Te enviamos un código por WhatsApp. También queda visible en consola por ahora."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone, code, name: name.trim() || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error?.message ?? "El código no es válido.");
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
            {step === "phone"
              ? "Poné solo característica + número para recibir el código."
              : `Ingresá el código de 4 dígitos enviado a ${phone}.`}
          </p>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {notice && (
            <p className="mt-4 rounded-lg bg-brand-gold/15 px-3 py-2 text-sm text-brand-ink/70">
              {notice}
            </p>
          )}

          {step === "phone" ? (
            <form onSubmit={requestCode} className="mt-5 space-y-3">
              <Field icon={Phone}>
                <span className="shrink-0 font-semibold text-brand-ink">{PHONE_PREFIX}</span>
                <input
                  type="tel"
                  autoFocus
                  required
                  inputMode="tel"
                  maxLength={PHONE_DIGITS_LENGTH}
                  placeholder="3794525617"
                  value={phoneDigits}
                  onChange={(e) =>
                    setPhoneDigits(e.target.value.replace(/\D/g, "").slice(0, PHONE_DIGITS_LENGTH))
                  }
                  className="w-full bg-transparent text-brand-ink outline-none placeholder:text-brand-ink/35"
                />
              </Field>
              <p className="px-1 text-xs text-brand-ink/45">
                Se envía como {PHONE_PREFIX}3794525617. Sin 0 ni 15.
              </p>
              <Field icon={User}>
                <input
                  type="text"
                  placeholder="Tu nombre (si es tu primera vez)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-transparent text-brand-ink outline-none placeholder:text-brand-ink/35"
                />
              </Field>
              <SubmitButton loading={loading}>Enviar código</SubmitButton>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="mt-5 space-y-3">
              <Field icon={KeyRound}>
                <input
                  type="text"
                  autoFocus
                  required
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  placeholder="Código de 4 dígitos"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="w-full bg-transparent text-brand-ink outline-none placeholder:text-brand-ink/35"
                />
              </Field>
              <SubmitButton loading={loading}>Verificar código</SubmitButton>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                  setNotice(null);
                }}
                className="flex w-full items-center justify-center gap-2 py-2 text-sm font-semibold text-brand-ink/60"
              >
                <ArrowLeft size={16} /> Cambiar número
              </button>
            </form>
          )}
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

function Field({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
}) {
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
