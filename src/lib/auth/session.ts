import "server-only";
import { cookies } from "next/headers";
import crypto from "crypto";

/**
 * Sesión firmada por HMAC guardada en una cookie httpOnly.
 *
 * No usamos JWT ni librerías externas: el payload es un JSON en base64url
 * firmado con `SESSION_SECRET` (HMAC-SHA256). Suficiente y autocontenido,
 * en línea con la filosofía de simplicidad del proyecto.
 */

export const SESSION_COOKIE = "polleria_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 días

export type Role = "cliente" | "admin";

export interface Session {
  /** id del cliente (Customer.id, o `guest-<phone>` sin base de datos). */
  sub: string;
  name: string;
  phone: string;
  role: Role;
  /**
   * Permisos de panel del empleado (claves de PERM_MODULES).
   * El super-admin lleva `["*"]` (todos). Solo aplica a `role === "admin"`.
   */
  perms?: string[];
  /** epoch en segundos */
  exp: number;
}

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET no está configurado (mínimo 16 caracteres).");
  }
  // Fallback solo para desarrollo: las sesiones no sobreviven a un cambio de clave.
  return "dev-insecure-session-secret-change-me";
}

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", secret()).update(payload).digest());
}

/** Serializa y firma una sesión en un token `payload.firma`. */
export function encodeSession(data: Omit<Session, "exp"> & { exp?: number }): string {
  const session: Session = {
    ...data,
    exp: data.exp ?? Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const payload = b64url(Buffer.from(JSON.stringify(session), "utf8"));
  return `${payload}.${sign(payload)}`;
}

/** Verifica firma y expiración. Devuelve la sesión o `null`. */
export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(payload);
  // Comparación en tiempo constante.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const json = Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8"
    );
    const session = JSON.parse(json) as Session;
    if (typeof session.exp !== "number" || session.exp < Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

/** Escribe la cookie de sesión (Server Action o Route Handler). */
export async function setSessionCookie(data: Omit<Session, "exp">): Promise<void> {
  const token = encodeSession(data);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Borra la cookie de sesión. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Lee y valida la sesión actual desde la cookie. */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Sesión demo para acceso libre al Club y Mi Cuenta sin login.
 * Apunta al cliente mock `c-1` para mostrar puntos e historial de ejemplo.
 */
export const DEMO_SESSION: Session = {
  sub: "c-1",
  name: "Martín Gómez",
  phone: "+54 379 412-3344",
  role: "cliente",
  exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
};

/**
 * Devuelve la sesión real si existe; si no, una sesión demo.
 * `isDemo` permite a la UI ocultar acciones que requieren login real
 * (por ejemplo, cerrar sesión).
 */
export async function getSessionOrDemo(): Promise<{ session: Session; isDemo: boolean }> {
  const real = await getSession();
  if (real) return { session: real, isDemo: false };
  return { session: DEMO_SESSION, isDemo: true };
}
