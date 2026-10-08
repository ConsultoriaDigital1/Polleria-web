import assert from "node:assert/strict";
import { getWasenderMessageStatus, sendWasenderMessage } from "../src/lib/wasender.ts";
import { notifyOrderEvent } from "../src/lib/n8n.ts";

const originalFetch = globalThis.fetch;
const originalKey = process.env.WASENDER_API_KEY;
const originalError = console.error;
process.env.WASENDER_API_KEY = "test-key";
console.error = () => {};

try {
  let sent;
  globalThis.fetch = async (url, options) => {
    sent = { url, options, body: JSON.parse(options.body) };
    return Response.json({ success: true, data: { msgId: 123, status: "in_progress" } });
  };
  assert.deepEqual(await sendWasenderMessage("0379 15 452 5617", "Código 4821"), {
    status: "pendiente",
    messageId: "123",
  });
  assert.equal(sent.url, "https://www.wasenderapi.com/api/send-message");
  assert.equal(sent.body.to, "+5493794525617");
  assert.equal(sent.body.text, "Código 4821");

  const order = { id: "#1234", phone: "3794525617", deliveryCode: "4821", items: [] };
  await notifyOrderEvent("pedido_en_camino", order);
  assert.equal(order.codeMessageStatus, "pendiente");
  assert.equal(order.codeMessageId, "123");
  assert.match(sent.body.text, /4821/);

  globalThis.fetch = async () => Response.json({ success: false }, { status: 422 });
  assert.equal((await sendWasenderMessage("3794525617", "Código" )).status, "fallido");

  globalThis.fetch = async () => { throw new Error("timeout"); };
  assert.equal((await sendWasenderMessage("3794525617", "Código")).status, "sin_verificar");

  globalThis.fetch = async () => Response.json({ success: true, data: { status: 0 } });
  assert.equal(await getWasenderMessageStatus("123"), "fallido");
  globalThis.fetch = async () => Response.json({ success: true, data: { status: 3 } });
  assert.equal(await getWasenderMessageStatus("123"), "entregado");
} finally {
  globalThis.fetch = originalFetch;
  console.error = originalError;
  if (originalKey === undefined) delete process.env.WASENDER_API_KEY;
  else process.env.WASENDER_API_KEY = originalKey;
}

console.log("WaSenderAPI verificada: número argentino, cola, fallo y entrega.");
