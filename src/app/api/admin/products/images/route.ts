import { NextResponse } from "next/server";
import { assertPerm } from "@/lib/auth/permissions";
import { deleteProductImage, saveProductImage } from "@/lib/product-images";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = await assertPerm("productos");
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Seleccioná una imagen." }, { status: 400 });
    }

    const url = await saveProductImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo subir la imagen.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const denied = await assertPerm("productos");
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const url = new URL(request.url).searchParams.get("url") ?? "";
  try {
    await deleteProductImage(url);
    return new Response(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "No se pudo eliminar la imagen." }, { status: 500 });
  }
}
