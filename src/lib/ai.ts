import "server-only";
import { listProducts } from "./repo";
import { sucursales } from "./sucursales";
import { MIN_ENVIO_TOTAL } from "./geo";
import { formatARS } from "./format";

/**
 * Asistente de atención de la tienda, sobre la API de DeepSeek.
 * La API es compatible con el formato de OpenAI, así que alcanza con fetch:
 * no hace falta sumar un SDK al bundle.
 */
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";
const MODEL = "deepseek-chat";

/** Máximo de mensajes del historial que se reenvían (control de costo). */
export const MAX_HISTORY = 12;
/** Largo máximo de cada mensaje del usuario. */
export const MAX_MESSAGE_CHARS = 500;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export function aiHabilitado(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

/**
 * Arma el prompt de sistema con el catálogo real: precios, disponibilidad,
 * sucursales y reglas de envío. Se construye en cada request para que el bot
 * no invente precios viejos cuando el admin los cambia.
 */
async function buildSystemPrompt(): Promise<string> {
  const products = await listProducts({});
  const catalogo = products
    .map(
      (p) =>
        `- ${p.name} (${p.category}): ${formatARS(p.price)}${
          p.available && p.stock > 0 ? ` [stock: ${p.stock}]` : " [SIN STOCK]"
        }${p.description ? ` — ${p.description}` : ""}`
    )
    .join("\n");

  const locales = sucursales
    .map((s) => `- ${s.name}: ${s.address}${s.phone ? ` · Tel ${s.phone}` : ""}`)
    .join("\n");

  return `Sos el asistente virtual de Pollería Entre Ríos, en la ciudad de Corrientes, Argentina.
Atendés a clientes en la tienda web. Hablás en español rioplatense, de vos, con tono cordial y breve.

REGLAS:
- Respondé solo sobre la pollería: productos, precios, stock, sucursales, envíos y horarios.
- Si te preguntan otra cosa, decí amablemente que solo podés ayudar con temas de la pollería.
- Usá ÚNICAMENTE los precios y productos de la lista de abajo. Si algo no está, decí que no figura y ofrecé consultar por WhatsApp. NUNCA inventes precios, productos ni promociones.
- Si un producto está marcado SIN STOCK, avisá que no hay por el momento. Si te preguntan cuánto hay, usá el número de stock de la lista.
- No prometas plazos de entrega exactos ni descuentos que no estén listados.
- Respuestas cortas: 3 o 4 oraciones como máximo, salvo que te pidan detalle.
- No pidas datos personales (documento, tarjeta, dirección). El pedido se cierra en el checkout de la web.

ENVÍOS:
- Todos los pedidos son con envío a domicilio, solo dentro de la ciudad de Corrientes. NO existe el retiro por sucursal.
- La compra mínima es de ${formatARS(MIN_ENVIO_TOTAL)}.
- Al comprar se elige un rango horario de entrega: 08:00 a 12:00 o 17:00 a 20:00.
- Las compras hechas a la mañana se reciben a la tarde; las hechas a la tarde, a la mañana del día siguiente.
- La dirección se carga con calle y altura solamente (sin piso, depto ni barrio).
- El pago online es con Mercado Pago desde el carrito. NO se toman pedidos por WhatsApp: ese canal es solo para consultas o problemas.

SUCURSALES:
${locales}

CATÁLOGO:
${catalogo}`;
}

/** Consulta a DeepSeek y devuelve la respuesta del asistente. */
export async function askDeepSeek(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY no está configurada.");

  const system = await buildSystemPrompt();

  // Si el modelo tarda, cortamos: el usuario está esperando en el chat.
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 30_000);

  try {
    const res = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "system", content: system }, ...messages.slice(-MAX_HISTORY)],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: ac.signal,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`DeepSeek respondió ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("DeepSeek no devolvió una respuesta.");
    return reply;
  } finally {
    clearTimeout(timeout);
  }
}
