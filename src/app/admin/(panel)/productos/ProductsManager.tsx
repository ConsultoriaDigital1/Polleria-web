"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Pencil, Plus, X } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatARS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { saveProduct, toggleProductAvailability, type SaveProductState } from "./actions";

const categoryLabels: Record<string, string> = {
  cortes: "Cortes",
  cajones: "Cajones",
  rebozados: "Rebozados",
};

export function ProductsManager({ products }: { products: Product[] }) {
  // null = cerrado, undefined = crear nuevo, Product = editar
  const [editing, setEditing] = useState<Product | undefined | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">Productos</h1>
          <p className="text-sm text-brand-ink/55">{products.length} productos en el catálogo</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing(undefined)}>
          <Plus size={16} /> Agregar producto
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-brand-cream text-left text-xs uppercase tracking-wide text-brand-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 font-semibold">Precio</th>
                <th className="px-4 py-3 font-semibold">Stock</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-t border-black/5 hover:bg-brand-cream/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.image} alt={p.name} className="h-10 w-10 rounded-lg object-cover" />
                      <div>
                        <p className="font-semibold text-brand-ink">{p.name}</p>
                        <p className="text-xs text-brand-ink/50">{p.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-brand-ink/70">{categoryLabels[p.category]}</td>
                  <td className="px-4 py-3 font-medium text-brand-ink">
                    {formatARS(p.price)}
                    {p.oldPrice && (
                      <span className="ml-2 text-xs text-brand-ink/40 line-through">
                        {formatARS(p.oldPrice)}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-semibold",
                        p.stock > 0 ? "text-brand-ink" : "text-brand-red"
                      )}
                    >
                      {p.stock}
                    </span>
                    <span className="ml-1 text-xs text-brand-ink/50">u.</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleProductAvailability(p.id, !p.available)}
                      title="Cambiar disponibilidad"
                      className={cn(
                        "chip cursor-pointer",
                        p.available && p.stock > 0
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      )}
                    >
                      {!p.available ? "Pausado" : p.stock > 0 ? "A la venta" : "Sin stock"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(p)}
                      className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-semibold text-brand-ink/70 hover:bg-black/5"
                    >
                      <Pencil size={14} /> Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && <ProductModal product={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function ProductModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const [state, formAction, pending] = useActionState<SaveProductState, FormData>(saveProduct, {});
  const [imagePreview, setImagePreview] = useState(product?.image ?? "");
  const [imageError, setImageError] = useState("");
  const [processingImage, setProcessingImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  async function handleImageFile(file: File) {
    setImageError("");
    setProcessingImage(true);

    try {
      const image = await compressProductImage(file);
      setImagePreview(image);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : "No se pudo procesar la imagen.");
    } finally {
      setProcessingImage(false);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleImageFile(file);
    event.target.value = "";
  }

  function handleImageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleImageFile(file);
  }

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-soft"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-ink">
            {product ? `Editar: ${product.name}` : "Nuevo producto"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-brand-ink/50 hover:bg-black/5">
            <X size={18} />
          </button>
        </div>

        <form action={formAction} className="space-y-4 text-sm">
          {product && <input type="hidden" name="id" value={product.id} />}

          <Field label="Nombre">
            <input name="name" defaultValue={product?.name} required className="input-admin" />
          </Field>

          <Field label="Descripción">
            <textarea
              name="description"
              defaultValue={product?.description}
              rows={2}
              className="input-admin resize-none"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio (ARS)">
              <input
                name="price"
                type="number"
                min={1}
                step={1}
                defaultValue={product?.price}
                required
                className="input-admin"
              />
            </Field>
            <Field label="Precio anterior (oferta, opcional)">
              <input
                name="oldPrice"
                type="number"
                min={1}
                step={1}
                defaultValue={product?.oldPrice}
                className="input-admin"
              />
            </Field>
          </div>

          <Field label="Stock disponible (unidades)">
            <input
              name="stock"
              type="number"
              min={0}
              step={1}
              defaultValue={product?.stock ?? 0}
              required
              className="input-admin"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoría">
              <select
                name="category"
                defaultValue={product?.category ?? "cortes"}
                className="input-admin"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Etiqueta (opcional)">
              <input
                name="badge"
                defaultValue={product?.badge}
                placeholder="Ej.: Más vendido"
                className="input-admin"
              />
            </Field>
          </div>

          <Field label="Imagen del producto">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleImageChange}
            />
            <div
              role="button"
              tabIndex={0}
              onClick={() => imageInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") imageInputRef.current?.click();
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleImageDrop}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-3 transition-colors",
                dragActive
                  ? "border-brand-red bg-brand-red/5"
                  : "border-brand-ink/15 hover:border-brand-red/50 hover:bg-brand-cream/40"
              )}
            >
              {imagePreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="h-16 w-16 shrink-0 rounded-lg object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")}
                  onLoad={(e) => ((e.target as HTMLImageElement).style.visibility = "visible")}
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-cream text-2xl">
                  📷
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-brand-ink">
                  {processingImage ? "Procesando imagen…" : "Arrastrá una imagen acá"}
                </p>
                <p className="text-xs text-brand-ink/55">
                  o hacé clic para elegir un archivo · JPG, PNG o WEBP
                </p>
              </div>
            </div>
            <input
              name="image"
              value={imagePreview}
              onChange={(event) => {
                setImageError("");
                setImagePreview(event.target.value);
              }}
              placeholder="También podés pegar una URL o ruta (ej. /img/pollo.jpg)"
              required
              className="input-admin mt-2"
            />
            {imageError && <p className="mt-1 text-xs text-red-700">{imageError}</p>}
            <p className="mt-1 text-xs text-brand-ink/45">La imagen se ajusta automáticamente para que cargue rápido.</p>
          </Field>

          <label className="flex items-center gap-2 font-semibold text-brand-ink">
            <input
              name="available"
              type="checkbox"
              defaultChecked={product?.available ?? true}
              className="h-4 w-4 accent-brand-red"
            />
            Disponible para la venta
          </label>

          {state.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{state.error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-black/10 px-4 py-2 font-semibold text-brand-ink/70 hover:bg-black/5"
            >
              Cancelar
            </button>
            <button type="submit" disabled={pending || processingImage} className="btn-primary">
              {pending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;
const MAX_IMAGE_DATA_LENGTH = 750_000;

async function compressProductImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elegí un archivo de imagen.");
  }
  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new Error("La imagen debe pesar menos de 10 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("No se pudo leer la imagen."));
      image.src = objectUrl;
    });

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(source.naturalWidth, source.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo preparar la imagen.");
    context.drawImage(source, 0, 0, canvas.width, canvas.height);

    let quality = 0.84;
    let result = canvas.toDataURL("image/webp", quality);
    while (result.length > MAX_IMAGE_DATA_LENGTH && quality > 0.5) {
      quality -= 0.08;
      result = canvas.toDataURL("image/webp", quality);
    }
    if (result.length > MAX_IMAGE_DATA_LENGTH) {
      throw new Error("La imagen sigue siendo demasiado pesada. Elegí otra más chica.");
    }
    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-semibold text-brand-ink">{label}</span>
      {children}
    </label>
  );
}
