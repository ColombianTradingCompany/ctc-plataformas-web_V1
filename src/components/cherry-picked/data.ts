import { LOCALE, type Lang } from "./i18n";

export type Grade = "Black" | "Red" | "Blue" | "Gold";
export type Mode = "spot" | "pre";

export type Lot = {
  id: string; // lot_listings.id -- also the lot_reservations/cart key
  code: string;
  mode: Mode;
  grade: Grade;
  tc: string; // CSS color var for the grade
  name: string;
  origin: string;
  variety: string;
  process: string;
  score: string; // numeric string or "—"; language-neutral
  scoreEstimated: boolean; // true when the score is the producer's self-report
  alt: string;
  total: number; // kg existing (world/warehouse)
  sold: number; // kg already sold by others
  unit: number; // purchase step in kg — also the pack size shown in specs
  moq: number; // minimum per customer
  price: number; // EUR/kg
  cup: string; // tasting notes
  transparency?: { locked: number; reference: number }; // real producer-vs-market price, only when the listing opted in
};

export const GRADE_COLOR: Record<Grade, string> = {
  Black: "var(--t-black)",
  Red: "var(--t-red)",
  Blue: "var(--t-blue)",
  Gold: "var(--t-gold)",
};

export const GRADE_DB: Record<string, Grade> = { black: "Black", red: "Red", blue: "Blue", gold: "Gold" };
const GRADE_CODE: Record<Grade, string> = { Black: "BK", Red: "RD", Blue: "BL", Gold: "GD" };

export function listingCode(listingId: string, grade: Grade) {
  return `${GRADE_CODE[grade]}-${listingId.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

export const ASSOC_BLACK_MOQ = 350;
export const PACK_PRICE = 300;

export const fmt = (n: number, lang: Lang) => n.toLocaleString(LOCALE[lang]);
export const eur = (n: number, lang: Lang) =>
  n.toLocaleString(LOCALE[lang], { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function moqOf(l: Lot, loggedIn: boolean) {
  return l.grade === "Black" && loggedIn ? ASSOC_BLACK_MOQ : l.moq;
}

export type CartItem = { id: string; code: string; name: string; kg: number; total: number; mode: Mode };

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

export function cartData(
  lots: Lot[],
  myKg: Record<string, number>,
  packInCart: boolean,
  shipZone: string,
  zones: { code: string; ratePerKg: number }[]
): CartSummary {
  const items: CartItem[] = Object.entries(myKg)
    .filter(([, q]) => q > 0)
    .map(([id, q]) => {
      const l = lots.find((x) => x.id === id)!;
      return { id, code: l.code, name: l.name, kg: q, total: q * l.price, mode: l.mode };
    })
    .filter((i) => i.name !== undefined);
  const spot = items.filter((i) => i.mode === "spot").reduce((a, i) => a + i.total, 0);
  const pre = items.filter((i) => i.mode === "pre").reduce((a, i) => a + i.total, 0);
  const kg = items.reduce((a, i) => a + i.kg, 0);
  const rate = zones.find((z) => z.code === shipZone)?.ratePerKg ?? 0;
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
