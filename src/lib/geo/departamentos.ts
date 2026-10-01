// ── Los departamentos de Colombia y los países de origen fuera de Colombia (V5.127, owner 2026-10-01) — PURO ──────
// Hasta la V5.126 el editor de la finca ofrecía OCHO departamentos y «Otro» (una finca de Ragonvalia, Norte de
// Santander, tenía que registrarse en otro departamento), y la Información general del productor y el Proveedor
// Desacoplado ofrecían los 22 cafeteros de `DEP_MUNI`. Esta es la lista completa: los 32 departamentos y Bogotá D.C.,
// en orden alfabético. `DEP_MUNI` (departamento → municipios, para la Ficha del lote) sigue siendo otra cosa.

export const DEPARTAMENTOS_DE_COLOMBIA: string[] = [
  "Amazonas",
  "Antioquia",
  "Arauca",
  "Atlántico",
  "Bogotá D.C.",
  "Bolívar",
  "Boyacá",
  "Caldas",
  "Caquetá",
  "Casanare",
  "Cauca",
  "Cesar",
  "Chocó",
  "Córdoba",
  "Cundinamarca",
  "Guainía",
  "Guaviare",
  "Huila",
  "La Guajira",
  "Magdalena",
  "Meta",
  "Nariño",
  "Norte de Santander",
  "Putumayo",
  "Quindío",
  "Risaralda",
  "San Andrés y Providencia",
  "Santander",
  "Sucre",
  "Tolima",
  "Valle del Cauca",
  "Vaupés",
  "Vichada",
];

/** Los países en los que una finca puede estar «Fuera de Colombia» (owner, 2026-10-01). `fincas.pais`; null/"" = Colombia. */
export const PAISES_FUERA_DE_COLOMBIA: string[] = ["Perú", "Ecuador", "Venezuela", "Panamá", "Costa Rica", "Guatemala", "El Salvador"];
