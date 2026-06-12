#!/bin/sh
set -e

echo "⏳ Esperando a la base de datos y aplicando el esquema…"
# Sincroniza el esquema de Prisma con la base (crea tablas si no existen).
# Es no destructivo para cambios aditivos.
pnpm exec prisma db push --skip-generate --accept-data-loss

echo "🚀 Iniciando Pollería Entre Ríos…"
exec pnpm start
