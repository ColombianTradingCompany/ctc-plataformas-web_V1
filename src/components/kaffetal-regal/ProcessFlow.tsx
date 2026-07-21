"use client";

// ── El camino completo del productor (2026-07-20, pedido del owner) ──────────
// Diagrama de flujo HTML/CSS puro que mapea el proceso REAL de punta a punta —
// no los "cinco pasos" (esos son la simplificación de arriba). Es también el
// artefacto de ALINEACIÓN: si algo de lo que dice no coincide con lo que hace
// la plataforma, uno de los dos está mal y hay que corregirlo.
//
// El proceso canónico que dibuja (mismo orden que el stepper del lote):
//   FT → FT2 → EUDR → VID → [Solicitar evaluación] → EVA (Apto/No Apto)
//   → [Postular a la Arena] → MUE → Sondeo → Arena → GAL
// con los DOS puntos de equilibrio resaltados: EVA entrega el informe EUDR,
// GAL entrega la evaluación del Q-Grader (perfil de taza + granulometría) y,
// clasificado, la información de la Arena.

import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./ProcessFlow.module.css";

type Branch = { tone: "ok" | "bad" | "info"; head: string; body: string };
type Node = {
  code: string;
  title: string;
  deliver?: string; // hito de entrega (dorado)
  detail: React.ReactNode;
  branches?: Branch[];
};
type Phase = { name: string; tag: string; nodes: Node[] };

type Dict = {
  phases: Phase[];
  gradesTitle: string;
  grades: { cls: string; head: string; body: string }[];
  foot: string;
};

const T: Record<Lang, Dict> = {
  es: {
    phases: [
      {
        name: "Documentación",
        tag: "sin costo · a su ritmo",
        nodes: [
          {
            code: "01",
            title: "Cuenta e información general",
            detail: (
              <>Se registra <b>una sola vez</b>: razón social, NIT/CC, agricultor, cédula cafetera, celular y foto. Es la identidad de todos sus cafés.</>
            ),
          },
          {
            code: "02",
            title: "Finca + EUDR del predio",
            detail: (
              <>Ubicación en el mapa (<b>polígono si supera 4 ha</b>), altura calculada sola, tenencia de la tierra y su documento de respaldo. CTC revisa cada finca.</>
            ),
            branches: [
              { tone: "ok", head: "Aprobada", body: "El predio queda listo para asociar lotes." },
              { tone: "bad", head: "No aprobada", body: "Con la razón visible — corrija y reenvíe." },
            ],
          },
          {
            code: "03",
            title: "Ficha Técnica del lote",
            detail: (
              <><b>FT</b> (identidad y origen) → <b>FT2</b> (certificados con soporte · perfil de taza · análisis físico) → <b>EUDR</b> del lote → <b>Video</b>. Al final, «Completar y Enviar» solicita la evaluación.</>
            ),
          },
          {
            code: "EVA",
            title: "Evaluación documental de CTC",
            deliver: "★ Entrega: su informe EUDR",
            detail: (
              <>CTC revisa la Ficha como checklist y resuelve el nivel de riesgo EUDR. Es el <b>primer punto de equilibrio</b>: hasta aquí todo fue gratis.</>
            ),
            branches: [
              { tone: "ok", head: "Apto", body: "El lote puede postularse a la Arena — la decisión es suya." },
              { tone: "bad", head: "No Apto", body: "Con la razón visible; se corrige y se reabre la evaluación." },
            ],
          },
        ],
      },
      {
        name: "Kaffetal Regal Arena",
        tag: "tramo pagado · su decisión",
        nodes: [
          {
            code: "04",
            title: "Postulación",
            detail: (
              <><b>$80.000 por lote</b>. Un código de campaña (KRX-) muestra su descuento al instante. Cada lote puede competir en <b>máximo 2 temporadas</b>.</>
            ),
          },
          {
            code: "MUE",
            title: "Pago + muestra de 2 kg",
            detail: (
              <>Pago por Nequi con su código como referencia, y la muestra viaja <b>a ciegas</b>: el paquete lleva solo el código del lote, nunca su nombre. Con ambos confirmados, el lote entra <b>en fila</b>.</>
            ),
          },
          {
            code: "SON",
            title: "Sondeo preliminar",
            detail: (
              <>Su muestra viaja en un <b>bache</b> (hasta 30 lotes) al laboratorio de calidades. El resultado se registra con la planilla SCA y el análisis físico.</>
            ),
            branches: [
              { tone: "ok", head: "Aprobado", body: "Vuelve a la fila, listo para una sesión de Arena." },
              { tone: "bad", head: "No superado", body: "Reembolso del 80% + recomendaciones de mejora — puede intentarlo otra temporada." },
            ],
          },
          {
            code: "ARE",
            title: "Sesión de Arena",
            detail: (
              <><b>5 o 7 cafés a ciegas</b> ante el panel: factor de rendimiento, dos cataciones con descartes graduados (Black/Red, luego Red/Blue) y la ronda final con 1º·2º·3º.</>
            ),
          },
        ],
      },
      {
        name: "Resultado",
        tag: "todos salen con grado",
        nodes: [
          {
            code: "GAL",
            title: "Galardón",
            deliver: "★ Entrega: la evaluación del Q-Grader (perfil de taza + granulometría) y la información de su Arena",
            detail: (
              <>El <b>segundo punto de equilibrio</b>: todo participante recibe su grado CTC y su <b>Pasaporte del Kaffetal Club</b> — gane o no gane. El grado decide el destino:</>
            ),
          },
        ],
      },
    ],
    gradesTitle: "",
    grades: [
      { cls: "gBlack", head: "Black", body: "Negociación directa con CTC, aparte del catálogo." },
      { cls: "gRedBlue", head: "Red · Blue", body: "Contrato de compra con liberaciones mensuales → catálogo Cherry Picked." },
      { cls: "gGold", head: "Gold", body: "Contrato premium → catálogo Cherry Picked." },
      { cls: "gTyrian", head: "Tyrian", body: "El café de subasta: se remata, no se lista." },
    ],
    foot:
      "Este es el proceso completo y real — los cinco pasos de arriba son su resumen. Si algo aquí no coincide con lo que ve en su cuenta, escríbanos: uno de los dos está mal y lo corregimos.",
  },
  en: {
    phases: [
      {
        name: "Documentation",
        tag: "free · at your pace",
        nodes: [
          {
            code: "01",
            title: "Account and general information",
            detail: (
              <>Registered <b>once</b>: business name, legal ID, grower, coffee-grower card, phone and photo. It is the identity behind all your coffees.</>
            ),
          },
          {
            code: "02",
            title: "Farm + plot EUDR",
            detail: (
              <>Location on the map (<b>polygon above 4 ha</b>), altitude computed for you, land tenure and its supporting document. CTC reviews every farm.</>
            ),
            branches: [
              { tone: "ok", head: "Approved", body: "The plot is ready to attach lots to." },
              { tone: "bad", head: "Not approved", body: "With the reason visible — fix and resubmit." },
            ],
          },
          {
            code: "03",
            title: "The lot's technical datasheet",
            detail: (
              <><b>FT</b> (identity &amp; origin) → <b>FT2</b> (certificates with proof · cup profile · physical analysis) → the lot&apos;s <b>EUDR</b> → <b>Video</b>. &laquo;Complete &amp; Send&raquo; requests the evaluation.</>
            ),
          },
          {
            code: "EVA",
            title: "CTC's documentation evaluation",
            deliver: "★ Delivered: your EUDR report",
            detail: (
              <>CTC reviews the datasheet as a checklist and resolves the EUDR risk level. The <b>first equilibrium point</b>: everything up to here was free.</>
            ),
            branches: [
              { tone: "ok", head: "Fit (Apto)", body: "The lot may enter the Arena — the decision is yours." },
              { tone: "bad", head: "Not fit", body: "With the reason visible; fix it and the evaluation reopens." },
            ],
          },
        ],
      },
      {
        name: "Kaffetal Regal Arena",
        tag: "paid track · your decision",
        nodes: [
          {
            code: "04",
            title: "Entry",
            detail: (
              <><b>$80,000 COP per lot</b>. A campaign code (KRX-) reveals its discount instantly. Each lot may compete in <b>at most 2 seasons</b>.</>
            ),
          },
          {
            code: "MUE",
            title: "Payment + 2 kg sample",
            detail: (
              <>Pay via Nequi with your code as reference; the sample travels <b>blind</b> — the package carries only the lot code, never your name. With both confirmed, the lot joins <b>the queue</b>.</>
            ),
          },
          {
            code: "SON",
            title: "Preliminary screening",
            detail: (
              <>Your sample travels in a <b>batch</b> (up to 30 lots) to the quality laboratory. The result is recorded with the SCA sheet and the physical analysis.</>
            ),
            branches: [
              { tone: "ok", head: "Passed", body: "Back in the queue, ready for an Arena session." },
              { tone: "bad", head: "Not passed", body: "80% refund + improvement recommendations — try again another season." },
            ],
          },
          {
            code: "ARE",
            title: "Arena session",
            detail: (
              <><b>5 or 7 coffees, blind</b>, before the panel: yield factor, two cuppings with graded discards (Black/Red, then Red/Blue) and the final round with 1st·2nd·3rd.</>
            ),
          },
        ],
      },
      {
        name: "Result",
        tag: "everyone leaves with a grade",
        nodes: [
          {
            code: "GAL",
            title: "Award",
            deliver: "★ Delivered: the Q-Grader evaluation (cup profile + granulometry) and your Arena's information",
            detail: (
              <>The <b>second equilibrium point</b>: every participant receives their CTC grade and their <b>Kaffetal Club passport</b> — win or not. The grade decides the destination:</>
            ),
          },
        ],
      },
    ],
    gradesTitle: "",
    grades: [
      { cls: "gBlack", head: "Black", body: "Direct negotiation with CTC, apart from the catalog." },
      { cls: "gRedBlue", head: "Red · Blue", body: "Purchase contract with monthly releases → Cherry Picked catalog." },
      { cls: "gGold", head: "Gold", body: "Premium contract → Cherry Picked catalog." },
      { cls: "gTyrian", head: "Tyrian", body: "The auction coffee: it is auctioned, not listed." },
    ],
    foot:
      "This is the full, real process — the five steps above are its summary. If anything here doesn't match what you see in your account, write to us: one of the two is wrong and we'll fix it.",
  },
  de: {
    phases: [
      {
        name: "Dokumentation",
        tag: "kostenlos · in Ihrem Tempo",
        nodes: [
          {
            code: "01",
            title: "Konto und allgemeine Daten",
            detail: (
              <><b>Einmal</b> registriert: Firmenname, rechtliche ID, Kaffeebauer, Cédula Cafetera, Telefon und Foto. Die Identität hinter all Ihren Kaffees.</>
            ),
          },
          {
            code: "02",
            title: "Finca + EUDR des Grundstücks",
            detail: (
              <>Standort auf der Karte (<b>Polygon über 4 ha</b>), automatisch berechnete Höhe, Landbesitz und Nachweisdokument. CTC prüft jede Finca.</>
            ),
            branches: [
              { tone: "ok", head: "Genehmigt", body: "Das Grundstück ist bereit für Lots." },
              { tone: "bad", head: "Nicht genehmigt", body: "Mit sichtbarem Grund — korrigieren und erneut senden." },
            ],
          },
          {
            code: "03",
            title: "Das technische Datenblatt des Lots",
            detail: (
              <><b>FT</b> (Identität & Ursprung) → <b>FT2</b> (Zertifikate mit Nachweis · Tassenprofil · physische Analyse) → <b>EUDR</b> des Lots → <b>Video</b>. &bdquo;Abschließen &amp; Senden&ldquo; beantragt die Bewertung.</>
            ),
          },
          {
            code: "EVA",
            title: "CTCs Dokumentationsbewertung",
            deliver: "★ Geliefert: Ihr EUDR-Bericht",
            detail: (
              <>CTC prüft das Datenblatt als Checkliste und bestimmt das EUDR-Risiko. Der <b>erste Gleichgewichtspunkt</b>: bis hierher war alles kostenlos.</>
            ),
            branches: [
              { tone: "ok", head: "Geeignet (Apto)", body: "Das Lot darf in die Arena — die Entscheidung liegt bei Ihnen." },
              { tone: "bad", head: "Nicht geeignet", body: "Mit sichtbarem Grund; korrigieren, und die Bewertung öffnet sich neu." },
            ],
          },
        ],
      },
      {
        name: "Kaffetal Regal Arena",
        tag: "bezahlte Strecke · Ihre Entscheidung",
        nodes: [
          {
            code: "04",
            title: "Anmeldung",
            detail: (
              <><b>$80.000 COP pro Lot</b>. Ein Kampagnencode (KRX-) zeigt seinen Rabatt sofort. Jedes Lot darf in <b>höchstens 2 Saisons</b> antreten.</>
            ),
          },
          {
            code: "MUE",
            title: "Zahlung + 2-kg-Muster",
            detail: (
              <>Zahlung per Nequi mit Ihrem Code als Referenz; das Muster reist <b>blind</b> — das Paket trägt nur den Lot-Code, nie Ihren Namen. Sind beide bestätigt, reiht sich das Lot <b>in die Warteschlange</b> ein.</>
            ),
          },
          {
            code: "SON",
            title: "Vorprüfung",
            detail: (
              <>Ihr Muster reist in einer <b>Charge</b> (bis 30 Lots) ins Qualitätslabor. Das Ergebnis wird mit SCA-Bogen und physischer Analyse erfasst.</>
            ),
            branches: [
              { tone: "ok", head: "Bestanden", body: "Zurück in der Warteschlange, bereit für eine Arena-Session." },
              { tone: "bad", head: "Nicht bestanden", body: "80% Rückerstattung + Verbesserungsempfehlungen — nächste Saison erneut versuchen." },
            ],
          },
          {
            code: "ARE",
            title: "Arena-Session",
            detail: (
              <><b>5 oder 7 Kaffees, blind</b>, vor dem Panel: Ausbeutefaktor, zwei Verkostungen mit abgestuften Ausscheidungen (Black/Red, dann Red/Blue) und die Finalrunde mit 1.·2.·3.</>
            ),
          },
        ],
      },
      {
        name: "Ergebnis",
        tag: "alle gehen mit einem Grad",
        nodes: [
          {
            code: "GAL",
            title: "Auszeichnung",
            deliver: "★ Geliefert: die Q-Grader-Bewertung (Tassenprofil + Granulometrie) und die Informationen Ihrer Arena",
            detail: (
              <>Der <b>zweite Gleichgewichtspunkt</b>: jeder Teilnehmer erhält seinen CTC-Grad und seinen <b>Kaffetal-Club-Pass</b> — ob Sieg oder nicht. Der Grad entscheidet das Ziel:</>
            ),
          },
        ],
      },
    ],
    gradesTitle: "",
    grades: [
      { cls: "gBlack", head: "Black", body: "Direktverhandlung mit CTC, abseits des Katalogs." },
      { cls: "gRedBlue", head: "Red · Blue", body: "Kaufvertrag mit monatlichen Freigaben → Cherry-Picked-Katalog." },
      { cls: "gGold", head: "Gold", body: "Premium-Vertrag → Cherry-Picked-Katalog." },
      { cls: "gTyrian", head: "Tyrian", body: "Der Auktionskaffee: er wird versteigert, nicht gelistet." },
    ],
    foot:
      "Dies ist der vollständige, echte Prozess — die fünf Schritte oben sind seine Zusammenfassung. Passt hier etwas nicht zu dem, was Sie in Ihrem Konto sehen, schreiben Sie uns: eines von beiden ist falsch, und wir korrigieren es.",
  },
};

const GRADE_CLS: Record<string, string> = {
  gBlack: styles.gBlack,
  gRedBlue: styles.gRedBlue,
  gGold: styles.gGold,
  gTyrian: styles.gTyrian,
};
const TONE_CLS: Record<Branch["tone"], string> = { ok: styles.ok, bad: styles.bad, info: styles.info };

export function ProcessFlow() {
  const t = T[useLang()];
  return (
    <div className={styles.flow}>
      {t.phases.map((phase, pi) => (
        <div key={phase.name}>
          {pi > 0 && (
            <div className={styles.phaseArrow} aria-hidden>
              ▼
            </div>
          )}
          <div className={styles.phase}>
            <span className={styles.phaseName}>{phase.name}</span>
            <span className={styles.phaseTag}>{phase.tag}</span>
          </div>
          <div className={styles.nodes}>
            {phase.nodes.map((n) => (
              <div key={n.code} className={`${styles.node} ${n.deliver ? styles.milestone : ""}`}>
                <div className={styles.nodeHead}>
                  <span className={styles.code}>{n.code}</span>
                  <span className={styles.nodeTitle}>{n.title}</span>
                  {n.deliver && <span className={styles.deliver}>{n.deliver}</span>}
                </div>
                <p className={styles.nodeDetail}>{n.detail}</p>
                {n.branches && (
                  <div className={styles.branches}>
                    {n.branches.map((b) => (
                      <span key={b.head} className={`${styles.branch} ${TONE_CLS[b.tone]}`}>
                        <b>{b.head}</b>
                        {b.body}
                      </span>
                    ))}
                  </div>
                )}
                {/* El abanico de grados vive dentro del nodo GAL */}
                {n.code === "GAL" && (
                  <div className={styles.grades}>
                    {t.grades.map((g) => (
                      <span key={g.head} className={`${styles.grade} ${GRADE_CLS[g.cls]}`}>
                        <b>{g.head}</b>
                        {g.body}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className={styles.foot}>{t.foot}</p>
    </div>
  );
}
