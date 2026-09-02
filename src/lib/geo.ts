/**
 * Geografía del reparto: por ahora solo se entrega dentro de la ciudad de
 * Corrientes (capital). La validación corre en el cliente (para avisar al
 * marcar el punto) y de nuevo en el servidor (no se confía en el navegador).
 */

export const DELIVERY_LOCALITIES = [
  {
    id: "corrientes",
    name: "Corrientes",
    searchName: "Corrientes Capital, Corrientes",
    center: { lat: -27.4692, lng: -58.8306 },
    radiusKm: 14,
    zoom: 13,
  },
  {
    id: "san-luis-del-palmar",
    name: "San Luis del Palmar",
    searchName: "San Luis del Palmar, Corrientes",
    center: { lat: -27.50810784, lng: -58.55547442 },
    radiusKm: 7,
    zoom: 14,
  },
  {
    id: "paso-de-la-patria",
    name: "Paso de la Patria",
    searchName: "Paso de la Patria, Corrientes",
    center: { lat: -27.31500601, lng: -58.5720143 },
    radiusKm: 7,
    zoom: 14,
  },
] as const;

export type DeliveryLocalityId = (typeof DELIVERY_LOCALITIES)[number]["id"];

export const DEFAULT_DELIVERY_LOCALITY_ID: DeliveryLocalityId = "corrientes";

export function isDeliveryLocality(value: unknown): value is DeliveryLocalityId {
  return DELIVERY_LOCALITIES.some((locality) => locality.id === value);
}

export function getDeliveryLocality(id: DeliveryLocalityId) {
  return DELIVERY_LOCALITIES.find((locality) => locality.id === id)!;
}

/** Centro aproximado de la ciudad de Corrientes (compatibilidad con mapas internos). */
export const CORRIENTES_CENTER = getDeliveryLocality("corrientes").center;

/** Monto mínimo de compra para poder cerrar el pedido. */
export const MIN_ENVIO_TOTAL = 50_000;

/**
 * Caja que encierra el ejido urbano de Corrientes capital.
 * El límite oeste (-58.88) deja afuera la orilla chaqueña del Paraná
 * (Barranqueras/Resistencia), que de otro modo entraría por distancia.
 * También se usa como viewbox para geocodificar direcciones (lib/geocode).
 */
export const CORRIENTES_BOUNDS = {
  latMin: -27.6,
  latMax: -27.4,
  lngMin: -58.88,
  lngMax: -58.7,
};

/** Radio máximo (km) desde el centro; refuerza la caja en las esquinas. */
const MAX_KM = 14;

/** Distancia haversine en km entre dos puntos. */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** ¿El punto está dentro de la zona de reparto (ciudad de Corrientes)? */
export function isInsideCorrientes(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < CORRIENTES_BOUNDS.latMin || lat > CORRIENTES_BOUNDS.latMax) return false;
  if (lng < CORRIENTES_BOUNDS.lngMin || lng > CORRIENTES_BOUNDS.lngMax) return false;
  return distanceKm({ lat, lng }, CORRIENTES_CENTER) <= MAX_KM;
}

/** Valida que el punto pertenezca a la localidad elegida en el checkout. */
export function isInsideDeliveryLocality(
  localityId: DeliveryLocalityId,
  lat: number,
  lng: number
): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (localityId === "corrientes") return isInsideCorrientes(lat, lng);
  const locality = getDeliveryLocality(localityId);
  return distanceKm({ lat, lng }, locality.center) <= locality.radiusKm;
}
