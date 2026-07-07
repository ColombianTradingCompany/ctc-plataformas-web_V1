export type Finca = {
  name: string;
  vereda: string;
  mun: string;
  depto: string;
  alt: string;
  ha: string;
  geo?: string;
  hist: string;
  carac: string;
};

export type Lot = {
  id: string;
  name: string;
  finca: string;
  stage: number; // 0-6, index into STAGES
  grade: "Black" | "Red" | "Blue" | "Gold" | "Tyrian" | null;
  extra: string;
};

export type GeneralInfo = { razon: string; nit: string; agri: string };

export const GRADES: Record<string, string> = {
  Black: "var(--t-black)",
  Red: "var(--t-red)",
  Blue: "var(--t-blue)",
  Gold: "var(--t-gold)",
  Tyrian: "var(--t-tyrian)",
};

export const STAGES = ["Borrador", "Ficha completa", "Videos ✓", "Muestra en tránsito", "En fila Arena", "Evaluado", "Galardonado"];

export const INITIAL_FINCAS: Finca[] = [
  {
    name: "La Primavera",
    vereda: "El Encanto",
    mun: "Piedecuesta",
    depto: "Santander",
    alt: "1.680",
    ha: "4,2",
    hist: "Tres generaciones cultivando en ladera, con beneficio propio.",
    carac: "Sombrío de guamo · Pink Bourbon y Castillo",
  },
  {
    name: "El Roble",
    vereda: "Mesa de Los Santos",
    mun: "Los Santos",
    depto: "Santander",
    alt: "1.540",
    ha: "2,8",
    hist: "Suelos arenosos de mesa, noches frías.",
    carac: "Caturra · secado en marquesina",
  },
];

export const INITIAL_LOTS: Lot[] = [
  { id: "L-0007", name: "Pink Bourbon Lavado", finca: "La Primavera", stage: 6, grade: "Blue", extra: "Arena #12 · Trato activo (mes 2 de 3)" },
  { id: "L-0009", name: "Castillo Honey", finca: "La Primavera", stage: 5, grade: null, extra: "Arena #12 · Certificado + feedback emitidos" },
  { id: "L-0011", name: "Caturra Natural", finca: "El Roble", stage: 4, grade: null, extra: "Puesto 14 en fila · muestra recibida ✓" },
  { id: "L-0012", name: "Lote nuevo · sin nombre", finca: "—", stage: 0, grade: null, extra: "Recién creado · complete la ficha técnica" },
];

export const INITIAL_GI: GeneralInfo = { razon: "—", nit: "901.XXX.XXX-1", agri: "—" };
