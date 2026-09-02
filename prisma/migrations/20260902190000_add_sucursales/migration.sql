CREATE TABLE "Sucursal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "mapsUrl" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sucursal_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Sucursal_region_active_idx" ON "Sucursal"("region", "active");

INSERT INTO "Sucursal" ("id", "name", "street", "number", "region", "mapsUrl", "lat", "lng", "active", "updatedAt") VALUES
('junin', 'Casa Central · Junín', 'Junín', '2198', 'Corrientes Capital', 'https://www.google.com/maps/search/?api=1&query=Jun%C3%ADn%202198%2C%20Corrientes%2C%20Argentina', -27.4689014, -58.8228427, true, CURRENT_TIMESTAMP),
('sarmiento', 'Sarmiento y La Pampa', 'Sarmiento y La Pampa', 'S/N', 'Corrientes Capital', 'https://www.google.com/maps/search/?api=1&query=Sarmiento%20y%20La%20Pampa%2C%20Corrientes%2C%20Argentina', -27.486098, -58.831291, true, CURRENT_TIMESTAMP),
('cazadores', 'Av. Cazadores Correntinos', 'Av. Cazadores Correntinos', '3038', 'Corrientes Capital', 'https://www.google.com/maps/search/?api=1&query=Av.%20Cazadores%20Correntinos%203038%2C%20Corrientes%2C%20Argentina', -27.4871312, -58.815603, true, CURRENT_TIMESTAMP),
('independencia-5328', 'Av. Independencia 5328', 'Av. Independencia', '5328', 'Corrientes Capital', 'https://www.google.com/maps/search/?api=1&query=Av.%20Independencia%205328%2C%20Corrientes%2C%20Argentina', -27.4844077, -58.7864115, true, CURRENT_TIMESTAMP),
('independencia-3540', 'Av. Independencia 3540', 'Av. Independencia', '3540', 'Corrientes Capital', 'https://www.google.com/maps/search/?api=1&query=Av.%20Independencia%203540%2C%20Corrientes%2C%20Argentina', -27.4796606, -58.8081457, true, CURRENT_TIMESTAMP),
('gutemberg', 'Calle Gutemberg', 'Gutemberg', '1670', 'Corrientes Capital', 'https://www.google.com/maps/search/?api=1&query=Gutemberg%201670%2C%20Corrientes%2C%20Argentina', -27.477126, -58.8316569, true, CURRENT_TIMESTAMP),
('libertad', 'Av. Libertad', 'Av. Libertad', '5279', 'Corrientes Capital', 'https://www.google.com/maps/search/?api=1&query=Av.%20Libertad%205279%2C%20Corrientes%2C%20Argentina', -27.4653257, -58.7855411, true, CURRENT_TIMESTAMP),
('maipu', 'Av. Maipú', 'Av. Maipú', '7185', 'Corrientes Capital', 'https://www.google.com/maps/search/?api=1&query=Av.%20Maip%C3%BA%207185%2C%20Corrientes%2C%20Argentina', -27.5265807, -58.7955942, true, CURRENT_TIMESTAMP);
