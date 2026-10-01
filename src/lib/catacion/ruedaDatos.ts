// ── GENERADO por `scripts/build-rueda-datos.mjs` — NO editar a mano ──────────────────────────────────────────────────
// La taxonomía de la rueda del sabor, sacada de la herramienta publicada (`public/tools/catacion/rueda-del-cafe-v23.html`):
// familia → subcategoría → nota, con el color y el icono de cada familia. Para cambiarla se cambia la herramienta y se
// regenera; `qa-centro-calidad` falla si este archivo y la herramienta dejan de coincidir. La lee `rueda.ts`.

export type NotaDeLaRueda = { id: string; es: string; en: string };
export type SubcategoriaDeLaRueda = { id: string; es: string; en: string; hojas: NotaDeLaRueda[] };
export type FamiliaDeLaRueda = { id: string; es: string; en: string; color: string; icono: string; subs: SubcategoriaDeLaRueda[] };

export const RUEDA_DATOS: readonly FamiliaDeLaRueda[] = [
  {
    id: "floral", es: "Floral", en: "Floral", color: "#d46fb3", icono: "🌸",
    subs: [
      { id: "floral-floral", es: "Floral", en: "Floral", hojas: [
        { id: "manzanilla", es: "Manzanilla", en: "Chamomile" },
        { id: "rosa", es: "Rosa", en: "Rose" },
        { id: "jazmin", es: "Jazmín", en: "Jasmine" },
      ] },
      { id: "floral-te", es: "Té negro", en: "Black Tea", hojas: [
        { id: "te-negro", es: "Té negro", en: "Black Tea" },
      ] },
    ],
  },
  {
    id: "frutal", es: "Frutal", en: "Fruity", color: "#e2434b", icono: "🍓",
    subs: [
      { id: "frutal-bayas", es: "Bayas", en: "Berry", hojas: [
        { id: "mora", es: "Mora", en: "Blackberry" },
        { id: "frambuesa", es: "Frambuesa", en: "Raspberry" },
        { id: "arandano", es: "Arándano", en: "Blueberry" },
        { id: "fresa", es: "Fresa", en: "Strawberry" },
      ] },
      { id: "frutal-seca", es: "Fruta seca", en: "Dried Fruit", hojas: [
        { id: "pasas", es: "Pasas", en: "Raisin" },
        { id: "ciruela-pasa", es: "Ciruela pasa", en: "Prune" },
      ] },
      { id: "frutal-otras", es: "Otras frutas", en: "Other Fruit", hojas: [
        { id: "coco", es: "Coco", en: "Coconut" },
        { id: "cereza", es: "Cereza", en: "Cherry" },
        { id: "granada", es: "Granada", en: "Pomegranate" },
        { id: "pina", es: "Piña", en: "Pineapple" },
        { id: "uva", es: "Uva", en: "Grape" },
        { id: "manzana", es: "Manzana", en: "Apple" },
        { id: "durazno", es: "Durazno", en: "Peach" },
        { id: "pera", es: "Pera", en: "Pear" },
      ] },
      { id: "frutal-citricos", es: "Cítricos", en: "Citrus Fruit", hojas: [
        { id: "toronja", es: "Toronja", en: "Grapefruit" },
        { id: "naranja", es: "Naranja", en: "Orange" },
        { id: "limon", es: "Limón", en: "Lemon" },
        { id: "lima", es: "Lima", en: "Lime" },
      ] },
    ],
  },
  {
    id: "acido", es: "Ácido / Fermentado", en: "Sour / Fermented", color: "#b5c33b", icono: "🍷",
    subs: [
      { id: "acido-acidos", es: "Ácido", en: "Sour", hojas: [
        { id: "acido-acetico", es: "Ácido acético", en: "Acetic Acid" },
        { id: "acido-butirico", es: "Ácido butírico", en: "Butyric Acid" },
        { id: "acido-isovalerico", es: "Ácido isovalérico", en: "Isovaleric Acid" },
        { id: "acido-citrico", es: "Ácido cítrico", en: "Citric Acid" },
        { id: "acido-malico", es: "Ácido málico", en: "Malic Acid" },
      ] },
      { id: "acido-fermentado", es: "Fermentado", en: "Fermented", hojas: [
        { id: "vinoso", es: "Vinoso", en: "Winey" },
        { id: "whiskey", es: "Whiskey", en: "Whiskey" },
        { id: "fermentado", es: "Fermentado", en: "Fermented" },
        { id: "sobremaduro", es: "Sobremaduro", en: "Overripe" },
      ] },
    ],
  },
  {
    id: "verde", es: "Verde / Vegetal", en: "Green / Vegetative", color: "#4f8f5b", icono: "🌿",
    subs: [
      { id: "verde-crudo", es: "Crudo", en: "Raw", hojas: [
        { id: "aceite-de-oliva", es: "Aceite de oliva", en: "Olive Oil" },
        { id: "crudo", es: "Crudo", en: "Raw" },
      ] },
      { id: "verde-vegetal", es: "Vegetal", en: "Vegetative", hojas: [
        { id: "verde", es: "Verde", en: "Green" },
        { id: "vaina-de-chicharo", es: "Vaina de chícharo", en: "Pea Pod" },
        { id: "fresco", es: "Fresco", en: "Fresh" },
        { id: "verde-oscuro", es: "Verde oscuro", en: "Dark Green" },
        { id: "vegetal", es: "Vegetal", en: "Vegetative" },
        { id: "heno", es: "Heno", en: "Hay-like" },
        { id: "herbaceo", es: "Herbáceo", en: "Herb-like" },
      ] },
      { id: "verde-frijol", es: "A frijol", en: "Beany", hojas: [
        { id: "a-frijol", es: "A frijol", en: "Beany" },
      ] },
    ],
  },
  {
    id: "otros", es: "Otros", en: "Other", color: "#4e8fa8", icono: "🧪",
    subs: [
      { id: "otros-papel", es: "Papel / Mohoso", en: "Papery / Musty", hojas: [
        { id: "rancio", es: "Rancio", en: "Stale" },
        { id: "carton", es: "Cartón", en: "Cardboard" },
        { id: "papel", es: "Papel", en: "Papery" },
        { id: "amaderado", es: "Amaderado", en: "Woody" },
        { id: "mohoso-humedo", es: "Mohoso / Húmedo", en: "Moldy / Damp" },
        { id: "polvoso-mohoso", es: "Polvoso / Mohoso", en: "Dusty / Musty" },
        { id: "terroso-mohoso", es: "Terroso / Mohoso", en: "Earthy / Musty" },
        { id: "animal", es: "Animal", en: "Animalic" },
        { id: "caldo-de-carne", es: "Caldo de carne", en: "Meaty Broth" },
        { id: "fenolico", es: "Fenólico", en: "Phenolic" },
      ] },
      { id: "otros-quimico", es: "Químico", en: "Chemical", hojas: [
        { id: "amargo", es: "Amargo", en: "Bitter" },
        { id: "salado", es: "Salado", en: "Salty" },
        { id: "medicinal", es: "Medicinal", en: "Medicinal" },
        { id: "petroleo", es: "Petróleo", en: "Petroleum" },
        { id: "skunky", es: "Skunky", en: "Skunky" },
        { id: "caucho", es: "Caucho", en: "Rubber" },
      ] },
    ],
  },
  {
    id: "especias", es: "Especias", en: "Spices", color: "#8b4a6b", icono: "🌶️",
    subs: [
      { id: "especias-pungente", es: "Pungente", en: "Pungent", hojas: [
        { id: "pungente", es: "Pungente", en: "Pungent" },
        { id: "pimienta", es: "Pimienta", en: "Pepper" },
      ] },
      { id: "especias-oscuras", es: "Especias oscuras", en: "Brown Spice", hojas: [
        { id: "anis", es: "Anís", en: "Anise" },
        { id: "nuez-moscada", es: "Nuez moscada", en: "Nutmeg" },
        { id: "canela", es: "Canela", en: "Cinnamon" },
        { id: "clavo-de-olor", es: "Clavo de olor", en: "Clove" },
      ] },
    ],
  },
  {
    id: "tostado", es: "Tostado", en: "Roasted", color: "#a97c50", icono: "🔥",
    subs: [
      { id: "tostado-tabaco", es: "Tabaco", en: "Tobacco", hojas: [
        { id: "tabaco-de-pipa", es: "Tabaco de pipa", en: "Pipe Tobacco" },
        { id: "tabaco", es: "Tabaco", en: "Tobacco" },
      ] },
      { id: "tostado-quemado", es: "Quemado", en: "Burnt", hojas: [
        { id: "acre", es: "Acre", en: "Acrid" },
        { id: "cenizo", es: "Cenizo", en: "Ashy" },
        { id: "ahumado", es: "Ahumado", en: "Smoky" },
        { id: "curtido", es: "Curtido", en: "Brown, Roast" },
        { id: "tostado-intenso", es: "Tostado intenso", en: "Dark Roast" },
      ] },
      { id: "tostado-cereal", es: "Cereal", en: "Cereal", hojas: [
        { id: "grano", es: "Grano", en: "Grain" },
        { id: "malta", es: "Malta", en: "Malt" },
      ] },
    ],
  },
  {
    id: "cacao", es: "Frutos secos / Cacao", en: "Nutty / Cocoa", color: "#6b4226", icono: "🍫",
    subs: [
      { id: "cacao-secos", es: "Frutos secos", en: "Nutty", hojas: [
        { id: "cacahuate", es: "Cacahuate", en: "Peanuts" },
        { id: "avellana", es: "Avellana", en: "Hazelnut" },
        { id: "almendra", es: "Almendra", en: "Almond" },
      ] },
      { id: "cacao-cacao", es: "Cacao", en: "Cocoa", hojas: [
        { id: "chocolate", es: "Chocolate", en: "Chocolate" },
        { id: "chocolate-amargo", es: "Chocolate amargo", en: "Dark Chocolate" },
      ] },
    ],
  },
  {
    id: "dulce", es: "Dulce", en: "Sweet", color: "#e8a33d", icono: "🍯",
    subs: [
      { id: "dulce-morena", es: "Azúcar morena", en: "Brown Sugar", hojas: [
        { id: "melaza", es: "Melaza", en: "Molasses" },
        { id: "jarabe-de-maple", es: "Jarabe de maple", en: "Maple Syrup" },
        { id: "caramelizado", es: "Caramelizado", en: "Caramelized" },
        { id: "miel", es: "Miel", en: "Honey" },
      ] },
      { id: "dulce-vainilla", es: "Vainilla / Dulce", en: "Vanilla / Sweet", hojas: [
        { id: "vainilla", es: "Vainilla", en: "Vanilla" },
        { id: "vainillina", es: "Vainillina", en: "Vanillin" },
        { id: "dulce-general", es: "Dulce general", en: "Overall Sweet" },
        { id: "aromatico-dulce", es: "Aromático dulce", en: "Sweet Aromatic" },
      ] },
    ],
  },
];
