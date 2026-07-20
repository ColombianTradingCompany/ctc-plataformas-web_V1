// ── Registros públicos de verificación de certificados (A3/A4) ───────────────
// Para cada certificado que un productor puede declarar en la Ficha, el mejor
// punto público donde CTC puede CONTRASTAR la veracidad (buscador oficial del
// esquema cuando existe; la página oficial del programa cuando no hay registro
// público por certificado — ahí la verificación se apoya en el soporte adjunto).
// Investigado 2026-07-20. Si un enlace muere, corrija aquí: es la única fuente.

export type CertRegistryEntry = {
  /** Nombre del registro / sitio al que se enlaza. */
  registry: string;
  url: string;
  /** true = existe búsqueda pública por titular; false = solo página oficial. */
  searchable: boolean;
  note?: string;
};

export const CERT_REGISTRY: Record<string, CertRegistryEntry> = {
  // ── A3 · Certificados de origen ──
  origin_cert_dor: {
    registry: "SIC · Denominaciones de Origen (Colombia)",
    url: "https://www.sic.gov.co/marcas/denominacion-de-origen",
    searchable: true,
    note: "Las DO regionales de café (Huila, Nariño, Cauca, etc.) están protegidas por la SIC.",
  },
  origin_cert_do: {
    registry: "SIC · Denominaciones de Origen (Colombia)",
    url: "https://www.sic.gov.co/marcas/denominacion-de-origen",
    searchable: true,
  },
  origin_cert_igp: {
    registry: "eAmbrosia · Registro de IG de la UE",
    url: "https://ec.europa.eu/agriculture/eambrosia/geographical-indications-register/",
    searchable: true,
    note: "Registro oficial de indicaciones geográficas protegidas de la Unión Europea.",
  },
  origin_cert_fedecafe: {
    registry: "Café de Colombia (FNC) · uso de marca",
    url: "https://www.cafedecolombia.com/",
    searchable: false,
    note: "Sin buscador público por titular — verificar con la cédula cafetera y el soporte adjunto.",
  },

  // ── A4 · Certificados internacionales ──
  intl_eudr: {
    registry: "Comisión Europea · EUDR (2023/1115)",
    url: "https://green-business.ec.europa.eu/deforestation-regulation-implementation_en",
    searchable: false,
    note: "El cumplimiento se demuestra con la debida diligencia (DDS en TRACES), no con un registro público.",
  },
  intl_rainforest: {
    registry: "Rainforest Alliance · Certificate Search",
    url: "https://www.rainforest-alliance.org/business/certification/certificate-search-and-public-summaries/",
    searchable: true,
  },
  intl_organic: {
    registry: "USDA Organic INTEGRITY Database",
    url: "https://organic.ams.usda.gov/integrity/",
    searchable: true,
    note: "Cubre operadores certificados USDA y socios de equivalencia (UE) en la pestaña Trade Partners.",
  },
  intl_eujas: {
    registry: "MAFF · Japanese Agricultural Standard (JAS)",
    url: "https://www.maff.go.jp/e/policies/standard/jas/",
    searchable: false,
    note: "Sin buscador público consolidado — verificar contra el certificado del organismo emisor.",
  },
  intl_birdfriendly: {
    registry: "Smithsonian · Bird Friendly Certified Farms",
    url: "https://nationalzoo.si.edu/migratory-birds/certified-coffee-farms",
    searchable: true,
  },
  intl_foe: {
    registry: "Friend of the Earth · Certified Producers",
    url: "https://friendoftheearth.org/",
    searchable: false,
    note: "Verificar en la lista oficial de productores certificados del programa.",
  },
  intl_iwca: {
    registry: "IWCA · Capítulos y membresía",
    url: "https://womenincoffee.org/",
    searchable: false,
    note: "La membresía se confirma con el capítulo nacional (IWCA Colombia).",
  },
  intl_cafe: {
    registry: "SCS Global · C.A.F.E. Practices",
    url: "https://www.scsglobalservices.com/services/starbucks-cafe-practices",
    searchable: false,
    note: "Programa privado de Starbucks — sin registro público; verificar con el soporte del verificador.",
  },
  intl_bpa: {
    registry: "ICA · Predios con BPA (Colombia)",
    url: "https://www.ica.gov.co/",
    searchable: false,
    note: "La resolución BPA del predio se verifica contra el ICA con el soporte adjunto.",
  },
  intl_fairtrade: {
    registry: "FLOCERT · Customer Search",
    url: "https://www.flocert.net/fairtrade-customer-search/",
    searchable: true,
  },
  intl_spp: {
    registry: "SPP Global · Registro de certificados",
    url: "https://spp.coop/the-spp-system/certificacion-y-registro/?lang=en",
    searchable: true,
  },
  intl_fairtradeusa: {
    registry: "Fair Trade USA (sitio oficial)",
    url: "https://www.fairtradecertified.org/",
    searchable: false,
    note: "Sin buscador público por titular — verificar con el certificado del auditor (SCS u otro).",
  },
  intl_demeter: {
    registry: "Demeter International · Certification",
    url: "https://demeter.net/certification/",
    searchable: true,
    note: "Demeter mantiene una base de datos de productos/miembros certificados.",
  },
  intl_nespresso: {
    registry: "Nespresso AAA (programa privado)",
    url: "https://www.sustainability.nespresso.com/aaa-sustainable-quality-program",
    searchable: false,
    note: "Programa privado — la pertenencia se verifica con el agrónomo AAA de la zona o el soporte adjunto.",
  },
  intl_globalgap: {
    registry: "GLOBALG.A.P. · Validación por GGN",
    url: "https://database.globalgap.org/",
    searchable: true,
    note: "Buscar por el número GGN de 13 dígitos del productor.",
  },
};

/** Directorio público de Q-Graders Arabica vigentes (CQI). */
export const Q_GRADER_REGISTRY = {
  registry: "CQI · Q Arabica Graders (directorio oficial)",
  url: "https://database.coffeeinstitute.org/users/graders/arabica",
};
