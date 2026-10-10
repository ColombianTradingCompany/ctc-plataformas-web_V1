import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { ActionForm } from "@/components/panel/ActionForm";
import shared from "@/components/panel/shared.module.css";
import s from "./formularios.module.css";
import { ESTADOS_DE_LEAD, ESTADO_LABEL, OPCIONES, TIPOS_DE_PARTICIPANTE, type LeadDeEvento } from "@/lib/leadForms/campos";
import { configDe, FORMULARIOS, formulario, formularioActivoDe } from "@/lib/leadForms/registro";
import { cargarFormularios, cargarLeads, contarLeads, qrSvg, urlPublicaDelFormulario } from "@/lib/leadForms/servidor";
import { construirCorreoInmediato, construirSeguimiento } from "@/lib/leadForms/correos";
import { enlacesDeCorreo } from "@/lib/leadForms/envios";
import { leadsDeEjemplo } from "@/lib/leadForms/ejemplos";
import { activarFormulario, anotarLeadDeEvento, enviarInmediatosPendientes, enviarSeguimientoAhora, guardarConfigDeFormulario, reenviarCorreoInmediato, setEstadoLeadDeEvento } from "../formulariosActions";

// ── LCP · General · Interfaz de Leads (V6.2, owner 2026-10-10) ───────────────────────────────────────────────────────────────
// Los formularios de captación de la casa (ferias, campañas): cuál está ENCENDIDO (uno a la vez; su insignia sale en la cabecera
// de CTC Home y su página recibe envíos), su configuración sin desplegar (agenda, aviso de privacidad, firma, Reply-To, los dos
// interruptores de correo), el QR para imprimir, la vista previa de los correos con cuatro perfiles de ejemplo, y los leads con sus
// acciones. El primero es SCAJ 2026 (`src/lib/leadForms/scaj2026/textos.json`).

export const dynamic = "force-dynamic";

const QR_SOURCE = "qr-stand";

type Busqueda = { form?: string; tipo?: string; estado?: string; q?: string; ver?: string };

const fecha = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const fechaLarga = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" }) : "—";

export default async function InterfazDeLeadsPage({ searchParams }: { searchParams: Promise<Busqueda> }) {
  const sp = await searchParams;
  const service = createServiceRoleClient();
  const [filas, cuentas] = await Promise.all([cargarFormularios(service), contarLeads(service)]);
  const elegidoKey = formulario(sp.form)?.key ?? filas[0]?.key ?? Object.keys(FORMULARIOS)[0];
  const def = formulario(elegidoKey)!;
  const fila = filas.find((f) => f.key === elegidoKey) ?? null;
  const config = configDe(fila?.config);
  const activo = fila ? formularioActivoDe([fila], new Date().toISOString()) : null;
  const urlQr = urlPublicaDelFormulario(def.ruta, QR_SOURCE);
  const urlWeb = urlPublicaDelFormulario(def.ruta, "web");
  const [qr, leads] = await Promise.all([qrSvg(urlQr), cargarLeads(service, def.key, { tipo: sp.tipo, estado: sp.estado, texto: sp.q })]);
  const rotulos = def.textos.es.options;
  const ahoraMs = new Date().getTime();
  const ejemplos = sp.ver === "correos" ? leadsDeEjemplo(def.key) : [];
  const enlaces = (leadId: string) => enlacesDeCorreo(def.ruta, leadId);
  const c = cuentas[def.key] ?? { total: 0, nuevos: 0, sinCorreo: 0, seguimientosVencidos: 0 };
  const query = (extra: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ form: def.key, tipo: sp.tipo, estado: sp.estado, q: sp.q, ...extra })) if (v) p.set(k, v);
    return `/lcp/formularios?${p.toString()}`;
  };

  return (
    <div>
      <h1 className={shared.title}>Interfaz de Leads</h1>
      <p className={shared.subtitle}>
        Los formularios de captación de la casa: ferias y campañas. Uno encendido a la vez: su insignia sale en la cabecera de CTC Home y su página
        recibe envíos. Lo que llega queda aquí, con sus correos y su seguimiento.
      </p>

      {/* Los formularios */}
      <div className={s.formularios}>
        {filas.map((f) => {
          const d = formulario(f.key);
          const n = cuentas[f.key] ?? { total: 0, nuevos: 0, sinCorreo: 0, seguimientosVencidos: 0 };
          const esActivo = formularioActivoDe([f], new Date().toISOString()) !== null;
          return (
            <section key={f.key} className={`${s.formulario} ${f.key === def.key ? s.formularioElegido : ""}`}>
              <div className={s.formularioCabeza}>
                <div>
                  <Link href={query({ form: f.key })} className={s.formularioNombre}>
                    {f.nombre}
                  </Link>
                  <p className={s.formularioRuta}>
                    <code>{f.ruta}</code> · insignia «{f.etiqueta_cabecera}»
                    {f.vigente_desde || f.vigente_hasta ? ` · vigencia ${fecha(f.vigente_desde)} → ${fecha(f.vigente_hasta)}` : ""}
                  </p>
                </div>
                <span className={f.activo ? (esActivo ? shared.badgeGood : shared.badgeWarn) : shared.badge}>
                  {f.activo ? (esActivo ? "ENCENDIDO" : "ENCENDIDO · fuera de vigencia") : "APAGADO"}
                </span>
              </div>
              <p className={s.formularioDesc}>{f.descripcion}</p>
              {!d && <p className={shared.warn}>Este formulario está en la base pero no en el código: no se puede encender.</p>}
              <div className={s.cifras}>
                <span>
                  <b>{n.total}</b> leads
                </span>
                <span>
                  <b>{n.nuevos}</b> nuevos
                </span>
                <span>
                  <b>{n.sinCorreo}</b> sin correo inmediato
                </span>
                <span>
                  <b>{n.seguimientosVencidos}</b> seguimientos vencidos
                </span>
              </div>
              <div className={s.acciones}>
                {d && (
                  <ActionForm action={activarFormulario} submitLabel={f.activo ? "Apagar" : "Encender"} pendingLabel="Un momento…" buttonClassName={f.activo ? s.botonSuave : s.botonFuerte} successMessage={f.activo ? "Apagado: la insignia sale de la portada y la página deja de recibir envíos." : "Encendido: la insignia ya sale en la portada y la página recibe envíos."}>
                    <input type="hidden" name="key" value={f.key} />
                    <input type="hidden" name="activo" value={f.activo ? "false" : "true"} />
                  </ActionForm>
                )}
                <a className={s.enlace} href={urlPublicaDelFormulario(f.ruta, "web")} target="_blank" rel="noopener">
                  Abrir el formulario ↗
                </a>
                <a className={s.enlace} href={`/lcp/formularios/export?form=${f.key}`}>
                  Exportar CSV ↓
                </a>
              </div>
            </section>
          );
        })}
      </div>

      {/* El formulario elegido: QR, configuración, vista previa */}
      <div className={s.dos}>
        <section className={s.panel}>
          <h2 className={s.h2}>QR para imprimir · {def.nombre}</h2>
          <p className={s.p}>
            Lleva a <code>{urlQr}</code>. El parámetro <code>source</code> distingue cada QR impreso: cambia <code>{QR_SOURCE}</code> por otro valor en la URL si
            imprimes más de uno. La insignia de la portada manda <code>source=web</code> (<a href={urlWeb} target="_blank" rel="noopener" className={s.enlace}>{urlWeb}</a>).
          </p>
          <div className={s.qr} dangerouslySetInnerHTML={{ __html: qr }} />
          <a className={s.enlace} href={`data:image/svg+xml;utf8,${encodeURIComponent(qr)}`} download={`qr-${def.key}.svg`}>
            Descargar el QR (SVG) ↓
          </a>
          {!activo && <p className={shared.warn}>El formulario está APAGADO: el QR abre una página que lo dice y no recibe envíos. Enciéndelo antes de la feria.</p>}
        </section>

        <section className={s.panel}>
          <h2 className={s.h2}>Configuración · sin desplegar</h2>
          <ActionForm action={guardarConfigDeFormulario} submitLabel="Guardar" pendingLabel="Guardando…" buttonClassName={s.botonFuerte} successMessage="Configuración guardada." className={s.config}>
            <input type="hidden" name="key" value={def.key} />
            <label className={s.campo}>
              <span>Enlace de agenda para la videollamada</span>
              <input name="agenda_url" defaultValue={config.agenda_url} placeholder="https://… (vacío: se le pide al lead que proponga dos horarios)" />
            </label>
            <label className={s.campo}>
              <span>Aviso de privacidad (URL)</span>
              <input name="privacy_url" defaultValue={config.privacy_url} placeholder={`${def.ruta}/privacidad`} />
            </label>
            <label className={s.campo}>
              <span>Correo que recibe las respuestas (Reply-To)</span>
              <input name="reply_to" defaultValue={config.reply_to} />
            </label>
            <label className={s.campo}>
              <span>Firma (nombre y cargo; vacío: firma la casa)</span>
              <input name="firma" defaultValue={config.firma} placeholder="Nombre Apellido · Cargo" />
            </label>
            <label className={s.interruptor}>
              <input type="checkbox" name="correo_inmediato" defaultChecked={config.correo_inmediato} />
              <span>
                <b>Correo inmediato</b> al guardar cada lead. Nace apagado: revisa los textos (vista previa) y enciéndelo. Los leads que lleguen apagado se mandan luego con «Enviar
                los pendientes».
              </span>
            </label>
            <label className={s.interruptor}>
              <input type="checkbox" name="seguimiento" defaultChecked={config.seguimiento} />
              <span>
                <b>Seguimiento</b> a los{" "}
                <input type="number" name="seguimiento_dias" min={1} max={60} defaultValue={config.seguimiento_dias} className={s.numero} /> días (cron horario; no si se dio de baja ni
                si ya respondió al primero).
              </span>
            </label>
            <label className={s.interruptor}>
              <input type="checkbox" name="ja_correo_en" defaultChecked={config.ja_correo_en} />
              <span>Quien llenó en japonés recibe el correo en inglés (hasta la revisión nativa; hoy no hay versión japonesa de los correos).</span>
            </label>
          </ActionForm>
          <div className={s.acciones} style={{ marginTop: 12 }}>
            <Link href={query({ ver: sp.ver === "correos" ? undefined : "correos" })} className={s.enlace}>
              {sp.ver === "correos" ? "Ocultar la vista previa de los correos" : "Ver los textos de los correos con cuatro perfiles de ejemplo →"}
            </Link>
            <ActionForm action={enviarInmediatosPendientes} submitLabel={`Enviar los pendientes (${c.sinCorreo})`} pendingLabel="Enviando…" buttonClassName={s.botonSuave} disabled={c.sinCorreo === 0} successMessage="Hecho.">
              <input type="hidden" name="key" value={def.key} />
            </ActionForm>
          </div>
        </section>
      </div>

      {ejemplos.length > 0 && (
        <section className={s.panel}>
          <h2 className={s.h2}>Vista previa de los correos · {def.nombre}</h2>
          <p className={s.p}>
            Generados con los textos reales y la configuración de arriba. Sin precios, puntajes ni plazos: solo lo publicado. El japonés cae a inglés. El enlace de baja es
            de ejemplo.
          </p>
          <div className={s.ejemplos}>
            {ejemplos.map(({ titulo, lead }) => {
              const inmediato = construirCorreoInmediato(lead, config, enlaces(lead.id));
              const seguimiento = construirSeguimiento(lead, config, enlaces(lead.id));
              return (
                <article key={lead.id} className={s.ejemplo}>
                  <h3 className={s.h3}>{titulo}</h3>
                  <p className={s.asunto}>
                    <b>Inmediato · {inmediato.lang.toUpperCase()}</b> · {inmediato.subject}
                  </p>
                  <pre className={s.correo}>{inmediato.text}</pre>
                  <p className={s.asunto}>
                    <b>Seguimiento ({config.seguimiento_dias} d) · {seguimiento.lang.toUpperCase()}</b> · {seguimiento.subject}
                  </p>
                  <pre className={s.correo}>{seguimiento.text}</pre>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Los leads */}
      <section className={s.panel}>
        <div className={s.formularioCabeza}>
          <h2 className={s.h2}>
            Leads · {def.nombre} <span className={s.cuenta}>({leads.length})</span>
          </h2>
          <a className={s.enlace} href={`/lcp/formularios/export?form=${def.key}${sp.tipo ? `&tipo=${sp.tipo}` : ""}${sp.estado ? `&estado=${sp.estado}` : ""}${sp.q ? `&q=${encodeURIComponent(sp.q)}` : ""}`}>
            Exportar lo filtrado (CSV) ↓
          </a>
        </div>
        <form method="get" className={s.filtros}>
          <input type="hidden" name="form" value={def.key} />
          <select name="tipo" defaultValue={sp.tipo ?? ""}>
            <option value="">Todos los tipos</option>
            {TIPOS_DE_PARTICIPANTE.map((t) => (
              <option key={t} value={t}>
                {rotulos.participant_type[t]}
              </option>
            ))}
          </select>
          <select name="estado" defaultValue={sp.estado ?? ""}>
            <option value="">Todas las etapas</option>
            {ESTADOS_DE_LEAD.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
          <input name="q" defaultValue={sp.q ?? ""} placeholder="Nombre, empresa, correo, ciudad…" />
          <button type="submit" className={s.botonSuave}>
            Filtrar
          </button>
        </form>

        {leads.length === 0 ? (
          <p className={shared.empty}>Todavía no hay leads{sp.tipo || sp.estado || sp.q ? " con ese filtro" : ""}.</p>
        ) : (
          <div className={s.lista}>
            {leads.map((l) => (
              <LeadFila key={l.id} l={l} rotulos={rotulos} ahoraMs={ahoraMs} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LeadFila({ l, rotulos, ahoraMs }: { l: LeadDeEvento; rotulos: Record<string, Record<string, string>>; ahoraMs: number }) {
  const r = (grupo: string, clave: string | null | undefined) => (clave ? rotulos[grupo]?.[clave] ?? clave : "—");
  const lista = (grupo: string, claves: string[] | undefined) => (claves && claves.length ? claves.map((k) => r(grupo, k)).join(" · ") : "—");
  const x = (l.extra ?? {}) as Record<string, unknown>;
  const valores = Object.entries(l.values_beans ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]));
  const correo = l.unsubscribed_at ? "baja" : l.email_immediate_sent_at ? "enviado" : l.email_immediate_error ? "error" : "pendiente";
  const seguimiento = l.unsubscribed_at ? "baja" : l.followup_sent_at ? "enviado" : l.replied_at ? "respondió" : l.followup_error ? "error" : Date.parse(l.followup_due_at) <= ahoraMs ? "vencido" : "programado";
  return (
    <details className={s.lead}>
      <summary className={s.leadResumen}>
        <span className={s.leadTipo}>{r("participant_type", l.participant_type)}</span>
        <span className={s.leadNombre}>
          <b>{l.full_name}</b> · {l.company}
          {l.country_city ? ` · ${l.country_city}` : ""}
        </span>
        <span className={s.leadMeta}>
          {fecha(l.created_at)} · {l.lang.toUpperCase()}
          {l.source ? ` · ${l.source}` : ""}
        </span>
        <span className={s.leadEstados}>
          <span className={estadoClase(l.status)}>{ESTADO_LABEL[l.status as keyof typeof ESTADO_LABEL] ?? l.status}</span>
          <span className={correoClase(correo)} title="Correo inmediato">
            ✉ {correo}
          </span>
          <span className={correoClase(seguimiento)} title="Seguimiento">
            ⟳ {seguimiento}
          </span>
        </span>
      </summary>
      <div className={s.leadCuerpo}>
        <dl className={s.datos}>
          <dt>Correo</dt>
          <dd>
            <a href={`mailto:${l.email}`}>{l.email}</a>
          </dd>
          {l.participant_other && (
            <>
              <dt>¿Cuál?</dt>
              <dd>{l.participant_other}</dd>
            </>
          )}
          {l.card_photo_path && (
            <>
              <dt>Tarjeta</dt>
              <dd>
                <a href={`/lcp/formularios/tarjeta?lead=${l.id}`} target="_blank" rel="noopener">
                  Ver la foto ↗
                </a>
              </dd>
            </>
          )}
          {l.green_volume && (
            <>
              <dt>Verde al año</dt>
              <dd>{r("green_volume", l.green_volume)}</dd>
            </>
          )}
          {l.buys_colombian && (
            <>
              <dt>Compra colombiano</dt>
              <dd>{r("buys_colombian", l.buys_colombian)}</dd>
            </>
          )}
          {l.profiles.length > 0 && (
            <>
              <dt>Perfiles</dt>
              <dd>{lista("profiles", l.profiles)}</dd>
            </>
          )}
          {Array.isArray(x.grades_interest) && (
            <>
              <dt>Grados CTCx</dt>
              <dd>{lista("grades_interest", x.grades_interest as string[])}</dd>
            </>
          )}
          {typeof x.purchase_format === "string" && (
            <>
              <dt>Formato</dt>
              <dd>{r("purchase_format", x.purchase_format)}</dd>
            </>
          )}
          {Array.isArray(x.certifications) && (
            <>
              <dt>Certificaciones</dt>
              <dd>{lista("certifications", x.certifications as string[])}</dd>
            </>
          )}
          {typeof x.roast_in_destination === "string" && (
            <>
              <dt>Verde o tostado</dt>
              <dd>{r("roast_in_destination", x.roast_in_destination)}</dd>
            </>
          )}
          {x.regional_node_interest === true && (
            <>
              <dt>Nodo logístico</dt>
              <dd>Sí, le interesa</dd>
            </>
          )}
          {x.producer_interest === true && (
            <>
              <dt>Evaluar con CTCx</dt>
              <dd>Sí, le interesa</dd>
            </>
          )}
          {l.about && (
            <>
              <dt>Qué hace</dt>
              <dd>{l.about}</dd>
            </>
          )}
          {valores.length > 0 && (
            <>
              <dt>Qué valora</dt>
              <dd>
                {valores.map(([k, v]) => (
                  <span key={k} className={s.valor}>
                    {r("values", k)} <b>{"●".repeat(Number(v))}{"○".repeat(5 - Number(v))}</b>
                  </span>
                ))}
              </dd>
            </>
          )}
          {l.looking_for && (
            <>
              <dt>Busca ahora</dt>
              <dd>{l.looking_for}</dd>
            </>
          )}
          {l.timing && (
            <>
              <dt>Cuándo compra</dt>
              <dd>{r("timing", l.timing)}</dd>
            </>
          )}
          <dt>Quiere recibir</dt>
          <dd>{lista("wants", l.wants)}</dd>
          {l.master_roaster_interest && (
            <>
              <dt>Master Roaster</dt>
              <dd>Sí, le interesa</dd>
            </>
          )}
          <dt>Consentimiento</dt>
          <dd>{fechaLarga(l.consent_at)}</dd>
          <dt>Correo inmediato</dt>
          <dd>
            {l.email_immediate_sent_at ? `enviado ${fechaLarga(l.email_immediate_sent_at)}` : "no enviado"}
            {l.email_immediate_error ? ` · error: ${l.email_immediate_error}` : ""}
          </dd>
          <dt>Seguimiento</dt>
          <dd>
            vence {fechaLarga(l.followup_due_at)}
            {l.followup_sent_at ? ` · enviado ${fechaLarga(l.followup_sent_at)}` : ""}
            {l.followup_error ? ` · error: ${l.followup_error}` : ""}
            {l.replied_at ? ` · respondió ${fechaLarga(l.replied_at)}` : ""}
            {l.unsubscribed_at ? ` · BAJA ${fechaLarga(l.unsubscribed_at)}` : ""}
          </dd>
        </dl>

        <div className={s.leadAcciones}>
          <ActionForm action={setEstadoLeadDeEvento} submitLabel="Guardar etapa" pendingLabel="…" buttonClassName={s.botonSuave} className={s.enLinea} successMessage="Etapa guardada.">
            <input type="hidden" name="leadId" value={l.id} />
            <select name="estado" defaultValue={l.status}>
              {ESTADOS_DE_LEAD.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_LABEL[e]}
                </option>
              ))}
            </select>
          </ActionForm>
          <ActionForm action={anotarLeadDeEvento} submitLabel="Guardar nota" pendingLabel="…" buttonClassName={s.botonSuave} className={s.nota} successMessage="Guardado.">
            <input type="hidden" name="leadId" value={l.id} />
            <textarea name="notes" defaultValue={l.notes ?? ""} rows={2} placeholder="Nota interna (qué hablamos, qué sigue)" />
            <label>
              <input type="checkbox" name="respondio" defaultChecked={!!l.replied_at} /> Ya respondió (no se le manda el seguimiento)
            </label>
            <label>
              <input type="checkbox" name="baja" defaultChecked={!!l.unsubscribed_at} /> Dar de baja (no se le escribe más)
            </label>
          </ActionForm>
          <ActionForm action={reenviarCorreoInmediato} submitLabel={l.email_immediate_sent_at ? "Reenviar el correo inmediato" : "Enviar el correo inmediato"} pendingLabel="Enviando…" buttonClassName={s.botonSuave} disabled={!!l.unsubscribed_at} successMessage="Correo enviado.">
            <input type="hidden" name="leadId" value={l.id} />
          </ActionForm>
          <ActionForm action={enviarSeguimientoAhora} submitLabel={l.followup_sent_at ? "Reenviar el seguimiento" : "Enviar el seguimiento ahora"} pendingLabel="Enviando…" buttonClassName={s.botonSuave} disabled={!!l.unsubscribed_at} className={s.enLinea} successMessage="Seguimiento enviado.">
            <input type="hidden" name="leadId" value={l.id} />
            <label className={s.mini}>
              <input type="checkbox" name="forzar" /> aunque ya haya salido o haya respondido
            </label>
          </ActionForm>
        </div>
      </div>
    </details>
  );
}

const estadoClase = (estado: string) => (estado === "nuevo" ? shared.badgeWarn : estado === "convertido" ? shared.badgeGood : shared.badge);
const correoClase = (estado: string) => (estado === "enviado" || estado === "respondió" ? shared.badgeGood : estado === "error" || estado === "vencido" ? shared.badgeBad : shared.badge);

// Para que el guardián (y quien lea) vea las opciones que el tablero conoce sin abrir el módulo puro.
void OPCIONES;
