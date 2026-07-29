"use client";

// F2 (2026-07-29, docs/EUDR_RESTRUCTURE_PLAN.md): A4 dejó de ser un formulario.
// Los sellos del lote se DERIVAN — nadie marca una casilla: un claim vale solo
// si CADA finca aportante tiene el certificado vigente EN LA VENTANA DE
// COSECHA. Bajo el 100% no hay sello: se muestra la cobertura y la finca que
// bloquea, con la razón (el vacío es una instrucción, no un castigo).

import { useMemo } from "react";
import { deriveClaims, type CertInput, type ContributionInput, type ClaimBlockerReason } from "@/lib/lotComposition";
import { ORIGIN_CERTS, INTL_CERTS } from "../fichaData";
import { FieldInfo } from "./FieldInfo";
import type { PaneProps } from "./types";
import styles from "../../FichaView.module.css";

const SCHEME_LABEL: Record<string, string> = Object.fromEntries([
  ...ORIGIN_CERTS,
  ...INTL_CERTS.map(([key, , label]) => [key, label] as [string, string]),
]);

const BLOCKER_LABEL: Record<ClaimBlockerReason, string> = {
  sin_certificado: "no tiene este certificado registrado",
  sin_vigencia: "el certificado no tiene fechas de vigencia",
  vencido_en_cosecha: "el certificado no cubre la ventana de recolección",
  sin_fechas_cosecha: "faltan las fechas de recolección (A2)",
};

export function PaneA4({ data, fincas, fincaCerts }: PaneProps) {
  const contribs: ContributionInput[] = useMemo(
    () =>
      data.contributions
        .map((c) => {
          const f = fincas.find((x) => x.id === c.finca_id);
          if (!f) return null;
          return {
            fincaId: f.id,
            fincaName: f.name,
            weightKg: c.weight_kg.trim() ? Number(c.weight_kg.replace(",", ".")) : null,
            municipio: f.mun !== "—" ? f.mun : "",
            departamento: f.depto !== "—" ? f.depto : "",
            pais: "Colombia",
          };
        })
        .filter((x): x is ContributionInput => !!x),
    [data.contributions, fincas]
  );
  const certInputs: CertInput[] = useMemo(
    () =>
      fincaCerts
        .filter((c) => contribs.some((x) => x.fincaId === c.fincaId))
        .map((c) => ({
          fincaId: c.fincaId,
          scheme: c.scheme,
          validFrom: c.validFrom || null,
          validTo: c.validTo || null,
          verifiedByCtc: c.verifiedByCtc,
        })),
    [fincaCerts, contribs]
  );
  const claims = useMemo(
    () => deriveClaims(contribs, certInputs, { from: data.harvest_from || null, to: data.harvest_to || null }),
    [contribs, certInputs, data.harvest_from, data.harvest_to]
  );

  return (
    <div className={styles.fsec}>
      <h3><span className={styles.fn}>A4</span> Sellos del Lote <small style={{ fontWeight: 400 }}>(derivados de sus fincas)</small></h3>
      <p className={styles.fexample} style={{ marginTop: 8 }}>
        Nada que marcar aquí: un sello aparece cuando <b>todas</b> las fincas aportantes (A2) tienen ese certificado{" "}
        <b>vigente durante la recolección</b>. Los certificados se registran en <b>Mis fincas → Certificaciones</b>.
        <FieldInfo text="La regla europea: un certificado respalda al café que se recogió mientras estaba vigente — no al que se exporta hoy. Y un lote solo puede presumir un sello si el 100% de su peso viene de fincas certificadas: 'casi todo certificado' no es un sello, es una cobertura." />
      </p>

      {contribs.length === 0 ? (
        <p className={styles.fexample} style={{ marginTop: 12 }}>Elija primero las fincas del lote en A2.</p>
      ) : claims.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
          Sus fincas aportantes no tienen certificados registrados. Eso <b>no impide exportar</b> — el EUDR no exige
          certificados — pero si su finca tiene alguno (Rainforest, orgánico, BPA…), regístrelo en{" "}
          <b>Mis fincas → Certificaciones</b> y este lote lo heredará.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {claims.map((c) => (
            <div key={c.scheme} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <b style={{ fontSize: 13 }}>{SCHEME_LABEL[c.scheme] ?? c.scheme}</b>
                {c.claim ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green, #2E7D52)" }}>
                    ✓ Sello del lote{c.fullyVerified ? " · verificado por CTC" : " · declarado"}
                  </span>
                ) : (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#B45309" }}>
                    {c.binary
                      ? "Sin sello"
                      : c.coveragePct != null
                        ? `Cobertura ${c.coveragePct}% del peso — sin sello`
                        : "Cobertura incompleta (faltan kg por finca en A2) — sin sello"}
                  </span>
                )}
              </div>
              {c.blockers.length > 0 && (
                <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12.5, color: "var(--muted)" }}>
                  {c.blockers.map((b, i) => (
                    <li key={i}>
                      <b>{b.fincaName}</b>: {BLOCKER_LABEL[b.reason]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
