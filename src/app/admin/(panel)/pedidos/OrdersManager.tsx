"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { deliveryEstimateLabel } from "@/lib/entrega";
import { formatARS, formatDateTime } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

type Filter =
  | "todos"
  | "pagados"
  | "no_pagado"
  | "en_preparacion"
  | "en_camino"
  | "entregado"
  | "cancelado";

const paidStatuses: OrderStatus[] = ["en_preparacion", "en_camino", "entregado"];

const filters: { value: Filter; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pagados", label: "Pagados" },
  { value: "no_pagado", label: "No pagados" },
  { value: "en_preparacion", label: "En preparación" },
  { value: "en_camino", label: "En camino" },
  { value: "entregado", label: "Entregados" },
  { value: "cancelado", label: "Cancelados" },
];

const paymentLabels: Record<Order["payment"], string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  mercadopago: "Mercado Pago",
  transferencia: "Transferencia",
};

function isPaid(order: Order): boolean {
  return paidStatuses.includes(order.status);
}

function matchesFilter(order: Order, filter: Filter): boolean {
  if (filter === "todos") return true;
  if (filter === "pagados") return isPaid(order);
  return order.status === filter;
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
}

function matchesSearch(order: Order, query: string): boolean {
  if (!query) return true;
  const values = [
    order.id,
    order.customer,
    order.phone,
    order.address,
    order.deliverySlot,
    order.deliveryDate,
    paymentLabels[order.payment],
    order.status.replaceAll("_", " "),
    order.total.toString(),
    ...order.items.flatMap((item) => [item.name, item.productId]),
  ];
  return normalize(values.filter(Boolean).join(" ")).includes(normalize(query));
}

function paymentState(order: Order): { label: string; className: string } {
  if (isPaid(order)) {
    return { label: "Pagado", className: "bg-emerald-100 text-emerald-700" };
  }
  if (order.status === "cancelado") {
    return { label: "Cancelado", className: "bg-red-100 text-red-700" };
  }
  return { label: "No pagado", className: "bg-orange-100 text-orange-700" };
}

export function OrdersManager({ orders }: { orders: Order[] }) {
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");

  const visibleOrders = useMemo(
    () => orders.filter((order) => matchesFilter(order, filter) && matchesSearch(order, query.trim())),
    [filter, orders, query]
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        filters.map(({ value }) => [
          value,
          orders.filter((order) => matchesFilter(order, value)).length,
        ])
      ) as Record<Filter, number>,
    [orders]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Pedidos</h1>
          <p className="text-sm text-brand-ink/55">
            {visibleOrders.length === orders.length
              ? `${orders.length} pedidos`
              : `${visibleOrders.length} de ${orders.length} pedidos`}
          </p>
        </div>
        <button className="btn-primary">Nuevo pedido</button>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-soft">
        <div className="relative max-w-xl">
          <Search
            size={18}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-ink/40"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por pedido, cliente, teléfono, producto o dirección"
            aria-label="Buscar pedidos"
            className="w-full rounded-xl border border-black/10 bg-brand-cream py-2.5 pl-10 pr-10 text-sm text-brand-ink outline-none transition focus:border-brand-red/50"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-brand-ink/45 hover:bg-black/5 hover:text-brand-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar pedidos por estado">
          {filters.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                filter === value
                  ? "bg-brand-red text-white"
                  : "bg-brand-cream text-brand-ink/65 hover:bg-brand-red/10 hover:text-brand-red"
              )}
            >
              {label}
              <span className={filter === value ? "text-white/75" : "text-brand-ink/40"}>
                {counts[value]}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream text-left text-xs uppercase tracking-wide text-brand-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Pedido</th>
                <th className="px-4 py-3 font-semibold">Cliente</th>
                <th className="px-4 py-3 font-semibold">Detalle</th>
                <th className="px-4 py-3 font-semibold">Entrega</th>
                <th className="px-4 py-3 font-semibold">Pago</th>
                <th className="px-4 py-3 font-semibold">Creado</th>
                <th className="px-4 py-3 font-semibold">Pago confirmado</th>
                <th className="px-4 py-3 font-semibold">Cancelado</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => {
                const payment = paymentState(order);
                return (
                  <tr key={order.id} className="border-t border-black/5 hover:bg-brand-cream/50">
                    <td className="px-4 py-3 font-semibold text-brand-ink">{order.id}</td>
                    <td className="px-4 py-3 text-brand-ink/80">
                      <p>{order.customer}</p>
                      {order.phone && (
                        <a
                          href={`tel:${order.phone}`}
                          className="mt-0.5 block whitespace-nowrap text-xs font-semibold text-brand-red hover:underline"
                        >
                          {order.phone}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-ink/60">
                      {order.items.map((item) => `${item.qty}× ${item.name}`).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-brand-ink/70">
                      {deliveryEstimateLabel(order.deliverySlot, order.deliveryDate) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-brand-ink/70">
                      <p className="whitespace-nowrap">{paymentLabels[order.payment]}</p>
                      <span
                        className={cn(
                          "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          payment.className
                        )}
                      >
                        {payment.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-brand-ink/60">
                      {formatDateTime(order.date)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-brand-ink/60">
                      {order.paidAt ? formatDateTime(order.paidAt) : "—"}
                    </td>
                    <td
                      className={cn(
                        "whitespace-nowrap px-4 py-3 font-medium",
                        order.status === "no_pagado" ? "text-orange-600" : "text-brand-red"
                      )}
                    >
                      {order.cancelledAt ? formatDateTime(order.cancelledAt) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-brand-ink">
                      {formatARS(order.total)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                );
              })}
              {visibleOrders.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-brand-ink/50">
                    No hay pedidos que coincidan con la búsqueda y el filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
