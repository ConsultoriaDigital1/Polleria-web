import type { NextRequest } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api/respond";
import { getSession } from "@/lib/auth/session";
import { rewards } from "@/lib/data";
import { addPoints, getPoints, NoDatabaseError } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ rewardId: z.string().min(1) });

/** Genera un código de cupón corto y legible para mostrar en caja. */
function couponCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[crypto.randomInt(alphabet.length)];
  return `POLLO-${s}`;
}

/** Canjea una recompensa: descuenta puntos y devuelve un cupón. */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return fail("Tenés que iniciar sesión para canjear.", 401, "UNAUTHORIZED");

    const { rewardId } = schema.parse(await req.json());
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return fail("La recompensa no existe.", 404, "REWARD_NOT_FOUND");

    const current = await getPoints(session.sub);
    if (!current || current.points < reward.cost) {
      return fail("No te alcanzan los puntos para este canje.", 422, "INSUFFICIENT_POINTS");
    }

    const coupon = couponCode();
    let summary = current;
    try {
      const updated = await addPoints(session.sub, {
        points: -reward.cost,
        label: `Canje: ${reward.name} (${coupon})`,
        type: "canje",
      });
      if (updated) summary = updated;
    } catch (err) {
      // Sin base de datos (dev/demo): el cupón se emite igual, sin persistir.
      if (!(err instanceof NoDatabaseError)) throw err;
    }

    return ok({
      coupon,
      reward: { id: reward.id, name: reward.name, cost: reward.cost },
      points: summary.points,
      tier: summary.tier,
    });
  } catch (e) {
    return handleError(e);
  }
}
