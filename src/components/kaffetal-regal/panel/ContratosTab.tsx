"use client";

import { CONTRACT_STATUS_LABEL, GRADES, type GeneralInfo, type ProducerContract } from "../data";
import { CtcRef } from "./CtcRef";
import styles from "../AppDashboard.module.css";

// ── Contratos y Compras (V5.16: trasplante) ─────────────────────────────────
// En la V5.16 esta pestaña TRASPLANTA el módulo «Mis contratos» de la rejilla
// retirada, con su puerta del Kaffetal Club intacta. Las cuatro secciones
// nuevas (Ofertas de Temporada · Contratos de Temporada · Ofertas Black ·
// Subastas Tyrian) llegan en la V5.18 con el modelo de ofertas.
export function ContratosTab({
  gi,
  contracts,
  onGoEvaluaciones,
}: {
  gi: GeneralInfo;
  contracts: ProducerContract[];
  onGoEvaluaciones: () => void;
}) {
  const isClubMember = !!gi.clubMemberSince;

  return (
    <div className={styles.ag} style={{ marginTop: 14 }}>
      {!isClubMember ? (
        <div className={`${styles.acard} ${styles.wide}`}>
          <span className={styles.k}>Mis contratos · Pasaporte del Kaffetal Club</span>
          <div className={styles.alist} style={{ marginTop: 8 }}>
            Kaffetal Regal es también un club de exportadores: el <b>Kaffetal Club</b>, el círculo de productores
            con los que CTC firma contratos de compra y cuyos lotes viajan con nombre propio al <b>catálogo activo</b>{" "}
            y al mercado de <b>Cherry Picked</b>{" "}(Europa). Su <b>Pasaporte se activa automáticamente</b> cuando un
            lote suyo <b>compite en una jornada de Arena</b> — postule un lote apto desde{" "}
            <b>Evaluar mi Café</b> y, al competir, su membresía y sus contratos aparecerán aquí.
          </div>
          <button className="btn btn-sm btn-solid" style={{ marginTop: 14 }} onClick={onGoEvaluaciones}>
            Ir a Evaluar mi Café →
          </button>
        </div>
      ) : (
        <div className={`${styles.acard} ${styles.wide}`}>
          <span className={styles.k}>
            Mis contratos con CTC · Pasaporte activo desde {new Date(gi.clubMemberSince!).toLocaleDateString("es-CO")}
          </span>
          {contracts.length === 0 ? (
            <div className={styles.alist} style={{ marginTop: 8 }}>Sin lotes galardonados todavía. Cuando un lote suyo gane un galardón, su contrato aparecerá aquí.</div>
          ) : (
            contracts.map((c) => (
              <div className={styles.fincarow} key={c.id} style={{ marginTop: 10 }}>
                <h5>
                  <CtcRef id={c.lotId} /> · {c.lotName}{" "}
                  {c.grade && <b style={{ color: GRADES[c.grade] }}>· {c.grade}</b>}
                </h5>
                <div className={styles.sub}>
                  Estado: <b>{CONTRACT_STATUS_LABEL[c.status]}</b>
                  {c.quantityFrozenKg != null && <> · Congelado: <b>{c.quantityFrozenKg} kg pergamino</b></>}
                  {c.pricePerKgLocked != null && <> · Precio: <b>${c.pricePerKgLocked}/kg</b></>}
                </div>
                <div className={styles.track} aria-label="Progreso del trato">
                  {[1, 2, 3].map((m) => (
                    <i key={m} className={c.releases.find((r) => r.month === m)?.releasedAt ? styles.on : ""} />
                  ))}
                </div>
                <div className={styles.alist} style={{ marginTop: 4 }}>
                  {c.releases.map((r) => (
                    <span key={r.month}>
                      Mes {r.month}: {r.releasedKg != null ? `liberó ${r.releasedKg} kg` : "pendiente"}
                      {r.shippedAt ? " · enviado" : ""}
                      {r.month < 3 ? " · " : ""}
                    </span>
                  ))}
                </div>
                {c.humidity.length > 0 && (
                  <div className={styles.alist} style={{ marginTop: 6 }}>
                    Humedad: {c.humidity.map((h) => `mes ${h.month}: ${h.pct.toFixed(1)}%${h.flagged ? " ⚠" : " ✓"}`).join(" · ")}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
