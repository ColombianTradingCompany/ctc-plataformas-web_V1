"use client";

import { useState } from "react";
import { eur, type Lot } from "./data";
import { useLang, type Lang } from "./i18n";
import styles from "./NarrativaSection.module.css";

const EN = {
  eyebrow: "Marketing asset · Plug & play · Included with every lot",
  h2: "Carry our narrative all the way to the cup",
  headP: "Every lot you buy comes tied to its public page on Cherry Picked: a QR ready for your packaging, your menu and your bar, connecting your end customer with the real story of the coffee they're drinking. And you decide exactly what's shown.",
  tVideos: "Origin and cupping videos",
  dVideos: "The farm, the people, the process and the Arena evaluation — the content we produce, ready for your channels.",
  tFicha: "Datasheet and score",
  dFicha: "Variety, process, altitude, sensory profile and the Q-Grader panel's score.",
  tCert: "Arena certificate + verifiable seal",
  dCert: "The cryptographic record of the evaluation and EUDR traceability to the plot, checkable by anyone.",
  tCredit: "Transparency Credit · the contract terms",
  dCredit1: "The maximum level of radical transparency: showing the ",
  dCredit2: "base price paid to the producer against the market's base price",
  dCredit3: " on the day of the contract. It's optional — transparency is offered, never imposed — but whoever turns it on makes every cup an argument.",
  dCreditNone: " (No lot has this option enabled by CTC yet.)",
  cardAria: "Preview of the lot's public page",
  urlPath: "lot",
  preview: "Preview",
  grade: "Grade",
  lineVideos: "Farm mini-documentary · Panel cupping on video",
  estimated: "(estimated)",
  ptsSca: "pts SCA",
  lineCert: "Arena certificate · verifiable seal · verifiable EUDR DDS",
  tcLabel: "Transparency Credit:",
  tc1: " base price paid to the producer ",
  tc2: " vs. the day's market base price ",
  tc3: " · 3-month option contract, terms in the open",
  qrAria: "Sample QR code",
  qr1: "Print the QR on your packaging:",
  qr2: "your customer scans, the story speaks.",
  empty: "No lots published yet to preview their public page.",
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Recurso de marketing · Plug & play · Incluido con cada lote",
    h2: "Lleva nuestra narrativa hasta la taza",
    headP: "Cada lote que compras viene atado a su página pública en Cherry Picked: un QR listo para tu empaque, tu carta y tu barra, que conecta a tu cliente final con la historia real del café que está tomando. Y tú decides exactamente qué se muestra.",
    tVideos: "Videos de origen y catación",
    dVideos: "La finca, las personas, el proceso y la evaluación en la Arena — el contenido que nosotros producimos, listo para tus canales.",
    tFicha: "Ficha técnica y puntaje",
    dFicha: "Variedad, proceso, altitud, perfil sensorial y puntaje del panel de Q-Graders.",
    tCert: "Certificado Arena + sello verificable",
    dCert: "El registro criptográfico de la evaluación y la trazabilidad EUDR al predio, comprobables por cualquiera.",
    tCredit: "Transparency Credit · las condiciones del contrato",
    dCredit1: "El nivel máximo de transparencia radical: mostrar el ",
    dCredit2: "precio base pagado al productor frente al precio base del mercado",
    dCredit3: " del día del contrato. Es opcional — la transparencia se ofrece, no se impone — pero quien lo activa convierte cada taza en un argumento.",
    dCreditNone: " (Aún no hay ningún lote con esta opción activada por CTC.)",
    cardAria: "Vista previa de la página pública del lote",
    urlPath: "lote",
    preview: "Vista previa",
    grade: "Grado",
    lineVideos: "Mini-documental de finca · Catación del panel en video",
    estimated: "(estimado)",
    ptsSca: "pts SCA",
    lineCert: "Certificado Arena · sello verificable · DDS EUDR verificable",
    tcLabel: "Transparency Credit:",
    tc1: " precio base pagado al productor ",
    tc2: " vs. precio base del mercado del día ",
    tc3: " · contrato de opción a 3 meses, condiciones a la vista",
    qrAria: "Código QR de ejemplo",
    qr1: "Imprime el QR en tu empaque:",
    qr2: "tu cliente escanea, la historia habla.",
    empty: "Aún no hay lotes publicados para previsualizar su página pública.",
  },
  de: {
    eyebrow: "Marketing-Material · Plug & play · Bei jedem Lot inklusive",
    h2: "Trag unsere Erzählung bis in die Tasse",
    headP: "Jeder gekaufte Lot ist mit seiner öffentlichen Seite auf Cherry Picked verknüpft: ein QR-Code, fertig für deine Verpackung, deine Karte und deine Bar, der deine Endkundschaft mit der echten Geschichte ihres Kaffees verbindet. Und du entscheidest genau, was gezeigt wird.",
    tVideos: "Ursprungs- und Verkostungsvideos",
    dVideos: "Die Finca, die Menschen, der Prozess und die Arena-Bewertung — Inhalte, die wir produzieren, fertig für deine Kanäle.",
    tFicha: "Datenblatt und Punktzahl",
    dFicha: "Varietät, Aufbereitung, Höhenlage, Sensorik-Profil und die Punktzahl des Q-Grader-Panels.",
    tCert: "Arena-Zertifikat + überprüfbares Siegel",
    dCert: "Der kryptografische Nachweis der Bewertung und die EUDR-Rückverfolgbarkeit bis zur Parzelle, für alle überprüfbar.",
    tCredit: "Transparency Credit · die Vertragskonditionen",
    dCredit1: "Die höchste Stufe radikaler Transparenz: der ",
    dCredit2: "Basispreis an den Produzenten neben dem Basispreis des Marktes",
    dCredit3: " am Vertragstag. Optional — Transparenz wird angeboten, nie verordnet — aber wer es aktiviert, macht jede Tasse zu einem Argument.",
    dCreditNone: " (Noch hat kein Lot diese Option von CTC aktiviert.)",
    cardAria: "Vorschau der öffentlichen Seite des Lots",
    urlPath: "lot",
    preview: "Vorschau",
    grade: "Grad",
    lineVideos: "Finca-Mini-Doku · Panel-Verkostung im Video",
    estimated: "(geschätzt)",
    ptsSca: "Pkt. SCA",
    lineCert: "Arena-Zertifikat · überprüfbares Siegel · überprüfbare EUDR-DDS",
    tcLabel: "Transparency Credit:",
    tc1: " Basispreis an den Produzenten ",
    tc2: " vs. Basispreis des Marktes am Tag ",
    tc3: " · 3-Monats-Optionsvertrag, Konditionen offen einsehbar",
    qrAria: "Beispiel-QR-Code",
    qr1: "Druck den QR auf deine Verpackung:",
    qr2: "dein Gast scannt, die Geschichte spricht.",
    empty: "Noch keine Lots veröffentlicht, um ihre öffentliche Seite anzuzeigen.",
  },
};

export function NarrativaSection({ lots }: { lots: Lot[] }) {
  const lang = useLang();
  const t = T[lang];
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
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>{t.h2}</h2>
          </div>
          <p>{t.headP}</p>
        </div>
        <div className={styles.narGrid}>
          <div className={styles.tglList}>
            <label className={styles.tgl}>
              <input type="checkbox" checked={videos} onChange={(e) => setVideos(e.target.checked)} />
              <span>
                <span className={styles.tt}>{t.tVideos}</span>
                <span className={styles.td}>{t.dVideos}</span>
              </span>
            </label>
            <label className={styles.tgl}>
              <input type="checkbox" checked={ficha} onChange={(e) => setFicha(e.target.checked)} />
              <span>
                <span className={styles.tt}>{t.tFicha}</span>
                <span className={styles.td}>{t.dFicha}</span>
              </span>
            </label>
            <label className={styles.tgl}>
              <input type="checkbox" checked={cert} onChange={(e) => setCert(e.target.checked)} />
              <span>
                <span className={styles.tt}>{t.tCert}</span>
                <span className={styles.td}>{t.dCert}</span>
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
                <span className={styles.tt}>{t.tCredit}</span>
                <span className={styles.td}>
                  {t.dCredit1}
                  <strong>{t.dCredit2}</strong>
                  {t.dCredit3}
                  {!transparencyLot && t.dCreditNone}
                </span>
              </span>
            </label>
          </div>
          <div className={styles.pubcard} aria-label={t.cardAria}>
            {previewLot ? (
              <>
                <div className={styles.ph}>
                  <span>cherrypicked.coffee/{t.urlPath}/{previewLot.code}</span>
                  <span>{t.preview}</span>
                </div>
                <h4>{previewLot.name}</h4>
                <p className={styles.porig}>
                  {previewLot.origin} · {t.grade} {previewLot.grade}
                </p>
                <div style={{ marginTop: 14 }}>
                  {videos && (
                    <div className={styles.publine}>
                      <span className={styles.plIc}>▸</span>
                      <span>{t.lineVideos}</span>
                    </div>
                  )}
                  {ficha && (
                    <div className={styles.publine}>
                      <span className={styles.plIc}>▸</span>
                      <span>
                        {previewLot.variety} · {previewLot.process} · {previewLot.alt} · {previewLot.score}
                        {previewLot.scoreEstimated ? ` ${t.estimated}` : ""} {t.ptsSca}
                      </span>
                    </div>
                  )}
                  {cert && (
                    <div className={styles.publine}>
                      <span className={styles.plIc}>⛓</span>
                      <span>{t.lineCert}</span>
                    </div>
                  )}
                  {tcredit && previewLot.transparency && (
                    <div className={`${styles.publine} ${styles.tcredit}`}>
                      <span className={styles.plIc}>✦</span>
                      <span>
                        <b>{t.tcLabel}</b>
                        {t.tc1}
                        <b>{eur(previewLot.transparency.locked, lang)}</b>
                        {t.tc2}
                        <b>{eur(previewLot.transparency.reference, lang)}</b>
                        {t.tc3}
                      </span>
                    </div>
                  )}
                </div>
                <div className={styles.pubQr}>
                  <span className={styles.qr} role="img" aria-label={t.qrAria} />
                  <span>{t.qr1}<br />{t.qr2}</span>
                </div>
              </>
            ) : (
              <p className={styles.porig}>{t.empty}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
