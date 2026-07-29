import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export const PRODUCT_IMAGE_PREFIX = "/uploads/products/";
export const MAX_PRODUCT_IMAGE_SIZE = 10 * 1024 * 1024;

const PRODUCT_IMAGE_DIR = path.join(process.cwd(), "public", "uploads", "products");

const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function hasImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return (
    mimeType === "image/webp" &&
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export async function saveProductImage(file: File): Promise<string> {
  const extension = MIME_EXTENSIONS[file.type];
  if (!extension) throw new Error("Solo se admiten imágenes JPG, PNG o WEBP.");
  if (file.size === 0 || file.size > MAX_PRODUCT_IMAGE_SIZE) {
    throw new Error("La imagen debe pesar menos de 10 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasImageSignature(buffer, file.type)) throw new Error("El archivo no es una imagen válida.");

  await mkdir(PRODUCT_IMAGE_DIR, { recursive: true });
  const filename = `${randomUUID()}.${extension}`;
  await writeFile(path.join(PRODUCT_IMAGE_DIR, filename), buffer, { flag: "wx" });
  return `${PRODUCT_IMAGE_PREFIX}${filename}`;
}

export function isProductUpload(image: string): boolean {
  const filename = image.startsWith(PRODUCT_IMAGE_PREFIX)
    ? image.slice(PRODUCT_IMAGE_PREFIX.length)
    : "";
  return Boolean(filename) && filename === path.basename(filename) && !filename.includes("..");
}

export async function deleteProductImage(image: string): Promise<void> {
  if (!isProductUpload(image)) return;
  const filename = image.slice(PRODUCT_IMAGE_PREFIX.length);
  try {
    await unlink(path.join(PRODUCT_IMAGE_DIR, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
