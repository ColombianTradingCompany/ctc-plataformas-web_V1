"use client";

import { useState } from "react";
import type { Finca, GeneralInfo } from "../data";
import { submitLeadAuthed } from "@/lib/leads/actions";
import { useToast } from "@/components/Toast";
import { DIRECTORIO_HREF } from "@/lib/directorioLink";
import { FlipCard } from "./FlipCard";
import flip from "./FlipCard.module.css";
import styles from "../AppDashboard.module.css";

// ── Ecosistema de Valor (V5.16) ─────────────────────────────────────────────
// Las plataformas y servicios de la red CTCx, como TARJETAS QUE VOLTEAN: el
// frente es el logo, el dorso dice qué es y ofrece la acción. Decisiones del
// owner (2026-08-21): Directorio y Herramientas ABREN LA PLATAFORMA (el
// ToolPanel embebido se retiró — Plus se administra en Herramientas del Café);
// Coffeed abre su portada; CTC Tech y Varietales abren su solicitud
// especializada aquí mismo; Terratalento va en gris, SOLO retroalimentación
// (el módulo de Jornadas de Recolecta se retiró del panel con él).
const PROD = process.env.NODE_ENV === "production";
const URL_RED = {
  herramientas: PROD ? "https://herramientas.ctcexport.com" : "/herramientas",
  coffeed: PROD ? "https://coffeed.ctcexport.com" : "/coffeed",
} as const;

export function EcosistemaTab({
  fincas,
  gi,
  userName,
  onRefreshData,
  onCreateThread,
  onGoMensajes,
}: {
  fincas: Finca[];
  gi: GeneralInfo;
  userName: string;
  onRefreshData: () => void;
  onCreateThread: (
    title: string,
    link: { type: "finca" | "lote" | "contrato"; id: string } | null,
    message: string
  ) => Promise<boolean>;
  onGoMensajes: () => void;
}) {
  const { showToast } = useToast();
  // "Más allá de la exportación" ahora vive aquí: solicitudes in-panel de CTC
  // Tech / Varietales. Alimentan el mismo canal de leads que el Escríbenos de
  // ctcexport.com, con la cuenta (y la finca) ya vinculadas.
  const [formAbierto, setFormAbierto] = useState<"tech" | "varietales" | null>(null);
  const [serviceSent, setServiceSent] = useState<{ tech?: boolean; varietales?: boolean }>({});
  const [serviceBusy, setServiceBusy] = useState(false);
  const [fbTexto, setFbTexto] = useState("");
  const [fbEnviado, setFbEnviado] = useState(false);

  async function requestService(pillar: "tech" | "varietales", form: HTMLFormElement) {
    setServiceBusy(true);
    try {
      const fd = new FormData(form);
      const fincaName = String(fd.get("finca") ?? "");
      const finca = fincas.find((f) => f.name === fincaName);
      const ubicacion = finca ? `${finca.mun}, ${finca.depto}` : "";
      const fields: Record<string, unknown> =
        pillar === "tech"
          ? { finca: fincaName, ubicacion, interes: fd.getAll("interes").map(String) }
          : { finca: fincaName, ubicacion, varietal: String(fd.get("varietal") ?? ""), cantidad: String(fd.get("cantidad") ?? "") };
      const result = await submitLeadAuthed({
        pillar,
        nombre: gi.agri !== "—" ? gi.agri : userName,
        message: String(fd.get("msg") ?? "").trim(),
        fields,
      });
      if (result.ok) {
        setServiceSent((s) => ({ ...s, [pillar]: true }));
        showToast("Solicitud enviada a CTC ✓ · la conversación sigue en Mensajes y Notificaciones");
        // The mirror note just landed in producer_comm_log server-side --
        // refresh so Mensajes shows the new thread without a reload.
        onRefreshData();
      } else {
        showToast(result.message);
      }
    } catch {
      showToast("No se pudo enviar la solicitud. Intente de nuevo.");
    } finally {
      setServiceBusy(false);
    }
  }

  async function enviarFeedbackTerratalento() {
    const texto = fbTexto.trim();
    if (!texto) return;
    const ok = await onCreateThread("Terratalento · interés", null, texto);
    if (ok) {
      setFbEnviado(true);
      setFbTexto("");
      showToast("¡Gracias! Su interés quedó registrado — le contamos cuando Terratalento abra.");
    } else {
      showToast("No se pudo enviar. Intente de nuevo.");
    }
  }

  return (
    <div style={{ marginTop: 4 }}>
      <div className={flip.grid}>
        <FlipCard logo="/images/shared/directorio-logo.png" nombre="Directorio del Café">
          <span>Su ficha profesional en la capa de personas del ecosistema: los profesionales del café de Santander, con perfil propio y la misma cuenta.</span>
          <div className={flip.backActions}>
            <a className="btn btn-sm btn-solid" href={DIRECTORIO_HREF}>Abrir el Directorio ↗</a>
          </div>
        </FlipCard>

        <FlipCard logo="/images/shared/herramientas-logo.png" nombre="Herramientas del Café">
          <span>Calculadoras y referencias de trabajo para su finca: mermas, costos, color de tueste, catación. Todo el cálculo ocurre en su navegador — y el nivel <b>Plus</b> se solicita allá mismo.</span>
          <div className={flip.backActions}>
            <a className="btn btn-sm btn-solid" href={URL_RED.herramientas}>Abrir Herramientas ↗</a>
          </div>
        </FlipCard>

        <FlipCard logo="/images/shared/coffeed-logo.png" nombre="Coffeed">
          <span>El noticiero de la red: capítulos breves sobre el mercado del café — precio, regulación, calidad, logística — producidos por el Estudio de Contenido.</span>
          <div className={flip.backActions}>
            <a className="btn btn-sm btn-solid" href={URL_RED.coffeed}>Abrir Coffeed ↗</a>
          </div>
        </FlipCard>

        <FlipCard logo="/images/shared/ctc-tech-logo.png" nombre="CTC Tech">
          <span>Implementación de nuevas tecnologías agrónomas: diagnóstico en finca para definir qué aplica a su beneficio y su presupuesto.</span>
          <div className={flip.backActions}>
            <button className="btn btn-sm btn-solid" onClick={() => setFormAbierto("tech")}>Solicitar diagnóstico ↓</button>
          </div>
        </FlipCard>

        <FlipCard logo="/images/shared/varietales-logo.png" nombre="Varietales Registrados">
          <span>Plántulas verificadas desde la chapola: genética con papeles y asesoría de siembra. Mínimo 100 chapolas.</span>
          <div className={flip.backActions}>
            <button className="btn btn-sm btn-solid" onClick={() => setFormAbierto("varietales")}>Solicitar catálogo ↓</button>
          </div>
        </FlipCard>

        <FlipCard logo="/images/shared/terratalento-logo.png" nombre="Terratalento" gris>
          <span><b>En desarrollo para el Ecosistema.</b> Conectará fincas y recolectores para las jornadas de cosecha. ¿Le interesa? Cuéntenos y le avisamos al abrir.</span>
          {fbEnviado ? (
            <span>✓ Interés registrado. La conversación sigue en Mensajes y Notificaciones.</span>
          ) : (
            <>
              <textarea
                className={flip.fbText}
                rows={2}
                placeholder="Ej. Necesito recolectores para la cosecha de octubre…"
                value={fbTexto}
                onChange={(e) => setFbTexto(e.target.value)}
              />
              <div className={flip.backActions}>
                <button className="btn btn-sm" disabled={!fbTexto.trim()} onClick={enviarFeedbackTerratalento}>Enviar interés</button>
              </div>
            </>
          )}
        </FlipCard>
      </div>

      <div className={styles.alist} style={{ marginTop: 14 }}>
        Lo que pida por CTC Tech o Varietales aparece en{" "}
        <button
          type="button"
          onClick={onGoMensajes}
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--green)", fontWeight: 700, font: "inherit" }}
        >
          Mensajes y Notificaciones →
        </button>
      </div>

      {/* La solicitud especializada, debajo de la rejilla (cerrada por defecto:
          se abre desde el dorso de su tarjeta). */}
      {formAbierto === "tech" && (
        <div className={`${styles.acard} ${styles.full}`} style={{ marginTop: 16 }}>
          <span className={styles.k}>CTC Tech · Implementación de nuevas tecnologías agrónomas</span>
          <div className={styles.sub}>
            Diagnóstico en finca para definir qué tecnología aplica a su beneficio y su presupuesto: ozono + UV,
            fermentación controlada, selección óptica, cromatografía de suelos e instrumentación de medición.
          </div>
          {serviceSent.tech ? (
            <div className={styles.alist} style={{ marginTop: 10 }}>
              ✓ Solicitud enviada. CTC le responderá por correo y en &quot;Mensajes y Notificaciones&quot;.
            </div>
          ) : (
            <form
              className={styles.svcForm}
              onSubmit={(e) => {
                e.preventDefault();
                requestService("tech", e.currentTarget);
              }}
            >
              <div>
                <label htmlFor="svc-t-finca">Finca</label>
                <select id="svc-t-finca" name="finca" defaultValue={fincas[0]?.name ?? ""}>
                  {fincas.map((f) => (
                    <option key={f.id} value={f.name}>{f.name} · {f.mun}</option>
                  ))}
                  <option value="">Otra / sin registrar</option>
                </select>
              </div>
              <div>
                <label>Tecnologías de interés</label>
                <div className={styles.svcChips}>
                  {["Ozono + UV", "Técnicas de fermentación", "Selección óptica", "Cromatografía de suelos", "Instrumentación de medición"].map((opt) => (
                    <label className={styles.svcChip} key={opt}>
                      <input type="checkbox" name="interes" value={opt} /> {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="svc-t-msg">Cuéntenos de su proceso actual</label>
                <textarea id="svc-t-msg" name="msg" rows={2} placeholder="Volumen, beneficio actual, retos…" />
              </div>
              <button className="btn btn-sm btn-solid" type="submit" disabled={serviceBusy} style={{ justifySelf: "start" }}>
                {serviceBusy ? "Enviando…" : "Solicitar diagnóstico"}
              </button>
            </form>
          )}
        </div>
      )}

      {formAbierto === "varietales" && (
        <div className={`${styles.acard} ${styles.full}`} style={{ marginTop: 16 }}>
          <span className={styles.k}>Varietales Registrados · Plántulas verificadas desde la chapola</span>
          <div className={styles.sub}>
            Genética con papeles y asesoría de siembra. Mínimo 100 chapolas · $150–$300 COP c/u según varietal.
          </div>
          {serviceSent.varietales ? (
            <div className={styles.alist} style={{ marginTop: 10 }}>
              ✓ Solicitud enviada. CTC le responderá por correo y en &quot;Mensajes y Notificaciones&quot;.
            </div>
          ) : (
            <form
              className={styles.svcForm}
              onSubmit={(e) => {
                e.preventDefault();
                requestService("varietales", e.currentTarget);
              }}
            >
              <div>
                <label htmlFor="svc-v-finca">Finca donde sembrará</label>
                <select id="svc-v-finca" name="finca" defaultValue={fincas[0]?.name ?? ""}>
                  {fincas.map((f) => (
                    <option key={f.id} value={f.name}>{f.name} · {f.mun}</option>
                  ))}
                  <option value="">Otra / sin registrar</option>
                </select>
              </div>
              <div>
                <label htmlFor="svc-v-var">Varietal de interés</label>
                <input id="svc-v-var" name="varietal" placeholder="Ej. Gesha, Sidra, Pink Bourbon…" />
              </div>
              <div>
                <label htmlFor="svc-v-cant">Cantidad de chapolas</label>
                <input id="svc-v-cant" name="cantidad" type="number" min={100} placeholder="Mínimo 100" />
              </div>
              <div>
                <label htmlFor="svc-v-msg">Mensaje</label>
                <textarea id="svc-v-msg" name="msg" rows={2} placeholder="Perfil de taza objetivo, fecha de siembra…" />
              </div>
              <button className="btn btn-sm btn-solid" type="submit" disabled={serviceBusy} style={{ justifySelf: "start" }}>
                {serviceBusy ? "Enviando…" : "Solicitar catálogo de varietales"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
