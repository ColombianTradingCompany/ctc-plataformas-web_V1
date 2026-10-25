// ── ECP · Automatizaciones · tipos ───────────────────────────────────────────
import type { Criticidad, Dominio, Etapa } from "./dominios";

export type Automation = {
  id: string;
  nombre: string;
  /** El escenario en Make. Null mientras es solo una propuesta. */
  makeScenarioId: number | null;
  /** Una frase: por qué existe. */
  proposito: string;
  /** Desde el P2 (B6.0): la ruta de un cron (`/api/cron/…`) o una etiqueta estable de un trabajo propuesto.
   *  Inmutable una vez puesta; las filas de cron solo las siembra `registroCrons.ts`. */
  clave: string | null;
  /** 'webhook' · 'calendario' · 'watch' · 'manual' · 'cron' (solo las filas sembradas). */
  disparador: string;
  dominio: Dominio;
  sistemas: string[];
  criticidad: Criticidad;
  etapa: Etapa;
  notas: string | null;
  /** Estas tres se refrescan del API de Make, no se teclean. */
  ultimaCorrida: string | null;
  erroresRecientes: number;
  opsMes: number | null;
  sincronizadoAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationEvent = {
  id: string;
  dominio: Dominio;
  tipo: string;
  estado: "pendiente" | "enviado" | "fallido" | "descartado";
  intentos: number;
  ultimo_error: string | null;
  destino: string | null;
  created_at: string;
  dispatched_at: string | null;
};

export type AutomationResult = { ok: true } | { ok: false; error: string };

/** El último latido FINAL de un cron (B6.0): solo metadatos de la corrida, nunca contenido. */
export type UltimoLatido = {
  clave: string;
  inicio: string;
  fin: string | null;
  estado: "ok" | "parcial" | "fallido";
  codigo_error: string | null;
};
