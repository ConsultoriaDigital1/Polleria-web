ALTER TABLE "DeliverySettings"
ADD COLUMN IF NOT EXISTS "freeShippingDays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- Conserva la configuración anterior de instalaciones que tenían sábados gratis.
UPDATE "DeliverySettings"
SET "freeShippingDays" = ARRAY[6]::INTEGER[]
WHERE "freeSaturday" = true
  AND cardinality("freeShippingDays") = 0;