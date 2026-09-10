import type { PvcEntradas, PvcParams, PvcSalida } from "./motor";

// ── PVC · tipos de las filas ─────────────────────────────────────────────────
// Tres capas versionadas por separado (docs/PVC_BCP_PLAN.md §1):
//   · pvc_model_versions  los PARÁMETROS del método (cambian entre franjas, con acta)
//   · pvc_editions        los NÚMEROS de una franja (inmutables una vez publicados)
//   · el dossier          los PDF D0–D9 regenerados por edición
// Las dos primeras son tablas service-role-only (RLS activa, cero políticas);
// lo público sale SOLO por la vista `public_pvc_current`.

export type PvcEditionStatus = "draft" | "computed" | "published" | "corrected" | "superseded";

export type PvcModelVersion = {
  id: string;
  version: string;
  params: PvcParams;
  notes: string | null;
  createdAt: string;
};

export type PvcEdition = {
  id: string;
  code: string;
  modelVersionId: string;
  modelVersion: string | null;
  status: PvcEditionStatus;
  cutDate: string | null;
  publishDate: string | null;
  validFrom: string | null;
  validTo: string | null;
  inputs: PvcEntradas;
  outputs: PvcSalida;
  pvcCop: number | null;
  hash: string | null;
  correctionOf: string | null;
  publishedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type PvcResult = { ok: true; id?: string } | { ok: false; error: string };

/** Lo que ve cualquiera (la vista pública): la edición vigente, sin entradas. */
export type PvcCurrent = {
  code: string;
  pvcCop: number;
  cutDate: string | null;
  publishDate: string | null;
  validFrom: string | null;
  validTo: string | null;
  modelVersion: string | null;
  escalera: PvcSalida["escalera"];
  pila: PvcSalida["pila"];
  kpis: PvcSalida["kpis"];
};
