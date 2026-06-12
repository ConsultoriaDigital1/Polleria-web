import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api/respond";
import {
  normalizePhone,
  isValidPhone,
  generateCode,
  hashCode,
  sendOtp,
  OTP_TTL_MS,
} from "@/lib/auth/otp";
import { storeOtp } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ phone: z.string().min(5, "El teléfono es obligatorio.") });

/** Genera un OTP, lo guarda y lo envía por WhatsApp (n8n). */
export async function POST(req: NextRequest) {
  try {
    const { phone: raw } = schema.parse(await req.json());
    const phone = normalizePhone(raw);
    if (!isValidPhone(phone)) {
      return fail("El número de teléfono no es válido.", 422, "INVALID_PHONE");
    }

    // Si el envío real falla (webhook caído, sin WhatsApp), no bloqueamos el flujo:
    // el código demo (DEMO_LOGIN_CODE) sigue funcionando en verify-otp.
    try {
      const code = generateCode();
      await storeOtp(phone, hashCode(phone, code), new Date(Date.now() + OTP_TTL_MS));
      await sendOtp(phone, code);
    } catch (err) {
      console.warn("[OTP] No se pudo generar/enviar el código:", err);
    }

    return ok({ sent: true, phone, expiresInSec: OTP_TTL_MS / 1000 });
  } catch (e) {
    return handleError(e);
  }
}
