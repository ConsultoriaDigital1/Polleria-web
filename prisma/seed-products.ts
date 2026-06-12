import { PrismaClient } from "@prisma/client";
import { products } from "../src/lib/data";

// Carga/actualiza SOLO los productos del catálogo (upsert por id).
// Seguro de correr en producción: no toca clientes, pedidos ni puntos.
const prisma = new PrismaClient();

async function main() {
  console.log("🍗 Subiendo productos…");
  for (const p of products) {
    const data = {
      name: p.name,
      description: p.description,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      category: p.category,
      image: p.image,
      badge: p.badge ?? null,
      available: p.available,
    };
    await prisma.product.upsert({
      where: { id: p.id },
      create: { id: p.id, ...data },
      update: data,
    });
    console.log(`  ✔ ${p.name}`);
  }
  console.log(`✅ ${products.length} productos cargados/actualizados.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("❌ Error:", e);
    return prisma.$disconnect().finally(() => process.exit(1));
  });
