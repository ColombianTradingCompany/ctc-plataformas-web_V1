"use client";

import { useState } from "react";
import { eur, type Lot } from "./data";
import styles from "./NarrativaSection.module.css";

export function NarrativaSection({ lots }: { lots: Lot[] }) {
  const [videos, setVideos] = useState(true);
  const [ficha, setFicha] = useState(true);
  const [cert, setCert] = useState(true);
  const [tcredit, setTcredit] = useState(false);

  const transparencyLot = lots.find((l) => l.transparency);
  const previewLot = transparencyLot ?? lots[0] ?? null;

  return (
    <section id="narrativa">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">Recurso de marketing · Plug &amp; play · Incluido con cada lote</p>
            <h2>Lleva nuestra narrativa hasta la taza</h2>
          </div>
          <p>
            Cada lote que compras viene atado a su página pública en Cherry Picked: un QR listo para tu empaque, tu
            carta y tu barra, que conecta a tu cliente final con la historia real del café que está tomando. Y tú
            decides exactamente qué se muestra.
          </p>
        </div>
        <div className={styles.narGrid}>
          <div className={styles.tglList}>
            <label className={styles.tgl}>
              <input type="checkbox" checked={videos} onChange={(e) => setVideos(e.target.checked)} />
              <span>
                <span className={styles.tt}>Videos de origen y catación</span>
                <span className={styles.td}>La finca, las personas, el proceso y la evaluación en la Arena — el contenido que nosotros producimos, listo para tus canales.</span>
              </span>
            </label>
            <label className={styles.tgl}>
              <input type="checkbox" checked={ficha} onChange={(e) => setFicha(e.target.checked)} />
              <span>
                <span className={styles.tt}>Ficha técnica y puntaje</span>
                <span className={styles.td}>Variedad, proceso, altitud, perfil sensorial y puntaje del panel de Q-Graders.</span>
              </span>
            </label>
            <label className={styles.tgl}>
              <input type="checkbox" checked={cert} onChange={(e) => setCert(e.target.checked)} />
              <span>
                <span className={styles.tt}>Certificado Arena + sello verificable</span>
                <span className={styles.td}>El registro criptográfico de la evaluación y la trazabilidad EUDR al predio, comprobables por cualquiera.</span>
              </span>
            </label>
            <label className={`${styles.tgl} ${styles.tc}`}>
              <input
                type="checkbox"
                checked={tcredit}
                disabled={!transparencyLot}
                onChange={(e) => setTcredit(e.target.checked)}
              />
              <span>
                <span className={styles.tt}>Transparency Credit · las condiciones del contrato</span>
                <span className={styles.td}>
                  El nivel máximo de transparencia radical: mostrar el <strong>precio base pagado al productor
                  frente al precio base del mercado</strong> del día del contrato. Es opcional — la transparencia se
                  ofrece, no se impone — pero quien lo activa convierte cada taza en un argumento.
                  {!transparencyLot && " (Aún no hay ningún lote con esta opción activada por CTC.)"}
                </span>
              </span>
            </label>
          </div>
          <div className={styles.pubcard} aria-label="Vista previa de la página pública del lote">
            {previewLot ? (
              <>
                <div className={styles.ph}>
                  <span>cherrypicked.coffee/lote/{previewLot.code}</span>
                  <span>Vista previa</span>
                </div>
                <h4>{previewLot.name}</h4>
                <p className={styles.porig}>
                  {previewLot.origin} · Grado {previewLot.grade}
                </p>
                <div style={{ marginTop: 14 }}>
                  {videos && (
                    <div className={styles.publine}>
                      <span className={styles.plIc}>▸</span>
                      <span>Mini-documental de finca · Catación del panel en video</span>
                    </div>
                  )}
                  {ficha && (
                    <div className={styles.publine}>
                      <span className={styles.plIc}>▸</span>
                      <span>
                        {previewLot.variety} · {previewLot.process} · {previewLot.alt} · {previewLot.score} pts SCA
                      </span>
                    </div>
                  )}
                  {cert && (
                    <div className={styles.publine}>
                      <span className={styles.plIc}>⛓</span>
                      <span>Certificado Arena · sello verificable · DDS EUDR verificable</span>
                    </div>
                  )}
                  {tcredit && previewLot.transparency && (
                    <div className={`${styles.publine} ${styles.tcredit}`}>
                      <span className={styles.plIc}>✦</span>
                      <span>
                        <b>Transparency Credit:</b> precio base pagado al productor{" "}
                        <b>{eur(previewLot.transparency.locked)}</b> vs. precio base del mercado del día{" "}
                        <b>{eur(previewLot.transparency.reference)}</b> · contrato de opción a 3 meses, condiciones a la vista
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.pubQr}>
                  <span className={styles.qr} role="img" aria-label="Código QR de ejemplo" />
                  <span>Imprime el QR en tu empaque:<br />tu cliente escanea, la historia habla.</span>
                </div>
              </>
            ) : (
              <p className={styles.porig}>Aún no hay lotes publicados para previsualizar su página pública.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
