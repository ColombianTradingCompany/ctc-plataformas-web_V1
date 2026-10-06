// ── GENERADO por `scripts/build-rueda-datos.mjs` — NO editar a mano ──────────────────────────────────────────────────
// La taxonomía de la rueda del sabor, sacada de la herramienta publicada (`public/tools/catacion/rueda-del-cafe-v23.html`):
// familia → subcategoría → nota, con el color y el icono de cada familia. Para cambiarla se cambia la herramienta y se
// regenera; `qa-centro-calidad` falla si este archivo y la herramienta dejan de coincidir. La lee `rueda.ts`.

/** V5.165: `causa` = la «posible causa en el beneficio» que la herramienta da para las notas de defecto (anotación de mejora). */
/** V5.167: `variedades` = los varietales con que la herramienta asocia la nota o la subcategoría (su síntesis varietal). */
export type VariedadesDeLaRueda = { es: string[]; en: string[] };
export type NotaDeLaRueda = { id: string; es: string; en: string; causa?: { es: string; en: string }; variedades?: VariedadesDeLaRueda };
export type SubcategoriaDeLaRueda = { id: string; es: string; en: string; variedades?: VariedadesDeLaRueda; hojas: NotaDeLaRueda[] };
export type FamiliaDeLaRueda = { id: string; es: string; en: string; color: string; icono: string; subs: SubcategoriaDeLaRueda[] };

export const RUEDA_DATOS: readonly FamiliaDeLaRueda[] = [
  {
    id: "floral", es: "Floral", en: "Floral", color: "#d46fb3", icono: "🌸",
    subs: [
      { id: "floral-floral", es: "Floral", en: "Floral", variedades: { es: ["Geisha","Bourbon Rosado","Typica"], en: ["Geisha","Pink Bourbon","Typica"] }, hojas: [
        { id: "manzanilla", es: "Manzanilla", en: "Chamomile" },
        { id: "rosa", es: "Rosa", en: "Rose" },
        { id: "jazmin", es: "Jazmín", en: "Jasmine", variedades: { es: ["Geisha"], en: ["Geisha"] } },
      ] },
      { id: "floral-te", es: "Té negro", en: "Black Tea", variedades: { es: ["Typica","Bourbon"], en: ["Typica","Bourbon"] }, hojas: [
        { id: "te-negro", es: "Té negro", en: "Black Tea" },
      ] },
    ],
  },
  {
    id: "frutal", es: "Frutal", en: "Fruity", color: "#e2434b", icono: "🍓",
    subs: [
      { id: "frutal-bayas", es: "Bayas", en: "Berry", variedades: { es: ["Wush Wush","Pink Bourbon","Geisha (natural)"], en: ["Wush Wush","Pink Bourbon","Geisha (natural)"] }, hojas: [
        { id: "mora", es: "Mora", en: "Blackberry" },
        { id: "frambuesa", es: "Frambuesa", en: "Raspberry" },
        { id: "arandano", es: "Arándano", en: "Blueberry" },
        { id: "fresa", es: "Fresa", en: "Strawberry" },
      ] },
      { id: "frutal-seca", es: "Fruta seca", en: "Dried Fruit", variedades: { es: ["Caturra","Castillo (proceso honey)"], en: ["Caturra","Castillo (honey process)"] }, hojas: [
        { id: "pasas", es: "Pasas", en: "Raisin" },
        { id: "ciruela-pasa", es: "Ciruela pasa", en: "Prune" },
      ] },
      { id: "frutal-otras", es: "Otras frutas", en: "Other Fruit", variedades: { es: ["Sidra","Java","Pink Bourbon"], en: ["Sidra","Java","Pink Bourbon"] }, hojas: [
        { id: "coco", es: "Coco", en: "Coconut" },
        { id: "cereza", es: "Cereza", en: "Cherry" },
        { id: "granada", es: "Granada", en: "Pomegranate" },
        { id: "pina", es: "Piña", en: "Pineapple" },
        { id: "uva", es: "Uva", en: "Grape" },
        { id: "manzana", es: "Manzana", en: "Apple" },
        { id: "durazno", es: "Durazno", en: "Peach" },
        { id: "pera", es: "Pera", en: "Pear" },
      ] },
      { id: "frutal-citricos", es: "Cítricos", en: "Citrus Fruit", variedades: { es: ["Caturra","Colombia","Castillo"], en: ["Caturra","Colombia","Castillo"] }, hojas: [
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
      { id: "acido-acidos", es: "Ácido", en: "Sour", variedades: { es: ["Caturra","Typica","Colombia"], en: ["Caturra","Typica","Colombia"] }, hojas: [
        { id: "acido-acetico", es: "Ácido acético", en: "Acetic Acid", causa: { es: "Sobrefermentación: el mucílago permaneció fermentando más tiempo del recomendado antes del lavado. Revisar tiempos y temperatura del tanque de fermentación.", en: "Over-fermentation: the mucilage kept fermenting longer than recommended before washing. Review fermentation tank time and temperature." } },
        { id: "acido-butirico", es: "Ácido butírico", en: "Butyric Acid", causa: { es: "Fermentación anaeróbica prolongada, típica de tanques mal aireados o con temperaturas altas durante el beneficio húmedo.", en: "Prolonged anaerobic fermentation, typical of poorly aerated tanks or high temperatures during wet processing." } },
        { id: "acido-isovalerico", es: "Ácido isovalérico", en: "Isovaleric Acid", causa: { es: "Fermentación excesiva, o cerezas sobremaduras mezcladas con la cosecha principal antes del despulpado.", en: "Excessive fermentation, or overripe cherries mixed into the main harvest before pulping." } },
        { id: "acido-citrico", es: "Ácido cítrico", en: "Citric Acid" },
        { id: "acido-malico", es: "Ácido málico", en: "Malic Acid" },
      ] },
      { id: "acido-fermentado", es: "Fermentado", en: "Fermented", variedades: { es: ["Cualquier varietal — el origen suele ser el proceso, no la genética"], en: ["Any varietal — the cause is usually the process, not genetics"] }, hojas: [
        { id: "vinoso", es: "Vinoso", en: "Winey" },
        { id: "whiskey", es: "Whiskey", en: "Whiskey" },
        { id: "fermentado", es: "Fermentado", en: "Fermented", causa: { es: "Tiempo de fermentación mayor al necesario para el clima y la variedad; conviene ajustar el protocolo de beneficio con catas de control cada pocas horas.", en: "Fermentation time longer than needed for the climate and variety; adjust the processing protocol with control cuppings every few hours." } },
        { id: "sobremaduro", es: "Sobremaduro", en: "Overripe", causa: { es: "Cosecha con cerezas pasadas de punto (sobremaduras) mezcladas con la recolección selectiva; reforzar la selección en el recolectado.", en: "Harvest with overripe cherries mixed into the selective picking; reinforce selection during picking." } },
      ] },
    ],
  },
  {
    id: "verde", es: "Verde / Vegetal", en: "Green / Vegetative", color: "#4f8f5b", icono: "🌿",
    subs: [
      { id: "verde-crudo", es: "Crudo", en: "Raw", variedades: { es: ["Cualquier varietal — típico de tueste muy claro o grano inmaduro"], en: ["Any varietal — typical of a very light roast or unripe bean"] }, hojas: [
        { id: "aceite-de-oliva", es: "Aceite de oliva", en: "Olive Oil" },
        { id: "crudo", es: "Crudo", en: "Raw", causa: { es: "Cosecha con cerezas verdes/inmaduras mezcladas con la recolección madura, o un tueste demasiado corto que no desarrolló los azúcares.", en: "Harvest with green/unripe cherries mixed into the ripe picking, or a roast too short to develop the sugars." } },
      ] },
      { id: "verde-vegetal", es: "Vegetal", en: "Vegetative", variedades: { es: ["Cualquier varietal — nota de proceso/tueste más que genética"], en: ["Any varietal — more a process/roast note than genetics"] }, hojas: [
        { id: "verde", es: "Verde", en: "Green" },
        { id: "vaina-de-chicharo", es: "Vaina de chícharo", en: "Pea Pod" },
        { id: "fresco", es: "Fresco", en: "Fresh" },
        { id: "verde-oscuro", es: "Verde oscuro", en: "Dark Green" },
        { id: "vegetal", es: "Vegetal", en: "Vegetative" },
        { id: "heno", es: "Heno", en: "Hay-like" },
        { id: "herbaceo", es: "Herbáceo", en: "Herb-like" },
      ] },
      { id: "verde-frijol", es: "A frijol", en: "Beany", variedades: { es: ["Cualquier varietal — nota de tueste, no de origen"], en: ["Any varietal — a roast note, not an origin trait"] }, hojas: [
        { id: "a-frijol", es: "A frijol", en: "Beany", causa: { es: "Tueste demasiado claro o de muy corta duración, que no alcanzó a romper el almidón del grano.", en: "A roast too light or too short to break down the bean's starch." } },
      ] },
    ],
  },
  {
    id: "otros", es: "Otros", en: "Other", color: "#4e8fa8", icono: "🧪",
    subs: [
      { id: "otros-papel", es: "Papel / Mohoso", en: "Papery / Musty", variedades: { es: ["No asociado a varietal — indica manejo de poscosecha"], en: ["Not varietal-linked — points to post-harvest handling"] }, hojas: [
        { id: "rancio", es: "Rancio", en: "Stale", causa: { es: "Grano almacenado por demasiado tiempo o en condiciones de humedad/calor inadecuadas; los aceites naturales del grano se oxidaron.", en: "Coffee stored too long or under inadequate humidity/heat conditions; the bean's natural oils oxidized." } },
        { id: "carton", es: "Cartón", en: "Cardboard", causa: { es: "Almacenamiento prolongado sin control de humedad, o empaque en mal estado que dejó pasar humedad ambiental.", en: "Prolonged storage without humidity control, or damaged packaging that let in ambient moisture." } },
        { id: "papel", es: "Papel", en: "Papery", causa: { es: "Pérdida de frescura por almacenamiento prolongado; revisar rotación de inventario y condiciones de bodega.", en: "Loss of freshness from prolonged storage; check inventory rotation and warehouse conditions." } },
        { id: "amaderado", es: "Amaderado", en: "Woody", causa: { es: "Secado lento o almacenamiento en contacto con empaques de fique o madera en mal estado.", en: "Slow drying or storage in contact with worn sisal bags or wood." } },
        { id: "mohoso-humedo", es: "Mohoso / Húmedo", en: "Moldy / Damp", causa: { es: "Secado insuficiente (humedad final por encima del 12%) o almacenamiento en bodega húmeda; riesgo de crecimiento de hongos.", en: "Insufficient drying (final moisture above 12%) or storage in a damp warehouse; risk of mold growth." } },
        { id: "polvoso-mohoso", es: "Polvoso / Mohoso", en: "Dusty / Musty", causa: { es: "Humedad residual alta con secado irregular, o contacto con superficies sucias durante el secado.", en: "High residual moisture with uneven drying, or contact with dirty surfaces during drying." } },
        { id: "terroso-mohoso", es: "Terroso / Mohoso", en: "Earthy / Musty", causa: { es: "Secado directo sobre el suelo sin zarandas ni carpas; contacto del grano con tierra húmeda.", en: "Drying directly on the ground without raised beds or tarps; the coffee came into contact with damp soil." } },
        { id: "animal", es: "Animal", en: "Animalic", causa: { es: "Contaminación cruzada durante transporte o almacenamiento cerca de animales o superficies sin higiene.", en: "Cross-contamination during transport or storage near animals or unhygienic surfaces." } },
        { id: "caldo-de-carne", es: "Caldo de carne", en: "Meaty Broth", causa: { es: "Fermentación descontrolada o prolongada más allá del punto óptimo, generando compuestos proteicos degradados.", en: "Uncontrolled or over-extended fermentation beyond the optimal point, generating degraded protein compounds." } },
        { id: "fenolico", es: "Fenólico", en: "Phenolic", causa: { es: "Fermentación contaminada (agua estancada, tanques sin lavar) o contacto con plástico/PVC durante el beneficio. Revisar de inmediato el protocolo de fermentación y lavado.", en: "Contaminated fermentation (stagnant water, unwashed tanks) or contact with plastic/PVC during processing. Review the fermentation and washing protocol immediately." } },
      ] },
      { id: "otros-quimico", es: "Químico", en: "Chemical", variedades: { es: ["No asociado a varietal — indica contaminación o defecto de proceso"], en: ["Not varietal-linked — indicates contamination or a process defect"] }, hojas: [
        { id: "amargo", es: "Amargo", en: "Bitter", causa: { es: "Sobreextracción por tueste muy oscuro, o exceso de cerezas verdes en la cosecha.", en: "Over-extraction from a very dark roast, or excess green cherries in the harvest." } },
        { id: "salado", es: "Salado", en: "Salty", causa: { es: "Posible contaminación del agua usada en el lavado, o un defecto de sabor cruzado durante el beneficio.", en: "Possible contamination of the water used for washing, or a cross-flavor defect during processing." } },
        { id: "medicinal", es: "Medicinal", en: "Medicinal", causa: { es: "Fermentación anaeróbica descontrolada o contaminación microbiana durante el beneficio húmedo.", en: "Uncontrolled anaerobic fermentation or microbial contamination during wet processing." } },
        { id: "petroleo", es: "Petróleo", en: "Petroleum", causa: { es: "Contacto con combustibles o superficies contaminadas durante el secado o el transporte; revisar patios y vehículos usados.", en: "Contact with fuel or contaminated surfaces during drying or transport; check drying patios and vehicles used." } },
        { id: "skunky", es: "Skunky", en: "Skunky", causa: { es: "Fermentación muy prolongada o secado demasiado lento con alta humedad ambiental.", en: "Very prolonged fermentation or drying too slowly under high ambient humidity." } },
        { id: "caucho", es: "Caucho", en: "Rubber", causa: { es: "Contacto del grano con materiales de caucho o empaques inadecuados durante el secado o almacenamiento.", en: "Contact of the beans with rubber materials or unsuitable packaging during drying or storage." } },
      ] },
    ],
  },
  {
    id: "especias", es: "Especias", en: "Spices", color: "#8b4a6b", icono: "🌶️",
    subs: [
      { id: "especias-pungente", es: "Pungente", en: "Pungent", variedades: { es: ["Castillo","Bourbon (tueste medio-oscuro)"], en: ["Castillo","Bourbon (medium-dark roast)"] }, hojas: [
        { id: "pungente", es: "Pungente", en: "Pungent" },
        { id: "pimienta", es: "Pimienta", en: "Pepper" },
      ] },
      { id: "especias-oscuras", es: "Especias oscuras", en: "Brown Spice", variedades: { es: ["Castillo","Bourbon"], en: ["Castillo","Bourbon"] }, hojas: [
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
      { id: "tostado-tabaco", es: "Tabaco", en: "Tobacco", variedades: { es: ["Castillo","Caturra (tueste medio-oscuro)"], en: ["Castillo","Caturra (medium-dark roast)"] }, hojas: [
        { id: "tabaco-de-pipa", es: "Tabaco de pipa", en: "Pipe Tobacco" },
        { id: "tabaco", es: "Tabaco", en: "Tobacco" },
      ] },
      { id: "tostado-quemado", es: "Quemado", en: "Burnt", variedades: { es: ["No asociado a varietal — nota de tueste"], en: ["Not varietal-linked — a roasting note"] }, hojas: [
        { id: "acre", es: "Acre", en: "Acrid", causa: { es: "Tueste llevado más allá del punto óptimo de desarrollo; ajustar la curva de tueste.", en: "Roast pushed past the optimal development point; adjust the roast curve." } },
        { id: "cenizo", es: "Cenizo", en: "Ashy", causa: { es: "Tueste excesivamente oscuro o final de tueste demasiado rápido (quemado superficial).", en: "Excessively dark roast or too rapid a finish (surface scorching)." } },
        { id: "ahumado", es: "Ahumado", en: "Smoky" },
        { id: "curtido", es: "Curtido", en: "Brown, Roast" },
        { id: "tostado-intenso", es: "Tostado intenso", en: "Dark Roast" },
      ] },
      { id: "tostado-cereal", es: "Cereal", en: "Cereal", variedades: { es: ["Typica","Colombia"], en: ["Typica","Colombia"] }, hojas: [
        { id: "grano", es: "Grano", en: "Grain" },
        { id: "malta", es: "Malta", en: "Malt" },
      ] },
    ],
  },
  {
    id: "cacao", es: "Frutos secos / Cacao", en: "Nutty / Cocoa", color: "#6b4226", icono: "🍫",
    subs: [
      { id: "cacao-secos", es: "Frutos secos", en: "Nutty", variedades: { es: ["Caturra","Castillo","Bourbon"], en: ["Caturra","Castillo","Bourbon"] }, hojas: [
        { id: "cacahuate", es: "Cacahuate", en: "Peanuts" },
        { id: "avellana", es: "Avellana", en: "Hazelnut" },
        { id: "almendra", es: "Almendra", en: "Almond" },
      ] },
      { id: "cacao-cacao", es: "Cacao", en: "Cocoa", variedades: { es: ["Castillo","Caturra","Bourbon"], en: ["Castillo","Caturra","Bourbon"] }, hojas: [
        { id: "chocolate", es: "Chocolate", en: "Chocolate" },
        { id: "chocolate-amargo", es: "Chocolate amargo", en: "Dark Chocolate" },
      ] },
    ],
  },
  {
    id: "dulce", es: "Dulce", en: "Sweet", color: "#e8a33d", icono: "🍯",
    subs: [
      { id: "dulce-morena", es: "Azúcar morena", en: "Brown Sugar", variedades: { es: ["Bourbon","Caturra","Castillo"], en: ["Bourbon","Caturra","Castillo"] }, hojas: [
        { id: "melaza", es: "Melaza", en: "Molasses" },
        { id: "jarabe-de-maple", es: "Jarabe de maple", en: "Maple Syrup" },
        { id: "caramelizado", es: "Caramelizado", en: "Caramelized" },
        { id: "miel", es: "Miel", en: "Honey" },
      ] },
      { id: "dulce-vainilla", es: "Vainilla / Dulce", en: "Vanilla / Sweet", variedades: { es: ["Bourbon","Typica"], en: ["Bourbon","Typica"] }, hojas: [
        { id: "vainilla", es: "Vainilla", en: "Vanilla" },
        { id: "vainillina", es: "Vainillina", en: "Vanillin" },
        { id: "dulce-general", es: "Dulce general", en: "Overall Sweet" },
        { id: "aromatico-dulce", es: "Aromático dulce", en: "Sweet Aromatic" },
      ] },
    ],
  },
];
