import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok, fail, handleError } from "@/lib/api/respond";
import { normalizePhone, isValidPhone } from "@/lib/auth/otp";
import { loginByPhone } from "@/lib/repo";
import { setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  phone: z.string().min(5, "El teléfono es obligatorio."),
  name: z.string().trim().min(1).max(80).optional(),
});

/**
 * Login directo por teléfono, sin OTP ni contraseña.
 * Como el número no se verifica, la sesión es siempre de cliente:
 * el panel /admin mantiene su login propio con usuario y contraseña.
 */
export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json());
    const phone = normalizePhone(body.phone);
    if (!isValidPhone(phone)) {
      return fail("El número de teléfono no es válido.", 422, "INVALID_PHONE");
    }

    const subject = await loginByPhone({ phone, name: body.name });
    await setSessionCookie({
      sub: subject.id,
      name: subject.name,
      phone: subject.phone,
      role: "cliente",
    });

    return ok({ id: subject.id, name: subject.name, phone: subject.phone, role: "cliente" });
  } catch (e) {
    return handleError(e);
  }
}
