import { normalizePhone } from "./phone";

const API_URL = "https://www.wasenderapi.com/api";

export type WasenderStatus = "pendiente" | "enviado" | "entregado" | "fallido" | "sin_verificar";

function recipient(phone: string): string | null {
  const digits = normalizePhone(phone);
  if (digits.length === 10) return `+549${digits}`;
  const international = phone.replace(/\D/g, "");
  return international.length >= 11 && international.length <= 15 ? `+${international}` : null;
}

export async function sendWasenderMessage(phone: string, text: string): Promise<{
  status: WasenderStatus;
  messageId?: string;
  error?: string;
}> {
  const token = process.env.WASENDER_API_KEY?.trim();
  const to = recipient(phone);
  if (!token) return { status: "fallido", error: "Falta configurar WaSenderAPI." };
  if (!to) return { status: "fallido", error: "El teléfono del cliente no es válido para WhatsApp." };

  try {
    const response = await fetch(`${API_URL}/send-message`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to, text }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.success !== true) {
      console.error(`[wasender] envío rechazado: HTTP ${response.status}`, body);
      return { status: "fallido", error: "WaSenderAPI rechazó el mensaje. Revisá la sesión y el teléfono." };
    }
    const messageId = String(body.data?.msgId ?? "");
    return /^[1-9]\d*$/.test(messageId)
      ? { status: "pendiente", messageId }
      : { status: "sin_verificar", error: "WaSenderAPI aceptó el mensaje sin un identificador para verificarlo." };
  } catch (error) {
    console.error("[wasender] no se pudo verificar el envío:", error);
    return { status: "sin_verificar", error: "No se pudo confirmar si WaSenderAPI recibió el mensaje." };
  }
}

export async function getWasenderMessageStatus(messageId: string): Promise<WasenderStatus | null> {
  const token = process.env.WASENDER_API_KEY?.trim();
  if (!token) return null;
  try {
    const response = await fetch(`${API_URL}/messages/${messageId}/info`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (body?.success !== true) return null;
    const status = Number(body.data?.status);
    if (status === 0) return "fallido";
    if (status === 1) return "pendiente";
    if (status === 2) return "enviado";
    if (status >= 3 && status <= 5) return "entregado";
    return null;
  } catch (error) {
    console.error(`[wasender] consulta de estado ${messageId}:`, error);
    return null;
  }
}
