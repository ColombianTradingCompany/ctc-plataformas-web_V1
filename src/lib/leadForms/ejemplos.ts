// ── Interfaz de Leads · cuatro leads de EJEMPLO para la vista previa de los correos (V6.2) — PURO ─────────────────────────────
// El owner: «antes de activar cualquier envío, muéstrame los textos y tres o cuatro ejemplos generados con perfiles distintos (por
// ejemplo: tostador japonés que pide muestras, importador que solo explora, productor, prensa) para aprobarlos». La LCP los pinta
// con los constructores reales de `correos.ts` y la configuración vigente del formulario. Son datos inventados a propósito.

import type { LeadParaCorreo } from "./correos";

const base = (formKey: string): Omit<LeadParaCorreo, "id" | "created_at" | "participant_type" | "full_name" | "company" | "email" | "lang"> => ({
  form_key: formKey,
  idempotency_key: "00000000-0000-4000-8000-000000000000",
  source: "ejemplo",
  participant_other: null,
  country_city: null,
  card_photo_path: null,
  green_volume: null,
  buys_colombian: null,
  profiles: [],
  about: null,
  values_beans: {},
  looking_for: null,
  timing: null,
  wants: [],
  master_roaster_interest: false,
  extra: {},
  consent: true,
});

export function leadsDeEjemplo(formKey: string): { titulo: string; lead: LeadParaCorreo }[] {
  const created_at = "2026-10-14T03:30:00.000Z";
  return [
    {
      titulo: "Tostador japonés que pide muestras y marca Master Roaster (llenó en japonés → recibe inglés)",
      lead: {
        ...base(formKey),
        id: "11111111-1111-4111-8111-111111111111",
        created_at,
        lang: "ja",
        participant_type: "roaster",
        full_name: "Haruki Tanaka",
        company: "Tanaka Coffee Roasters",
        email: "haruki@example.jp",
        country_city: "Japón · Osaka",
        green_volume: "5_20t",
        buys_colombian: "sometimes",
        profiles: ["washed", "honey"],
        values_beans: { traceability: 5, cup_quality: 5, consistency: 4, price: 2 },
        looking_for: "Washed lots for filter, 5 to 10 bags",
        timing: "lt_3m",
        wants: ["sample_pack", "lot_list"],
        master_roaster_interest: true,
        extra: { grades_interest: ["blue", "gold"], purchase_format: "bags", certifications: ["jas_organic"] },
      },
    },
    {
      titulo: "Importador que solo explora y pide una videollamada (inglés)",
      lead: {
        ...base(formKey),
        id: "22222222-2222-4222-8222-222222222222",
        created_at,
        lang: "en",
        participant_type: "importer",
        full_name: "Mei Suzuki",
        company: "Pacific Green Imports",
        email: "mei@example.com",
        green_volume: "20_100t",
        buys_colombian: "regular",
        values_beans: { consistency: 5, sustainability: 4, price: 4 },
        timing: "exploring",
        wants: ["video_call"],
        extra: { grades_interest: ["black", "red"], purchase_format: "container", regional_node_interest: true },
      },
    },
    {
      titulo: "Productor colombiano de visita, interesado en evaluar su café (español)",
      lead: {
        ...base(formKey),
        id: "33333333-3333-4333-8333-333333333333",
        created_at,
        lang: "es",
        participant_type: "producer",
        full_name: "Rosalba Jiménez",
        company: "Finca El Mirador",
        email: "rosalba@example.co",
        country_city: "Colombia · Huila",
        about: "Finca de 4 hectáreas en Garzón, variedades Caturra y Pink Bourbon, proceso lavado y honey.",
        wants: ["video_call"],
        extra: { producer_interest: true },
      },
    },
    {
      titulo: "Prensa que pide material (español)",
      lead: {
        ...base(formKey),
        id: "44444444-4444-4444-8444-444444444444",
        created_at,
        lang: "es",
        participant_type: "press",
        full_name: "Carlos Vega",
        company: "Revista Café & Origen",
        email: "carlos@example.es",
        about: "Cubro origen y trazabilidad para una revista especializada en Europa.",
        looking_for: "Historias de productores con datos verificables",
        wants: ["lot_list"],
      },
    },
  ];
}
