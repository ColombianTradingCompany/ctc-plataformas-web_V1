// ── ECP · Automatizaciones · tipos ───────────────────────────────────────────
import type { Criticidad, Dominio, Etapa } from "./dominios";

export type Automation = {
  id: string;
  nombre: string;
  /** El escenario en Make. Null mientras es solo una propuesta. */
  makeScenarioId: number | null;
  /** Una frase: por qué existe. */
  proposito: string;
  dominio: Dominio;
  disparador: string;
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
