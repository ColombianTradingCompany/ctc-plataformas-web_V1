"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_LEADS, EMAIL_RE, MAX_MB_TARJETA, OPCIONES, visible, type IdiomaDeFormulario, type EnvioDeFormulario, type PreguntaCerrada } from "@/lib/leadForms/campos";
import type { TextosDeFormulario } from "@/lib/leadForms/registro";
import { enviarLeadDeEvento, urlDeSubidaDeTarjeta } from "@/lib/leadForms/publicActions";
import styles from "./LeadForm.module.css";

// ── El formulario de leads de una feria (V6.2) ───────────────────────────────────────────────────────────────────────────────
// Una sola página, pensada primero para el celular (de pie, con una mano, con conexión irregular): casi todo se responde con toques,
// áreas táctiles de 44 px, etiquetas siempre visibles, teclado de correo en el correo. El idioma inicial lo pone el servidor (el del
// navegador; si no es uno de los tres, inglés) y se cambia arriba. Las preguntas cambian con el tipo de participante (`visible`, la
// tabla de la especificación). «Qué valoras» es una lista de casillas; al marcar una aparece la escala de cinco GRANOS (no estrellas).
//
// Lo escrito no se pierde: cada cambio se guarda en localStorage (`lead-form:<key>`) y se recupera al volver; si el envío falla por
// la conexión, se queda todo y se reintenta. Un doble toque en Enviar no crea dos leads: la clave de idempotencia nace con el
// borrador y la base rechaza el segundo. Al terminar, «Registrar a otra persona» deja el formulario vacío (lo usa el owner cuando
// llena por alguien desde su celular).

type Props = {
  formKey: string;
  textos: TextosDeFormulario;
  idiomas: readonly IdiomaDeFormulario[];
  idiomaInicial: IdiomaDeFormulario;
  /** El sello de tiempo firmado por el servidor (anti-bot invisible). */
  sello: string;
  source: string | null;
  privacyUrl: string;
  abierto: boolean;
};

type Borrador = {
  idempotencyKey: string;
  lang: IdiomaDeFormulario;
  participant_type: string;
  participant_other: string;
  full_name: string;
  company: string;
  email: string;
  country_city: string;
  green_volume: string;
  buys_colombian: string;
  profiles: string[];
  about: string;
  values: Record<string, number>;
  looking_for: string;
  timing: string;
  wants: string[];
  master_roaster_interest: boolean;
  grades_interest: string[];
  purchase_format: string;
  certifications: string[];
  roast_in_destination: string;
  regional_node_interest: boolean;
  producer_interest: boolean;
  consent: boolean;
};

const uuid = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

const vacio = (lang: IdiomaDeFormulario): Borrador => ({
  idempotencyKey: uuid(),
  lang,
  participant_type: "",
  participant_other: "",
  full_name: "",
  company: "",
  email: "",
  country_city: "",
  green_volume: "",
  buys_colombian: "",
  profiles: [],
  about: "",
  values: {},
  looking_for: "",
  timing: "",
  wants: [],
  master_roaster_interest: false,
  grades_interest: [],
  purchase_format: "",
  certifications: [],
  roast_in_destination: "",
  regional_node_interest: false,
  producer_interest: false,
  consent: false,
});

const claveDeBorrador = (formKey: string) => `lead-form:${formKey}`;
const tieneAlgo = (b: Borrador) => !!(b.participant_type || b.full_name || b.company || b.email || b.looking_for || b.about);

/** El grano de café: una elipse con su hendidura (no una estrella). */
function Grano({ lleno }: { lleno: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className={lleno ? styles.granoLleno : styles.granoVacio}>
      <ellipse cx="12" cy="12" rx="7.2" ry="10" transform="rotate(-28 12 12)" />
      <path d="M8.6 4.9c2.8 3.1 2.9 11.2-1.1 15.4" fill="none" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function LeadForm({ formKey, textos, idiomas, idiomaInicial, sello, source, privacyUrl, abierto }: Props) {
  const [b, setB] = useState<Borrador>(() => vacio(idiomaInicial));
  const [listo, setListo] = useState(false);
  const [restaurado, setRestaurado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [hecho, setHecho] = useState(false);
  const [error, setError] = useState<{ tipo: "required" | "email" | "network" | "server" | "closed"; campo?: string } | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoError, setFotoError] = useState<"big" | "type" | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);
  const hpRef = useRef<HTMLInputElement>(null);
  const t = textos[b.lang].ui;
  const o = textos[b.lang].options;

  // El borrador: se recupera una vez y se guarda en cada cambio (sin la foto, que no cabe en localStorage).
  useEffect(() => {
    // El borrador se lee de localStorage (un sistema externo) y el estado se pone en el callback, nunca síncrono en el efecto.
    let activo = true;
    Promise.resolve().then(() => {
      if (!activo) return;
      try {
        const raw = localStorage.getItem(claveDeBorrador(formKey));
        if (raw) {
          const guardado = JSON.parse(raw) as Partial<Borrador>;
          const base = vacio(idiomaInicial);
          const mezcla: Borrador = { ...base, ...guardado, lang: (idiomas as readonly string[]).includes(String(guardado.lang)) ? (guardado.lang as IdiomaDeFormulario) : idiomaInicial };
          if (tieneAlgo(mezcla)) {
            setB(mezcla);
            setRestaurado(true);
          }
        }
      } catch {
        /* sin localStorage (modo privado): el formulario funciona igual */
      }
      setListo(true);
    });
    return () => {
      activo = false;
    };
  }, [formKey, idiomaInicial, idiomas]);
  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(claveDeBorrador(formKey), JSON.stringify(b));
    } catch {
      /* idem */
    }
  }, [b, listo, formKey]);
  useEffect(() => {
    document.documentElement.lang = b.lang;
  }, [b.lang]);

  const set = useCallback(<K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((prev) => ({ ...prev, [k]: v })), []);
  const alternar = (k: "profiles" | "wants" | "grades_interest" | "certifications", valor: string) =>
    setB((prev) => ({ ...prev, [k]: prev[k].includes(valor) ? prev[k].filter((x) => x !== valor) : [...prev[k], valor] }));
  const alternarValor = (clave: string) =>
    setB((prev) => {
      const values = { ...prev.values };
      if (clave in values) delete values[clave];
      else values[clave] = 0;
      return { ...prev, values };
    });
  const ponerGranos = (clave: string, n: number) => setB((prev) => ({ ...prev, values: { ...prev.values, [clave]: n } }));

  const tipo = b.participant_type;
  const ve = (campo: string) => !!tipo && visible(campo, tipo);
  const rotulo = (grupo: string, clave: string) => o[grupo]?.[clave] ?? clave;

  function elegirFoto(file: File | null) {
    setFotoError(null);
    if (!file) {
      setFoto(null);
      return;
    }
    if (!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type)) {
      setFotoError("type");
      setFoto(null);
      return;
    }
    if (file.size > MAX_MB_TARJETA * 1024 * 1024) {
      setFotoError("big");
      setFoto(null);
      return;
    }
    setFoto(file);
  }

  /** Sube la foto con la URL firmada; si falla dos veces, el lead sale sin foto (el lead nunca se pierde por la foto). */
  async function subirFoto(): Promise<string | null> {
    if (!foto) return null;
    for (let intento = 0; intento < 2; intento += 1) {
      try {
        const url = await urlDeSubidaDeTarjeta(formKey, foto.type.toLowerCase());
        if (!url.ok) return null;
        const { error: e } = await createClient().storage.from(BUCKET_LEADS).uploadToSignedUrl(url.path, url.token, foto, { contentType: foto.type });
        if (!e) return url.path;
      } catch {
        /* reintento */
      }
    }
    return null;
  }

  function validar(): { tipo: "required" | "email"; campo: string } | null {
    if (!b.participant_type) return { tipo: "required", campo: "participant_type" };
    if (b.participant_type === "other" && !b.participant_other.trim()) return { tipo: "required", campo: "participant_other" };
    if (!b.full_name.trim()) return { tipo: "required", campo: "full_name" };
    if (!b.company.trim()) return { tipo: "required", campo: "company" };
    if (!b.email.trim()) return { tipo: "required", campo: "email" };
    if (!EMAIL_RE.test(b.email.trim())) return { tipo: "email", campo: "email" };
    if (!b.consent) return { tipo: "required", campo: "consent" };
    return null;
  }

  async function enviar() {
    if (enviando) return;
    const v = validar();
    if (v) {
      setError(v);
      document.getElementById(`campo-${v.campo}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const card_photo_path = await subirFoto();
      const payload: EnvioDeFormulario = {
        formKey,
        idempotencyKey: b.idempotencyKey,
        lang: b.lang,
        source,
        sello,
        website: hpRef.current?.value ?? "",
        participant_type: b.participant_type,
        participant_other: b.participant_other,
        full_name: b.full_name,
        company: b.company,
        email: b.email,
        country_city: b.country_city,
        card_photo_path,
        green_volume: b.green_volume,
        buys_colombian: b.buys_colombian,
        profiles: b.profiles,
        about: b.about,
        values: b.values,
        looking_for: b.looking_for,
        timing: b.timing,
        wants: b.wants,
        master_roaster_interest: b.master_roaster_interest,
        extra: {
          grades_interest: b.grades_interest,
          purchase_format: b.purchase_format,
          certifications: b.certifications,
          roast_in_destination: b.roast_in_destination,
          regional_node_interest: b.regional_node_interest,
          producer_interest: b.producer_interest,
        },
        consent: b.consent,
      };
      const r = await enviarLeadDeEvento(payload);
      if (r.ok) {
        try {
          localStorage.removeItem(claveDeBorrador(formKey));
        } catch {
          /* idem */
        }
        setHecho(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (r.error === "cerrado") {
        setError({ tipo: "closed" });
      } else if (r.error === "invalido" && r.campo === "sello") {
        // El sello venció (más de 24 h en la pantalla): recargar la página lo renueva y el borrador vuelve solo.
        window.location.reload();
      } else {
        setError({ tipo: r.error === "invalido" ? "required" : "server", campo: r.campo });
      }
    } catch {
      setError({ tipo: "network" });
    } finally {
      setEnviando(false);
    }
  }

  function otraPersona() {
    const lang = b.lang;
    setB(vacio(lang));
    setFoto(null);
    setFotoError(null);
    setHecho(false);
    setRestaurado(false);
    setError(null);
    try {
      localStorage.removeItem(claveDeBorrador(formKey));
    } catch {
      /* idem */
    }
    window.scrollTo({ top: 0 });
  }

  const cabecera = (
    <header className={styles.cabecera}>
      <div className={styles.marca}>
        <Image src="/images/shared/ctc-logo-full.png" alt="Colombian Trading Company" width={2234} height={1231} className={styles.logo} priority />
      </div>
      <div className={styles.idiomas} role="group" aria-label="Language">
        {idiomas.map((l) => (
          <button key={l} type="button" className={l === b.lang ? styles.idiomaActivo : styles.idioma} onClick={() => set("lang", l)} aria-pressed={l === b.lang}>
            {l === "ja" ? "日本語" : l.toUpperCase()}
          </button>
        ))}
      </div>
      <p className={styles.feria}>{t.fair}</p>
      <h1 className={styles.titulo}>{t.title}</h1>
      <p className={styles.intro}>{t.intro}</p>
    </header>
  );

  if (!abierto) {
    return (
      <main className={styles.pagina}>
        {cabecera}
        <section className={styles.tarjeta}>
          <h2 className={styles.hecho}>{t.closed_title}</h2>
          <p className={styles.parrafo}>{t.closed_body}</p>
        </section>
        <p className={styles.legal}>{t.legal}</p>
      </main>
    );
  }

  if (hecho) {
    return (
      <main className={styles.pagina}>
        {cabecera}
        <section className={styles.tarjeta} aria-live="polite">
          <h2 className={styles.hecho}>{t.done_title}</h2>
          <p className={styles.parrafo}>{t.done_body}</p>
          <button type="button" className={styles.enviar} onClick={otraPersona}>
            {t.done_again}
          </button>
        </section>
        <p className={styles.legal}>{t.legal}</p>
      </main>
    );
  }

  // Las fichas de opciones, con el estado de ESTE borrador (el componente vive fuera del render: regla static-components).
  const chips = (grupo: PreguntaCerrada, campo: CampoDeChips, modo: "una" | "varias") => (
    <Chips
      grupo={grupo}
      modo={modo}
      seleccion={b[campo]}
      rotulo={rotulo}
      onElegir={(clave) => (modo === "una" ? set(campo, ((b[campo] as string) === clave ? "" : clave) as never) : alternar(campo as "profiles" | "wants" | "grades_interest" | "certifications", clave))}
    />
  );

  return (
    <main className={styles.pagina}>
      {cabecera}
      {restaurado && <p className={styles.aviso}>{t.draft_restored}</p>}
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          void enviar();
        }}
        noValidate
      >
        <p className={styles.req}>{t.req}</p>

        {/* 1 · Quién eres */}
        <section className={styles.tarjeta}>
          <h2 className={styles.seccion}>{t.s1}</h2>
          <Pregunta id="participant_type" texto={t.q_type} obligatoria>
            <div className={styles.chips} role="radiogroup">
              {OPCIONES_TIPO.map((clave) => (
                <button key={clave} type="button" role="radio" aria-checked={tipo === clave} className={tipo === clave ? styles.chipActivo : styles.chip} onClick={() => set("participant_type", clave)}>
                  <span className={styles.radio} aria-hidden="true" />
                  {rotulo("participant_type", clave)}
                </button>
              ))}
            </div>
            {tipo === "other" && (
              <input id="campo-participant_other" className={styles.input} type="text" value={b.participant_other} onChange={(e) => set("participant_other", e.target.value)} placeholder={t.other_ph} maxLength={120} autoComplete="organization-title" />
            )}
          </Pregunta>
          <Pregunta id="full_name" texto={t.name} obligatoria>
            <input className={styles.input} type="text" value={b.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" maxLength={160} />
          </Pregunta>
          <Pregunta id="company" texto={t.company} obligatoria>
            <input className={styles.input} type="text" value={b.company} onChange={(e) => set("company", e.target.value)} autoComplete="organization" maxLength={160} />
          </Pregunta>
          <Pregunta id="email" texto={t.email} obligatoria>
            <input className={styles.input} type="email" inputMode="email" value={b.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" autoCapitalize="none" maxLength={254} />
          </Pregunta>
          <Pregunta id="country_city" texto={t.country} nota={t.optional}>
            <input className={styles.input} type="text" value={b.country_city} onChange={(e) => set("country_city", e.target.value)} autoComplete="country-name" maxLength={160} />
          </Pregunta>
          <Pregunta id="card" texto={t.card} nota={t.optional}>
            <input ref={fotoRef} type="file" accept="image/*" className={styles.oculto} onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)} />
            {foto ? (
              <div className={styles.fotoLista}>
                <span>📇 {t.card_ready} · {foto.name.length > 28 ? foto.name.slice(0, 26) + "…" : foto.name}</span>
                <span className={styles.fotoBotones}>
                  <button type="button" className={styles.enlaceBoton} onClick={() => fotoRef.current?.click()}>
                    {t.card_change}
                  </button>
                  <button type="button" className={styles.enlaceBoton} onClick={() => elegirFoto(null)}>
                    {t.card_remove}
                  </button>
                </span>
              </div>
            ) : (
              <button type="button" className={styles.fotoBoton} onClick={() => fotoRef.current?.click()}>
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.2" />
                </svg>
                {t.card_btn}
              </button>
            )}
            {fotoError && <p className={styles.errorCampo}>{fotoError === "big" ? t.card_big : t.card_type}</p>}
            <p className={styles.pista}>{t.card_hint}</p>
          </Pregunta>
        </section>

        {/* 2 · Tu operación */}
        {tipo && (
          <section className={styles.tarjeta}>
            <h2 className={styles.seccion}>{t.s2}</h2>
            {ve("green_volume") && (
              <Pregunta id="green_volume" texto={t.q_volume}>
                {chips("green_volume", "green_volume", "una")}
              </Pregunta>
            )}
            {ve("buys_colombian") && (
              <Pregunta id="buys_colombian" texto={t.q_colombia}>
                {chips("buys_colombian", "buys_colombian", "una")}
              </Pregunta>
            )}
            {ve("profiles") && (
              <Pregunta id="profiles" texto={t.q_profiles} nota={t.multi}>
                {chips("profiles", "profiles", "varias")}
              </Pregunta>
            )}
            {ve("grades_interest") && (
              <Pregunta id="grades_interest" texto={t.q_grades} nota={t.multi}>
                <p className={styles.pista}>{t.grades_hint}</p>
                {chips("grades_interest", "grades_interest", "varias")}
              </Pregunta>
            )}
            {ve("purchase_format") && (
              <Pregunta id="purchase_format" texto={t.q_format}>
                {chips("purchase_format", "purchase_format", "una")}
              </Pregunta>
            )}
            {ve("roast_in_destination") && (
              <Pregunta id="roast_in_destination" texto={t.q_roast}>
                {chips("roast_in_destination", "roast_in_destination", "una")}
              </Pregunta>
            )}
            {ve("certifications") && (
              <Pregunta id="certifications" texto={t.q_certs} nota={t.multi}>
                {chips("certifications", "certifications", "varias")}
              </Pregunta>
            )}
            {ve("regional_node_interest") && (
              <Pregunta id="regional_node_interest" texto={t.q_node}>
                <p className={styles.pista}>{t.node_hint}</p>
                <label className={styles.casilla}>
                  <input type="checkbox" checked={b.regional_node_interest} onChange={(e) => set("regional_node_interest", e.target.checked)} />
                  <span>{t.node_yes}</span>
                </label>
              </Pregunta>
            )}
            {ve("about") && (
              <Pregunta id="about" texto={t.about}>
                <textarea className={styles.textarea} value={b.about} onChange={(e) => set("about", e.target.value)} placeholder={t.about_ph} rows={3} maxLength={2000} />
              </Pregunta>
            )}
            {ve("producer_interest") && (
              <Pregunta id="producer_interest" texto={t.q_producer}>
                <p className={styles.pista}>{t.producer_hint}</p>
                <label className={styles.casilla}>
                  <input type="checkbox" checked={b.producer_interest} onChange={(e) => set("producer_interest", e.target.checked)} />
                  <span>{t.producer_yes}</span>
                </label>
              </Pregunta>
            )}
          </section>
        )}

        {/* 3 · Qué valoras */}
        {ve("values") && (
          <section className={styles.tarjeta}>
            <h2 className={styles.seccion}>{t.s3}</h2>
            <Pregunta id="values" texto={t.q_values}>
              <p className={styles.pista}>{t.values_hint}</p>
              <div className={styles.valores}>
                {OPCIONES.values.map((clave) => {
                  const marcado = clave in b.values;
                  const granos = b.values[clave] ?? 0;
                  return (
                    <div key={clave} className={marcado ? styles.valorActivo : styles.valor}>
                      <label className={styles.casilla}>
                        <input type="checkbox" checked={marcado} onChange={() => alternarValor(clave)} />
                        <span>{rotulo("values", clave)}</span>
                      </label>
                      {marcado && (
                        <div className={styles.escala}>
                          <div className={styles.granos} role="radiogroup" aria-label={rotulo("values", clave)}>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button key={n} type="button" role="radio" aria-checked={granos === n} aria-label={t.beans_aria.replace("{n}", String(n))} className={styles.grano} onClick={() => ponerGranos(clave, n)}>
                                <Grano lleno={n <= granos} />
                              </button>
                            ))}
                          </div>
                          <div className={styles.escalaRotulos}>
                            <span>{t.low}</span>
                            <span>{t.high}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Pregunta>
          </section>
        )}

        {/* 4 · Qué sigue */}
        <section className={styles.tarjeta}>
          <h2 className={styles.seccion}>{t.s4}</h2>
          <Pregunta id="looking_for" texto={t.q_looking} nota={t.optional}>
            <textarea className={styles.textarea} value={b.looking_for} onChange={(e) => set("looking_for", e.target.value)} placeholder={t.looking_ph} rows={3} maxLength={2000} />
          </Pregunta>
          {ve("timing") && (
            <Pregunta id="timing" texto={t.q_timing}>
              {chips("timing", "timing", "una")}
            </Pregunta>
          )}
          <Pregunta id="wants" texto={t.q_wants} nota={t.multi}>
            {chips("wants", "wants", "varias")}
          </Pregunta>
          {ve("master_roaster_interest") && (
            <Pregunta id="master_roaster_interest" texto={t.q_mr}>
              <p className={styles.pista}>{t.mr_hint}</p>
              <label className={styles.casilla}>
                <input type="checkbox" checked={b.master_roaster_interest} onChange={(e) => set("master_roaster_interest", e.target.checked)} />
                <span>{t.mr_yes}</span>
              </label>
            </Pregunta>
          )}
          <div className={styles.pregunta} id="campo-consent">
            <label className={styles.casilla}>
              <input type="checkbox" checked={b.consent} onChange={(e) => set("consent", e.target.checked)} required />
              <span>
                {t.consent}
                <span className={styles.ast}> *</span>{" "}
                <a href={privacyUrl} target="_blank" rel="noopener" className={styles.enlace}>
                  {t.privacy}
                </a>
              </span>
            </label>
          </div>

          {/* Honeypot: oculto a las personas; un bot lo llena y el servidor finge éxito sin guardar nada. */}
          <input ref={hpRef} type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.oculto} defaultValue="" id="website-hp" />

          {error && (
            <p className={styles.error} role="alert">
              {error.tipo === "required" && t.err_required}
              {error.tipo === "email" && t.err_email}
              {error.tipo === "network" && t.err_network}
              {error.tipo === "server" && t.err_server}
              {error.tipo === "closed" && `${t.closed_title}. ${t.closed_body}`}
            </p>
          )}
          <button type="submit" className={styles.enviar} disabled={enviando}>
            {enviando ? t.sending : error?.tipo === "network" ? t.retry : t.submit}
          </button>
        </section>
      </form>
      <p className={styles.legal}>{t.legal}</p>
    </main>
  );
}

const OPCIONES_TIPO = ["roaster", "importer", "cafe_horeca", "distributor", "producer", "barista", "press", "other"] as const;

type CampoDeChips = "green_volume" | "buys_colombian" | "timing" | "purchase_format" | "roast_in_destination" | "profiles" | "wants" | "grades_interest" | "certifications";

/** Las fichas de una pregunta cerrada: radio (una) o casillas (varias), con área táctil de 46 px. */
function Chips({ grupo, modo, seleccion, rotulo, onElegir }: { grupo: PreguntaCerrada; modo: "una" | "varias"; seleccion: string | string[]; rotulo: (grupo: string, clave: string) => string; onElegir: (clave: string) => void }) {
  return (
    <div className={styles.chips} role={modo === "una" ? "radiogroup" : "group"}>
      {OPCIONES[grupo].map((clave) => {
        const marcado = modo === "una" ? seleccion === clave : (seleccion as string[]).includes(clave);
        return (
          <button key={clave} type="button" role={modo === "una" ? "radio" : "checkbox"} aria-checked={marcado} className={marcado ? styles.chipActivo : styles.chip} onClick={() => onElegir(clave)}>
            <span className={modo === "una" ? styles.radio : styles.caja} aria-hidden="true" />
            {rotulo(grupo, clave)}
          </button>
        );
      })}
    </div>
  );
}

/** Una pregunta con su etiqueta siempre visible (y el ancla `campo-<id>` a la que se desplaza el error). */
function Pregunta({ id, texto, obligatoria, nota, children }: { id: string; texto: string; obligatoria?: boolean; nota?: string; children: React.ReactNode }) {
  return (
    <div className={styles.pregunta} id={`campo-${id}`}>
      <p className={styles.etiqueta}>
        {texto}
        {obligatoria ? <span className={styles.ast}> *</span> : nota ? <span className={styles.nota}> · {nota}</span> : null}
      </p>
      {children}
    </div>
  );
}
