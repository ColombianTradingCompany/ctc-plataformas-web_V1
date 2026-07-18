"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { submitLeadPublic, submitLeadAuthed, type LeadPayload, type LeadSubmitResult } from "@/lib/leads/actions";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./ContactModal.module.css";

type FormKey = "general" | "tech" | "cocreate" | "varietales";

// The in-progress form survives the Google OAuth redirect here; the resume
// effect below picks it up once the session exists. 30-minute freshness so an
// abandoned attempt never resurrects days later.
const STASH_KEY = "ctc_lead_stash";
const STASH_TTL_MS = 30 * 60e3;

const PLATFORM_NAME: Record<FormKey, string> = {
  general: "Kaffetal Regal",
  tech: "Kaffetal Regal",
  varietales: "Kaffetal Regal",
  cocreate: "Cherry Picked",
};

type Dict = {
  ariaForm: string;
  email: string;
  emailPh: string;
  submit: string;
  submitting: string;
  or: string;
  google: string;
  hint: (platform: string) => string;
  successH3: string;
  successCreated: (platform: string) => React.ReactNode;
  successExisting: string;
  successOk: string;
  errSend: string;
  errName: string;
  errGoogle: string;
  name: string;
  namePh: string;
  gH3: string;
  gIntro: string;
  gOrg: string;
  gOrgPh: string;
  gTema: string;
  temaGeneral: string;
  temaTech: string;
  temaCocreate: string;
  temaVarietales: string;
  gMsg: string;
  gMsgPh: string;
  tH3: string;
  tIntro: string;
  tFinca: string;
  tFincaPh: string;
  tUbic: string;
  tUbicPh: string;
  tInteres: string;
  tOptions: string[];
  tMsg: string;
  tMsgPh: string;
  cH3: string;
  cIntro: string;
  cMarca: string;
  cMarcaPh: string;
  cMercado: string;
  cMercadoOpts: string[];
  cCanal: string;
  cCanalOpts: string[];
  cFormato: string;
  cFormatoOpts: string[];
  cVol: string;
  cVolPh: string;
  cMsg: string;
  cMsgPh: string;
  vH3: string;
  vIntro: string;
  vFinca: string;
  vFincaPh: string;
  vUbic: string;
  vUbicPh: string;
  vVar: string;
  vVarPh: string;
  vCant: string;
  vCantPh: string;
  vMsg: string;
  vMsgPh: string;
};

const T: Record<Lang, Dict> = {
  es: {
    ariaForm: "Formulario de contacto",
    email: "Correo electrónico",
    emailPh: "tu@correo.com",
    submit: "Enviar solicitud",
    submitting: "Enviando…",
    or: "o",
    google: "Continuar con Google",
    hint: (p) => `Creamos tu acceso a ${p} y te respondemos por correo. Te llegará un mensaje de bienvenida al instante.`,
    successH3: "¡Solicitud recibida! 🎉",
    successCreated: (p) => (
      <>
        Creamos tu cuenta en <b>{p}</b> y te enviamos un correo de bienvenida. Nuestro equipo te responderá pronto — si
        aún no tienes contraseña, llegará adjunta a nuestra primera respuesta.
      </>
    ),
    successExisting:
      "Vinculamos tu solicitud a tu cuenta existente y te enviamos un correo de confirmación. Nuestro equipo te responderá pronto.",
    successOk: "Entendido",
    errSend: "No pudimos enviar tu solicitud. Intenta de nuevo.",
    errName: "Escribe tu nombre antes de continuar con Google.",
    errGoogle: "No pudimos iniciar sesión con Google. Intenta con tu correo.",
    name: "Nombre",
    namePh: "Su nombre",
    gH3: "Escríbenos",
    gIntro: "Cuéntanos quién eres y qué necesitas. Creamos tu cuenta y te respondemos por correo.",
    gOrg: "Organización / finca",
    gOrgPh: "Empresa, finca o marca",
    gTema: "Tema",
    temaGeneral: "Consulta general",
    temaTech: "CTC Tech · tecnologías agrónomas",
    temaCocreate: "CTC Co-Create · proyecto EE.UU./Europa",
    temaVarietales: "Varietales Registrados · chapolas",
    gMsg: "Mensaje",
    gMsgPh: "¿En qué podemos ayudarte?",
    tH3: "CTC Tech · Agendar diagnóstico",
    tIntro: "Un diagnóstico en finca para definir qué tecnología aplica a su beneficio y su presupuesto.",
    tFinca: "Finca / organización",
    tFincaPh: "Nombre de la finca",
    tUbic: "Ubicación",
    tUbicPh: "Vereda · Municipio · Departamento",
    tInteres: "Tecnologías de interés",
    tOptions: ["Ozono + UVC", "Técnicas de fermentación", "Selección óptica", "Cromatografía de suelos", "Instrumentación de medición"],
    tMsg: "Cuéntenos de su proceso actual",
    tMsgPh: "Volumen, beneficio actual, retos…",
    cH3: "CTC Co-Create · Proponer un proyecto",
    cIntro: "Cuéntanos de tu funnel de demanda y armamos la mesa de trabajo.",
    cMarca: "Empresa / marca",
    cMarcaPh: "Nombre de la marca",
    cMercado: "Mercado",
    cMercadoOpts: ["Estados Unidos", "Europa", "Ambos"],
    cCanal: "Canal",
    cCanalOpts: ["Tostaduría", "Cadena / retail", "Marca privada", "E-commerce", "Otro"],
    cFormato: "Formato",
    cFormatoOpts: ["Café verde", "Café tostado", "Verde + tostado"],
    cVol: "Volumen estimado (kg/año)",
    cVolPh: "Ej. 6000",
    cMsg: "El proyecto",
    cMsgPh: "Etapa del funnel, calidades buscadas, tiempos…",
    vH3: "Varietales Registrados · Solicitar catálogo",
    vIntro: "Genética verificada en estado de chapola. Mínimo 100 unidades · $150–$300 COP c/u según varietal.",
    vFinca: "Finca",
    vFincaPh: "Nombre de la finca",
    vUbic: "Ubicación y altura",
    vUbicPh: "Municipio, Departamento · msnm",
    vVar: "Varietal de interés",
    vVarPh: "Ej. Gesha, Sidra, Pink Bourbon…",
    vCant: "Cantidad de chapolas",
    vCantPh: "Mínimo 100",
    vMsg: "Mensaje",
    vMsgPh: "Perfil de taza objetivo, fecha de siembra…",
  },
  en: {
    ariaForm: "Contact form",
    email: "Email",
    emailPh: "you@email.com",
    submit: "Send request",
    submitting: "Sending…",
    or: "or",
    google: "Continue with Google",
    hint: (p) => `We create your ${p} access and reply by email. A welcome message will arrive instantly.`,
    successH3: "Request received! 🎉",
    successCreated: (p) => (
      <>
        We created your account on <b>{p}</b> and sent you a welcome email. Our team will reply soon — if you don&apos;t
        have a password yet, it will arrive attached to our first reply.
      </>
    ),
    successExisting:
      "We linked your request to your existing account and sent you a confirmation email. Our team will reply soon.",
    successOk: "Got it",
    errSend: "We couldn't send your request. Please try again.",
    errName: "Write your name before continuing with Google.",
    errGoogle: "We couldn't sign you in with Google. Try with your email instead.",
    name: "Name",
    namePh: "Your name",
    gH3: "Write to us",
    gIntro: "Tell us who you are and what you need. We create your account and reply by email.",
    gOrg: "Organization / farm",
    gOrgPh: "Company, farm or brand",
    gTema: "Topic",
    temaGeneral: "General inquiry",
    temaTech: "CTC Tech · agronomic technologies",
    temaCocreate: "CTC Co-Create · US/Europe project",
    temaVarietales: "Registered Varietals · seedlings",
    gMsg: "Message",
    gMsgPh: "How can we help you?",
    tH3: "CTC Tech · Book a diagnosis",
    tIntro: "An on-farm diagnosis to define which technology fits your mill and your budget.",
    tFinca: "Farm / organization",
    tFincaPh: "Farm name",
    tUbic: "Location",
    tUbicPh: "Vereda · Municipality · Department",
    tInteres: "Technologies of interest",
    tOptions: ["Ozone + UVC", "Fermentation techniques", "Optical sorting", "Soil chromatography", "Measurement instrumentation"],
    tMsg: "Tell us about your current process",
    tMsgPh: "Volume, current mill, challenges…",
    cH3: "CTC Co-Create · Propose a project",
    cIntro: "Tell us about your demand funnel and we'll set the working table.",
    cMarca: "Company / brand",
    cMarcaPh: "Brand name",
    cMercado: "Market",
    cMercadoOpts: ["United States", "Europe", "Both"],
    cCanal: "Channel",
    cCanalOpts: ["Roastery", "Chain / retail", "Private label", "E-commerce", "Other"],
    cFormato: "Format",
    cFormatoOpts: ["Green coffee", "Roasted coffee", "Green + roasted"],
    cVol: "Estimated volume (kg/year)",
    cVolPh: "E.g. 6000",
    cMsg: "The project",
    cMsgPh: "Funnel stage, qualities sought, timing…",
    vH3: "Registered Varietals · Request the catalogue",
    vIntro: "Verified genetics at the seedling (chapola) stage. Minimum 100 units · $150–$300 COP each depending on varietal.",
    vFinca: "Farm",
    vFincaPh: "Farm name",
    vUbic: "Location and altitude",
    vUbicPh: "Municipality, Department · masl",
    vVar: "Varietal of interest",
    vVarPh: "E.g. Gesha, Sidra, Pink Bourbon…",
    vCant: "Number of seedlings",
    vCantPh: "Minimum 100",
    vMsg: "Message",
    vMsgPh: "Target cup profile, planting date…",
  },
  de: {
    ariaForm: "Kontaktformular",
    email: "E-Mail",
    emailPh: "du@mail.com",
    submit: "Anfrage senden",
    submitting: "Wird gesendet…",
    or: "oder",
    google: "Mit Google fortfahren",
    hint: (p) => `Wir richten Ihren Zugang zu ${p} ein und antworten per E-Mail. Eine Willkommensnachricht kommt sofort an.`,
    successH3: "Anfrage erhalten! 🎉",
    successCreated: (p) => (
      <>
        Wir haben Ihr Konto auf <b>{p}</b> erstellt und Ihnen eine Willkommens-E-Mail geschickt. Unser Team antwortet
        bald — falls Sie noch kein Passwort haben, kommt es mit unserer ersten Antwort.
      </>
    ),
    successExisting:
      "Wir haben Ihre Anfrage mit Ihrem bestehenden Konto verknüpft und Ihnen eine Bestätigungs-E-Mail geschickt. Unser Team antwortet bald.",
    successOk: "Verstanden",
    errSend: "Wir konnten Ihre Anfrage nicht senden. Bitte versuchen Sie es erneut.",
    errName: "Schreiben Sie Ihren Namen, bevor Sie mit Google fortfahren.",
    errGoogle: "Anmeldung mit Google fehlgeschlagen. Versuchen Sie es mit Ihrer E-Mail.",
    name: "Name",
    namePh: "Ihr Name",
    gH3: "Schreiben Sie uns",
    gIntro: "Erzählen Sie uns, wer Sie sind und was Sie brauchen. Wir erstellen Ihr Konto und antworten per E-Mail.",
    gOrg: "Organisation / Finca",
    gOrgPh: "Unternehmen, Finca oder Marke",
    gTema: "Thema",
    temaGeneral: "Allgemeine Anfrage",
    temaTech: "CTC Tech · Agrartechnologien",
    temaCocreate: "CTC Co-Create · Projekt USA/Europa",
    temaVarietales: "Registrierte Varietäten · Setzlinge",
    gMsg: "Nachricht",
    gMsgPh: "Womit können wir helfen?",
    tH3: "CTC Tech · Diagnose vereinbaren",
    tIntro: "Eine Diagnose auf der Finca, um zu bestimmen, welche Technologie zu Ihrer Aufbereitung und Ihrem Budget passt.",
    tFinca: "Finca / Organisation",
    tFincaPh: "Name der Finca",
    tUbic: "Standort",
    tUbicPh: "Vereda · Gemeinde · Departement",
    tInteres: "Interessante Technologien",
    tOptions: ["Ozon + UVC", "Fermentationstechniken", "Optische Sortierung", "Bodenchromatografie", "Messinstrumente"],
    tMsg: "Erzählen Sie uns von Ihrem aktuellen Prozess",
    tMsgPh: "Volumen, aktuelle Aufbereitung, Herausforderungen…",
    cH3: "CTC Co-Create · Ein Projekt vorschlagen",
    cIntro: "Erzählen Sie uns von Ihrem Nachfrage-Funnel und wir stellen den Arbeitstisch auf.",
    cMarca: "Unternehmen / Marke",
    cMarcaPh: "Name der Marke",
    cMercado: "Markt",
    cMercadoOpts: ["USA", "Europa", "Beide"],
    cCanal: "Kanal",
    cCanalOpts: ["Rösterei", "Kette / Einzelhandel", "Eigenmarke", "E-Commerce", "Andere"],
    cFormato: "Format",
    cFormatoOpts: ["Rohkaffee", "Röstkaffee", "Roh + geröstet"],
    cVol: "Geschätztes Volumen (kg/Jahr)",
    cVolPh: "z. B. 6000",
    cMsg: "Das Projekt",
    cMsgPh: "Funnel-Phase, gesuchte Qualitäten, Zeitplan…",
    vH3: "Registrierte Varietäten · Katalog anfragen",
    vIntro: "Verifizierte Genetik im Chapola-Stadium. Mindestens 100 Stück · $150–$300 COP pro Stück je nach Varietät.",
    vFinca: "Finca",
    vFincaPh: "Name der Finca",
    vUbic: "Standort und Höhe",
    vUbicPh: "Gemeinde, Departement · m ü. M.",
    vVar: "Gewünschte Varietät",
    vVarPh: "z. B. Gesha, Sidra, Pink Bourbon…",
    vCant: "Anzahl Setzlinge",
    vCantPh: "Mindestens 100",
    vMsg: "Nachricht",
    vMsgPh: "Ziel-Tassenprofil, Pflanzdatum…",
  },
};

const ContactModalContext = createContext<{
  openForm: (key: FormKey) => void;
} | null>(null);

export function useContactModal() {
  const ctx = useContext(ContactModalContext);
  if (!ctx) throw new Error("useContactModal must be used within ContactModalProvider");
  return ctx;
}

// Serializes a form into the server-action payload. The pillar decides which
// field keys matter (the action whitelists them again server-side).
function collectPayload(key: FormKey, form: HTMLFormElement): LeadPayload {
  const fd = new FormData(form);
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const fields: Record<string, unknown> = {};
  if (key === "general") {
    fields.org = s("org");
    const temaSelect = form.elements.namedItem("tema") as HTMLSelectElement | null;
    fields.tema = temaSelect?.selectedOptions[0]?.text ?? "Consulta general";
  } else if (key === "tech") {
    fields.finca = s("finca");
    fields.ubicacion = s("ubicacion");
    fields.interes = fd.getAll("interes").map(String);
  } else if (key === "cocreate") {
    fields.marca = s("marca");
    fields.mercado = s("mercado");
    fields.canal = s("canal");
    fields.formato = s("formato");
    fields.vol = s("vol");
  } else {
    fields.finca = s("finca");
    fields.ubicacion = s("ubicacion");
    fields.varietal = s("varietal");
    fields.cantidad = s("cantidad");
  }
  return { pillar: key, nombre: s("nombre"), email: s("email"), message: s("msg"), fields, website: s("website") };
}

type Phase = { name: "idle" } | { name: "submitting" } | { name: "success"; outcome: "created" | "existing"; pillar: FormKey };

// Module scope on purpose: the react-compiler purity rule treats component-
// scoped closures as render code, and Date.now() is only ever called from
// event handlers here.
function stashLead(payload: LeadPayload) {
  localStorage.setItem(STASH_KEY, JSON.stringify({ ...payload, ts: Date.now() }));
}

function readFreshStash(): (LeadPayload & { ts: number }) | null {
  const raw = localStorage.getItem(STASH_KEY);
  if (!raw) return null;
  localStorage.removeItem(STASH_KEY);
  try {
    const stash = JSON.parse(raw) as LeadPayload & { ts: number };
    return Date.now() - stash.ts > STASH_TTL_MS ? null : stash;
  } catch {
    return null;
  }
}

export function ContactModalProvider({ children }: { children: React.ReactNode }) {
  const t = T[useLang()];
  const [openKey, setOpenKey] = useState<FormKey | null>(null);
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  // What the visitor already typed in the general form survives a "Tema"
  // switch: switching used to unmount the form and silently discard
  // nombre/correo/mensaje.
  const [carry, setCarry] = useState<{ nombre?: string; email?: string; msg?: string }>({});
  const [supabase] = useState(() => createClient());
  const { showToast } = useToast();
  const resuming = useRef(false);

  const close = () => {
    setOpenKey(null);
    setPhase({ name: "idle" });
  };
  const openForm = (key: FormKey) => {
    setPhase({ name: "idle" });
    setCarry({});
    setOpenKey(key);
  };

  function switchTema(nextKey: FormKey, select: HTMLSelectElement) {
    const form = select.closest("form");
    if (form) {
      const fd = new FormData(form);
      const s = (k: string) => String(fd.get(k) ?? "").trim();
      setCarry({ nombre: s("nombre"), email: s("email"), msg: s("msg") });
    }
    setOpenKey(nextKey);
  }

  function applyResult(result: LeadSubmitResult, pillar: FormKey) {
    if (result.ok) {
      setPhase({ name: "success", outcome: result.outcome, pillar });
      setOpenKey(pillar);
    } else {
      setPhase({ name: "idle" });
      showToast(result.message);
    }
  }

  async function submitWithEmail(key: FormKey, form: HTMLFormElement) {
    setPhase({ name: "submitting" });
    try {
      const result = await submitLeadPublic(collectPayload(key, form));
      applyResult(result, key);
    } catch {
      setPhase({ name: "idle" });
      showToast(t.errSend);
    }
  }

  async function continueWithGoogle(key: FormKey, form: HTMLFormElement) {
    const payload = collectPayload(key, form);
    if (!payload.nombre) {
      showToast(t.errName);
      return;
    }
    stashLead(payload);
    setPhase({ name: "submitting" });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      localStorage.removeItem(STASH_KEY);
      setPhase({ name: "idle" });
      showToast(t.errGoogle);
    }
  }

  // Resume after the OAuth round-trip: /auth/callback lands on /?lead=resume.
  // The stash is removed BEFORE the await (strict-mode double-effect guard) and
  // an in-flight ref blocks concurrent runs. No session = silent cleanup.
  useEffect(() => {
    if (resuming.current) return;
    resuming.current = true;
    (async () => {
      const stash = readFreshStash();
      if (!stash) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return; // abandoned mid-OAuth: costs nothing
      if (window.location.search.includes("lead=resume")) {
        window.history.replaceState({}, "", window.location.pathname);
      }
      const pillar = stash.pillar as FormKey;
      const result = await submitLeadAuthed(stash);
      applyResult(result, pillar);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  const submitting = phase.name === "submitting";

  // Shared footer: primary email-path submit + Google alternative.
  const footer = (key: FormKey) => (
    <>
      <div>
        <label htmlFor={`${key}-email`}>{t.email}</label>
        <input id={`${key}-email`} name="email" type="email" required placeholder={t.emailPh} defaultValue={carry.email} />
      </div>
      {/* Honeypot: hidden from humans; bots that fill it get a silent no-op. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.hp} />
      <button className="btn btn-solid" type="submit" disabled={submitting}>
        {submitting ? t.submitting : t.submit}
      </button>
      <div className={styles.divider}>
        <span>{t.or}</span>
      </div>
      <button
        className={`btn ${styles.googleBtn}`}
        type="button"
        disabled={submitting}
        onClick={(e) => continueWithGoogle(key, (e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
      >
        {t.google}
      </button>
      <span className={styles.hint}>{t.hint(PLATFORM_NAME[key])}</span>
    </>
  );

  const successPanel = phase.name === "success" && (
    <div className={styles.success}>
      <h3>{t.successH3}</h3>
      {phase.outcome === "created" ? <p>{t.successCreated(PLATFORM_NAME[phase.pillar])}</p> : <p>{t.successExisting}</p>}
      <button className="btn btn-solid" type="button" onClick={close}>
        {t.successOk}
      </button>
    </div>
  );

  return (
    <ContactModalContext.Provider value={{ openForm }}>
      {children}
      <Modal open={openKey !== null} onClose={close} ariaLabel={t.ariaForm}>
        {successPanel}
        {phase.name !== "success" && openKey === "general" && (
          <div>
            <h3>{t.gH3}</h3>
            <p>{t.gIntro}</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                submitWithEmail("general", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="g-nombre">{t.name}</label>
                  <input id="g-nombre" name="nombre" required placeholder={t.namePh} />
                </div>
                <div>
                  <label htmlFor="g-org">{t.gOrg}</label>
                  <input id="g-org" name="org" placeholder={t.gOrgPh} />
                </div>
              </div>
              <div>
                <label htmlFor="g-tema">{t.gTema}</label>
                <select
                  id="g-tema"
                  name="tema"
                  defaultValue="general"
                  onChange={(e) => {
                    if (e.target.value !== "general") switchTema(e.target.value as FormKey, e.target);
                  }}
                >
                  <option value="general">{t.temaGeneral}</option>
                  <option value="tech">{t.temaTech}</option>
                  <option value="cocreate">{t.temaCocreate}</option>
                  <option value="varietales">{t.temaVarietales}</option>
                </select>
              </div>
              <div>
                <label htmlFor="g-msg">{t.gMsg}</label>
                <textarea id="g-msg" name="msg" placeholder={t.gMsgPh} />
              </div>
              {footer("general")}
            </form>
          </div>
        )}

        {phase.name !== "success" && openKey === "tech" && (
          <div>
            <h3>{t.tH3}</h3>
            <p>{t.tIntro}</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                submitWithEmail("tech", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="t-nombre">{t.name}</label>
                  <input id="t-nombre" name="nombre" required placeholder={t.namePh} defaultValue={carry.nombre} />
                </div>
                <div>
                  <label htmlFor="t-finca">{t.tFinca}</label>
                  <input id="t-finca" name="finca" placeholder={t.tFincaPh} />
                </div>
              </div>
              <div>
                <label htmlFor="t-ubic">{t.tUbic}</label>
                <input id="t-ubic" name="ubicacion" placeholder={t.tUbicPh} />
              </div>
              <div>
                <label>{t.tInteres}</label>
                <div className={styles.chips}>
                  {t.tOptions.map((opt) => (
                    <label className={styles.chip} key={opt}>
                      <input type="checkbox" name="interes" value={opt} /> {opt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label htmlFor="t-msg">{t.tMsg}</label>
                <textarea id="t-msg" name="msg" placeholder={t.tMsgPh} defaultValue={carry.msg} />
              </div>
              {footer("tech")}
            </form>
          </div>
        )}

        {phase.name !== "success" && openKey === "cocreate" && (
          <div>
            <h3>{t.cH3}</h3>
            <p>{t.cIntro}</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                submitWithEmail("cocreate", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="c-nombre">{t.name}</label>
                  <input id="c-nombre" name="nombre" required placeholder={t.namePh} defaultValue={carry.nombre} />
                </div>
                <div>
                  <label htmlFor="c-marca">{t.cMarca}</label>
                  <input id="c-marca" name="marca" placeholder={t.cMarcaPh} />
                </div>
              </div>
              <div className={styles.row2}>
                <div>
                  <label htmlFor="c-mercado">{t.cMercado}</label>
                  <select id="c-mercado" name="mercado" defaultValue={t.cMercadoOpts[0]}>
                    {t.cMercadoOpts.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="c-canal">{t.cCanal}</label>
                  <select id="c-canal" name="canal" defaultValue={t.cCanalOpts[0]}>
                    {t.cCanalOpts.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.row2}>
                <div>
                  <label htmlFor="c-formato">{t.cFormato}</label>
                  <select id="c-formato" name="formato" defaultValue={t.cFormatoOpts[0]}>
                    {t.cFormatoOpts.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="c-vol">{t.cVol}</label>
                  <input id="c-vol" name="vol" type="number" placeholder={t.cVolPh} />
                </div>
              </div>
              <div>
                <label htmlFor="c-msg">{t.cMsg}</label>
                <textarea id="c-msg" name="msg" placeholder={t.cMsgPh} defaultValue={carry.msg} />
              </div>
              {footer("cocreate")}
            </form>
          </div>
        )}

        {phase.name !== "success" && openKey === "varietales" && (
          <div>
            <h3>{t.vH3}</h3>
            <p>{t.vIntro}</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                submitWithEmail("varietales", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="v-nombre">{t.name}</label>
                  <input id="v-nombre" name="nombre" required placeholder={t.namePh} defaultValue={carry.nombre} />
                </div>
                <div>
                  <label htmlFor="v-finca">{t.vFinca}</label>
                  <input id="v-finca" name="finca" placeholder={t.vFincaPh} />
                </div>
              </div>
              <div>
                <label htmlFor="v-ubic">{t.vUbic}</label>
                <input id="v-ubic" name="ubicacion" placeholder={t.vUbicPh} />
              </div>
              <div className={styles.row2}>
                <div>
                  <label htmlFor="v-var">{t.vVar}</label>
                  <input id="v-var" name="varietal" placeholder={t.vVarPh} />
                </div>
                <div>
                  <label htmlFor="v-cant">{t.vCant}</label>
                  <input id="v-cant" name="cantidad" type="number" min={100} placeholder={t.vCantPh} />
                </div>
              </div>
              <div>
                <label htmlFor="v-msg">{t.vMsg}</label>
                <textarea id="v-msg" name="msg" placeholder={t.vMsgPh} defaultValue={carry.msg} />
              </div>
              {footer("varietales")}
            </form>
          </div>
        )}
      </Modal>
    </ContactModalContext.Provider>
  );
}
