import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireApiKey } from "@/lib/api/auth";
import { ok, fail, handleError } from "@/lib/api/respond";
import { getPoints, addPoints } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const pointsSchema = z.object({
  // Positivo = sumar (compra/bonus), negativo = canjear.
  points: z.number().int().refine((n) => n !== 0, "Los puntos no pueden ser 0."),
  label: z.string().min(1, "Indicá una descripción (label)."),
  type: z.enum(["compra", "bonus", "canje"]),
});

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireApiKey(req);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await ctx.params;
    const summary = await getPoints(id);
    if (!summary) return fail("Cliente no encontrado.", 404, "NOT_FOUND");
    return ok(summary);
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const unauthorized = requireApiKey(req);
  if (unauthorized) return unauthorized;
  try {
    const { id } = await ctx.params;
    const entry = pointsSchema.parse(await req.json());
    const summary = await addPoints(id, entry);
    if (!summary) return fail("Cliente no encontrado.", 404, "NOT_FOUND");
    return ok(summary);
  } catch (e) {
    return handleError(e);
  }
}
