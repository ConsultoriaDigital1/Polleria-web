export interface Sucursal {
  id: string;
  name: string;
  address: string;
  /** Texto de búsqueda usado para ubicar la sucursal en Google Maps */
  mapsQuery: string;
  phone?: string;
}

export const sucursales: Sucursal[] = [
  {
    id: "junin",
    name: "Casa Central · Junín",
    address: "Junín 2198, Corrientes",
    mapsQuery: "Junín 2198, Corrientes, Argentina",
    phone: "3794 525617",
  },
  {
    id: "sarmiento",
    name: "Sarmiento y La Pampa",
    address: "Sarmiento y La Pampa, Corrientes",
    mapsQuery: "Sarmiento y La Pampa, Corrientes, Argentina",
    phone: "3794 525617",
  },
  {
    id: "cazadores",
    name: "Av. Cazadores Correntinos",
    address: "Av. Cazadores Correntinos 3038, Corrientes",
    mapsQuery: "Av. Cazadores Correntinos 3038, Corrientes, Argentina",
  },
  {
    id: "independencia-5328",
    name: "Av. Independencia 5328",
    address: "Av. Independencia 5328, Corrientes",
    mapsQuery: "Av. Independencia 5328, Corrientes, Argentina",
  },
  {
    id: "independencia-3540",
    name: "Av. Independencia 3540",
    address: "Av. Independencia 3540, Corrientes",
    mapsQuery: "Av. Independencia 3540, Corrientes, Argentina",
  },
  {
    id: "gutemberg",
    name: "Calle Gutemberg",
    address: "Gutemberg 1670, Corrientes",
    mapsQuery: "Gutemberg 1670, Corrientes, Argentina",
  },
  {
    id: "libertad",
    name: "Av. Libertad",
    address: "Av. Libertad 5279, Corrientes",
    mapsQuery: "Av. Libertad 5279, Corrientes, Argentina",
  },
  {
    id: "maipu",
    name: "Av. Maipú",
    address: "Av. Maipú 7185, Corrientes",
    mapsQuery: "Av. Maipú 7185, Corrientes, Argentina",
  },
];
