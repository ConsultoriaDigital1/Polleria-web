"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Gift, Minus, Plus, Check, Search, ArrowLeft, UserPlus, User } from "lucide-react";
import type { Customer, Product } from "@/lib/types";
import { formatARS, formatPoints } from "@/lib/format";
import { cn } from "@/lib/cn";
import { creditPoints, type CreditPointsState } from "./actions";

// Misma regla que el servidor (src/lib/repo.ts): 1 punto cada $10.
const PESOS_PER_POINT = 10;
const pointsForAmount = (amount: number) =>
  Number.isFinite(amount) && amount > 0 ? Math.floor(amount / PESOS_PER_POINT) : 0;

type Mode = "monto" | "productos";
type Step = "buscar" | "confirmar";

const onlyDigits = (s: string) => s.replace(/\D/g, "");
const normDoc = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

/** Busca un cliente por teléfono (tolerante a prefijos/formato) o documento. */
function matchCustomer(identifier: string, customers: Customer[]): Customer | null {
  const idDigits = onlyDigits(identifier);
  const idDoc = normDoc(identifier);
  if (!idDoc) return null;
  return (
    customers.find((c) => {
      const phone = onlyDigits(c.phone);
      const phoneMatch =
        idDigits.length >= 6 && phone.length >= 6 && (phone.endsWith(idDigits) || idDigits.endsWith(phone));
      const docMatch = c.document ? normDoc(c.document) === idDoc : false;
      return phoneMatch || docMatch;
    }) ?? null
  );
}

export function PuntosCalculator({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const [state, formAction, pending] = useActionState<CreditPointsState, FormData>(creditPoints, {});

  const [step, setStep] = useState<Step>("buscar");
  const [identifier, setIdentifier] = useState("");
  const [mode, setMode] = useState<Mode>("monto");
  const [amount, setAmount] = useState("");
  const [qtys, setQtys] = useState<Record<string, number>>({});

  // Resultado de la búsqueda: cliente existente o datos del nuevo.
  const [matched, setMatched] = useState<Customer | null>(null);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newDocument, setNewDocument] = useState("");
  const [searchError, setSearchError] = useState("");

  const productsTotal = useMemo(
    () => products.reduce((a, p) => a + p.price * (qtys[p.id] ?? 0), 0),
    [products, qtys]
  );
  const computedAmount = mode === "monto" ? Number(amount) || 0 : productsTotal;
  const previewPoints = pointsForAmount(computedAmount);

  const items = useMemo(
    () =>
      Object.entries(qtys)
        .filter(([, q]) => q > 0)
        .map(([productId, qty]) => ({ productId, qty })),
    [qtys]
  );

  function resetAll() {
    setStep("buscar");
    setIdentifier("");
    setAmount("");
    setQtys({});
    setMatched(null);
    setNewName("");
    setNewPhone("");
    setNewDocument("");
    setSearchError("");
  }

  // Tras una carga exitosa, volver al inicio limpio.
  useEffect(() => {
    if (state.ok) resetAll();
  }, [state.ok]);

  const setQty = (id: string, delta: number) =>
    setQtys((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] ?? 0) + delta) }));

  function goToConfirm() {
    setSearchError("");
    if (!identifier.trim()) return setSearchError("Ingresá un teléfono o documento.");
    if (previewPoints <= 0) return setSearchError("Cargá un monto o productos válidos.");

    const found = matchCustomer(identifier, customers);
    setMatched(found);
    if (!found) {
      // Prefijar teléfono o documento según lo que se haya tipeado.
      const digits = onlyDigits(identifier);
      const looksLikePhone = digits.length >= 9;
      setNewName("");
      setNewPhone(looksLikePhone ? identifier.trim() : "");
      setNewDocument(looksLikePhone ? "" : identifier.trim());
    }
    setStep("confirmar");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-brand-ink">Cargar puntos</h1>
        <p className="text-sm text-brand-ink/55">
          Buscá al cliente por teléfono o documento y cargá el monto (o los productos) de la compra —
          1 punto por cada {formatARS(PESOS_PER_POINT)}.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <form action={formAction} className="space-y-4 rounded-2xl bg-white p-5 shadow-soft lg:col-span-2">
          {/* ---------- PASO 1: buscar ---------- */}
          {step === "buscar" && (
            <>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-brand-ink">Teléfono o documento</span>
                <input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Ej. 3794123344 o 30123456"
                  className="input-admin"
                  autoFocus
                />
              </label>

              <div className="inline-flex rounded-xl bg-brand-cream p-1 text-sm font-semibold">
                {(["monto", "productos"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-lg px-4 py-1.5 transition",
                      mode === m ? "bg-white text-brand-ink shadow-soft" : "text-brand-ink/55"
                    )}
                  >
                    {m === "monto" ? "Por monto" : "Por productos"}
                  </button>
                ))}
              </div>

              {mode === "monto" ? (
                <label className="block text-sm">
                  <span className="mb-1 block font-semibold text-brand-ink">Monto de la compra</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="input-admin"
                  />
                </label>
              ) : (
                <div className="space-y-2">
                  <span className="block text-sm font-semibold text-brand-ink">Productos</span>
                  <ul className="divide-y divide-black/5 rounded-xl border border-black/10">
                    {products.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-brand-ink">{p.name}</p>
                          <p className="text-xs text-brand-ink/50">{formatARS(p.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQty(p.id, -1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/10 text-brand-ink/70 hover:bg-black/5"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-6 text-center font-semibold text-brand-ink">{qtys[p.id] ?? 0}</span>
                          <button
                            type="button"
                            onClick={() => setQty(p.id, 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/10 text-brand-ink/70 hover:bg-black/5"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </li>
                    ))}
                    {products.length === 0 && (
                      <li className="px-3 py-4 text-center text-sm text-brand-ink/50">
                        No hay productos cargados.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {searchError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{searchError}</p>
              )}

              <button type="button" onClick={goToConfirm} className="btn-primary">
                <Search size={16} /> Buscar cliente
              </button>
            </>
          )}

          {/* ---------- PASO 2: confirmar ---------- */}
          {step === "confirmar" && (
            <>
              {/* Campos que viajan al servidor */}
              <input type="hidden" name="mode" value={mode} />
              <input type="hidden" name="amount" value={mode === "monto" ? Number(amount) || 0 : 0} />
              <input type="hidden" name="items" value={JSON.stringify(items)} />
              {matched ? (
                <>
                  <input type="hidden" name="customerId" value={matched.id} />
                  <input type="hidden" name="customerName" value={matched.name} />
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                      <User size={16} /> Cliente encontrado
                    </p>
                    <p className="mt-1 text-lg font-bold text-brand-ink">{matched.name}</p>
                    <p className="text-sm text-brand-ink/55">
                      {matched.phone}
                      {matched.document ? ` · Doc. ${matched.document}` : ""} · Saldo:{" "}
                      {formatPoints(matched.points)} pts
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <input type="hidden" name="customerName" value={newName} />
                  <div className="rounded-xl bg-amber-50 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
                      <UserPlus size={16} /> Cliente nuevo
                    </p>
                    <p className="text-sm text-brand-ink/55">Completá los datos para registrarlo.</p>
                  </div>
                  <label className="block text-sm">
                    <span className="mb-1 block font-semibold text-brand-ink">Nombre</span>
                    <input
                      name="newName"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                      autoFocus
                      className="input-admin"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-brand-ink">Teléfono</span>
                      <input
                        name="newPhone"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        required
                        className="input-admin"
                      />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block font-semibold text-brand-ink">Documento (opcional)</span>
                      <input
                        name="newDocument"
                        value={newDocument}
                        onChange={(e) => setNewDocument(e.target.value)}
                        className="input-admin"
                      />
                    </label>
                  </div>
                </>
              )}

              <div className="rounded-xl border border-black/10 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-brand-ink/55">Monto</span>
                  <span className="font-semibold text-brand-ink">{formatARS(computedAmount)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-brand-ink/55">Puntos a acreditar</span>
                  <span className="font-bold text-brand-red">{formatPoints(previewPoints)}</span>
                </div>
              </div>

              {state.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep("buscar")}
                  className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-4 py-2 text-sm font-semibold text-brand-ink/70 hover:bg-black/5"
                >
                  <ArrowLeft size={16} /> Volver
                </button>
                <button type="submit" disabled={pending} className="btn-primary">
                  <Check size={16} /> {pending ? "Cargando…" : "Confirmar y cargar"}
                </button>
              </div>
            </>
          )}
        </form>

        {/* ---------- Panel lateral ---------- */}
        <div className="space-y-3 rounded-2xl bg-brand-ink p-5 text-white shadow-soft">
          <p className="text-sm text-white/60">Resumen del cálculo</p>
          <div className="space-y-1">
            <p className="text-sm text-white/70">Monto</p>
            <p className="text-2xl font-bold">{formatARS(computedAmount)}</p>
          </div>
          <div className="space-y-1 border-t border-white/10 pt-3">
            <p className="text-sm text-white/70">Puntos a acreditar</p>
            <p className="text-3xl font-bold text-brand-gold">{formatPoints(previewPoints)}</p>
          </div>
          {step === "confirmar" && (
            <div className="space-y-1 border-t border-white/10 pt-3 text-sm">
              <p className="text-white/70">{matched ? matched.name : newName || "Cliente nuevo"}</p>
              {matched && (
                <p className="text-white/50">
                  Saldo actual: {formatPoints(matched.points)} pts · {matched.tier}
                </p>
              )}
            </div>
          )}
          {state.ok && state.result && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-200">
              <Check size={16} /> {formatPoints(state.result.points)} pts a {state.result.customerName}.
              Saldo: {formatPoints(state.result.total)} pts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
