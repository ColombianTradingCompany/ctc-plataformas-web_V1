export type Grade = "Black" | "Red" | "Blue" | "Gold";
export type Mode = "spot" | "pre";

export type Lot = {
  id: string;
  mode: Mode;
  grade: Grade;
  tc: string; // CSS color var for the grade
  name: string;
  origin: string;
  variety: string;
  process: string;
  score: string;
  alt: string;
  pack: string;
  total: number; // kg existing (world/warehouse)
  sold: number; // kg already sold by others
  unit: number; // purchase step in kg
  moq: number; // minimum per customer
  price: number; // EUR/kg
  cup: string; // tasting notes
};

export const LOTS: Lot[] = [
  { id: "BK-2620", mode: "spot", grade: "Black", tc: "var(--t-black)", name: "Black · Piendamó", origin: "Asoc. de 22 fincas · Piendamó, Cauca", variety: "Castillo, Colombia", process: "Lavado", score: "83", alt: "1.700 m", pack: "Liner bag + costal 35 kg", total: 3990, sold: 3325, unit: 35, moq: 490, price: 11.0, cup: "Panela, manzana roja, cacao. El espresso de diario." },
  { id: "BK-2621", mode: "spot", grade: "Black", tc: "var(--t-black)", name: "Black · Planadas", origin: "Coop. Sur del Tolima · Planadas", variety: "Caturra, Castillo", process: "Lavado", score: "82.75", alt: "1.650 m", pack: "Liner bag + costal 35 kg", total: 2975, sold: 2415, unit: 35, moq: 490, price: 10.8, cup: "Caramelo, nuez, final limpio. Nacido para blends." },
  { id: "BK-2622", mode: "spot", grade: "Black", tc: "var(--t-black)", name: "Black · Garzón", origin: "Asoc. Alto Magdalena · Garzón, Huila", variety: "Colombia", process: "Lavado", score: "83.25", alt: "1.720 m", pack: "Liner bag + costal 35 kg", total: 3500, sold: 2100, unit: 35, moq: 490, price: 11.2, cup: "Chocolate de leche, ciruela, cuerpo redondo." },
  { id: "RD-2701", mode: "pre", grade: "Red", tc: "var(--t-red)", name: "Finca El Mirador", origin: "Familia Rojas · Pitalito, Huila", variety: "Pink Bourbon", process: "Lavado", score: "85", alt: "1.800 m", pack: "Vacío 12 kg · cajas 24 kg", total: 504, sold: 240, unit: 12, moq: 240, price: 13.0, cup: "Panela, mandarina, floral suave." },
  { id: "RD-2702", mode: "pre", grade: "Red", tc: "var(--t-red)", name: "Finca La Esperanza", origin: "Aldemar Quirá · Inzá, Cauca", variety: "Caturra", process: "Honey", score: "84.75", alt: "1.780 m", pack: "Vacío 12 kg · cajas 24 kg", total: 480, sold: 0, unit: 12, moq: 240, price: 12.8, cup: "Miel, uva pasa, dulzor largo." },
  { id: "RD-2703", mode: "pre", grade: "Red", tc: "var(--t-red)", name: "Finca Betulia", origin: "Nubia Trujillo · Bruselas, Huila", variety: "Tabi", process: "Lavado", score: "85.25", alt: "1.820 m", pack: "Vacío 12 kg · cajas 24 kg", total: 600, sold: 240, unit: 12, moq: 240, price: 13.2, cup: "Durazno, azúcar morena, acidez amable." },
  { id: "RD-2704", mode: "pre", grade: "Red", tc: "var(--t-red)", name: "Finca San Isidro", origin: "Hnos. Marín · Génova, Quindío", variety: "Colombia", process: "Natural", score: "84.5", alt: "1.750 m", pack: "Vacío 12 kg · cajas 24 kg", total: 456, sold: 216, unit: 12, moq: 240, price: 13.0, cup: "Fresa madura, cacao, cuerpo sedoso." },
  { id: "RD-2705", mode: "pre", grade: "Red", tc: "var(--t-red)", name: "Vereda Aponte", origin: "Resguardo Inga · Aponte, Nariño", variety: "Caturra Chiroso", process: "Lavado", score: "85.5", alt: "2.100 m", pack: "Vacío 12 kg · cajas 24 kg", total: 540, sold: 300, unit: 12, moq: 240, price: 13.4, cup: "Lima, hierbabuena, taza vibrante de altura." },
  { id: "BL-2706", mode: "pre", grade: "Blue", tc: "var(--t-blue)", name: "Finca Monteverde", origin: "Hermanas Gómez · Urrao, Antioquia", variety: "Chiroso", process: "Lavado, fermentación fría", score: "86.75", alt: "2.050 m", pack: "Vacío 12 kg · cajas 24 kg", total: 420, sold: 180, unit: 12, moq: 180, price: 15.0, cup: "Jazmín, limonaria, azúcar glas." },
  { id: "BL-2707", mode: "pre", grade: "Blue", tc: "var(--t-blue)", name: "Finca La Loma", origin: "Julián Perdomo · Acevedo, Huila", variety: "Pink Bourbon", process: "Natural anaeróbico 72 h", score: "86.5", alt: "1.850 m", pack: "Vacío 12 kg · cajas 24 kg", total: 360, sold: 0, unit: 12, moq: 180, price: 15.2, cup: "Frutos rojos, vino tinto, dulzor intenso." },
  { id: "BL-2708", mode: "pre", grade: "Blue", tc: "var(--t-blue)", name: "Finca El Diviso", origin: "Familia Ordóñez · Palestina, Huila", variety: "Geisha", process: "Lavado", score: "86.9", alt: "1.900 m", pack: "Vacío 12 kg · cajas 24 kg", total: 396, sold: 216, unit: 12, moq: 180, price: 15.5, cup: "Té blanco, durazno, elegancia contenida." },
  { id: "BL-2709", mode: "pre", grade: "Blue", tc: "var(--t-blue)", name: "Finca Cerro Azul", origin: "Camila Restrepo · Jardín, Antioquia", variety: "Bourbon Rojo", process: "Honey", score: "86.25", alt: "1.950 m", pack: "Vacío 12 kg · cajas 24 kg", total: 300, sold: 120, unit: 12, moq: 180, price: 14.8, cup: "Mora, panela, final achocolatado." },
  { id: "GD-2710", mode: "pre", grade: "Gold", tc: "var(--t-gold)", name: "Finca El Vergel Alto", origin: "Elías Bayter · Fresno, Tolima", variety: "Sidra", process: "Honey anaeróbico", score: "88", alt: "1.900 m", pack: "Vacío 6 kg · cajas 24 kg", total: 198, sold: 114, unit: 6, moq: 84, price: 18.0, cup: "Maracuyá, caramelo, perfil exuberante." },
  { id: "GD-2711", mode: "pre", grade: "Gold", tc: "var(--t-gold)", name: "Finca Las Nubes", origin: "Camilo Ruiz · La Plata, Huila", variety: "Geisha", process: "Lavado", score: "87.75", alt: "1.980 m", pack: "Vacío 6 kg · cajas 24 kg", total: 168, sold: 84, unit: 6, moq: 84, price: 18.2, cup: "Bergamota, miel de azahar, taza de competencia." },
  { id: "GD-2712", mode: "pre", grade: "Gold", tc: "var(--t-gold)", name: "Finca Milán", origin: "Rodrigo Vélez · Caicedonia, Valle", variety: "Java", process: "Natural", score: "87.5", alt: "1.870 m", pack: "Vacío 6 kg · cajas 24 kg", total: 168, sold: 0, unit: 6, moq: 84, price: 17.8, cup: "Mango, especias dulces, rareza varietal." },
];

export const ASSOC_BLACK_MOQ = 350;
export const PACK_PRICE = 300;
export const ARRIVAL = "ago 2026";
export const ZONES: Record<string, number> = { EXW: 0, Z1: 0.1, Z2: 0.18, Z3: 0.25, Z4: 0.35, Z5: 0.45 };

export const fmt = (n: number) => n.toLocaleString("es-ES");
export const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function moqOf(l: Lot, loggedIn: boolean) {
  return l.grade === "Black" && loggedIn ? ASSOC_BLACK_MOQ : l.moq;
}

export type CartItem = { id: string; name: string; kg: number; total: number; mode: Mode };

export type CartSummary = {
  items: CartItem[];
  spot: number;
  pre: number;
  kg: number;
  rate: number;
  ship: number;
  today: number;
  later: number;
  total: number;
  n: number;
};

export function cartData(myKg: Record<string, number>, packInCart: boolean, shipZone: string): CartSummary {
  const items: CartItem[] = Object.entries(myKg)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => {
      const l = LOTS.find((x) => x.id === id)!;
      return { id, name: l.name, kg: q, total: q * l.price, mode: l.mode };
    });
  const spot = items.filter((i) => i.mode === "spot").reduce((a, i) => a + i.total, 0);
  const pre = items.filter((i) => i.mode === "pre").reduce((a, i) => a + i.total, 0);
  const kg = items.reduce((a, i) => a + i.kg, 0);
  const rate = ZONES[shipZone];
  const spotKg = items.filter((i) => i.mode === "spot").reduce((a, i) => a + i.kg, 0);
  const preKg = items.filter((i) => i.mode === "pre").reduce((a, i) => a + i.kg, 0);
  const shipSpot = spotKg * rate;
  const shipPre = preKg * rate;
  const ship = shipSpot + shipPre;
  const today = spot + shipSpot + pre * 0.3 + (packInCart ? PACK_PRICE : 0);
  const later = pre * 0.7 + shipPre;
  const total = spot + pre + ship + (packInCart ? PACK_PRICE : 0);
  return { items, spot, pre, kg, rate, ship, today, later, total, n: items.length + (packInCart ? 1 : 0) };
}
