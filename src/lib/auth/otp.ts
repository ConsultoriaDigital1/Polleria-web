import "server-only";
import crypto from "crypto";

/** Tiempo de vida del código OTP. */
export const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutos
/** Mínimo entre dos envíos al mismo teléfono (anti-spam). */
export const OTP_RESEND_MS = 60 * 1000; // 60 segundos
/** Intentos de verificación permitidos antes de invalidar el código. */
export const OTP_MAX_ATTEMPTS = 5;

/**
 * Normaliza un teléfono a un formato canónico para usar como clave única.
 * Conserva un `+` inicial y los dígitos; descarta espacios, guiones, paréntesis.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/\D/g, "");
  return plus + digits;
}

/** Valida que el teléfono normalizado tenga una longitud razonable. */
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/** Genera un código numérico de 6 dígitos. */
export function generateCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/**
 * Hash del código ligado al teléfono. Usamos HMAC con `SESSION_SECRET` (o un
 * fallback en dev) para no guardar el código en claro en la base.
 */
export function hashCode(phone: string, code: string): string {
  const key = process.env.SESSION_SECRET || "dev-insecure-session-secret-change-me";
  return crypto.createHmac("sha256", key).update(`${phone}:${code}`).digest("hex");
}

/**
 * Envía el código al cliente por WhatsApp usando un webhook de n8n.
 *
 * Hace POST a `OTP_WHATSAPP_WEBHOOK_URL` con `{ phone, code, message }`.
 * Si la variable no está configurada, en desarrollo loguea el código por
 * consola (para poder probar sin n8n) y en producción lanza un error.
 */
export async function sendOtp(phone: string, code: string): Promise<void> {
  const url = process.env.OTP_WHATSAPP_WEBHOOK_URL;
  const message = `Tu código de acceso a Pollería Entre Ríos es ${code}. Vence en 5 minutos. No lo compartas con nadie.`;

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OTP_WHATSAPP_WEBHOOK_URL no está configurado.");
    }
    console.info(`[OTP dev] Código para ${phone}: ${code}`);
    return;
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.OTP_WEBHOOK_SECRET
        ? { authorization: `Bearer ${process.env.OTP_WEBHOOK_SECRET}` }
        : {}),
    },
    body: JSON.stringify({ phone, code, message }),
  });

  if (!res.ok) {
    throw new Error(`El webhook de WhatsApp respondió ${res.status}.`);
  }
}

/** Indica si un teléfono pertenece a un administrador (env `ADMIN_PHONES`). */
export function isAdminPhone(phone: string): boolean {
  const list = (process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => normalizePhone(p))
    .filter(Boolean);
  return list.includes(normalizePhone(phone));
}
