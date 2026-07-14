"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { submitLeadPublic, submitLeadAuthed, type LeadPayload, type LeadSubmitResult } from "@/lib/leads/actions";
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
      showToast("No pudimos enviar tu solicitud. Intenta de nuevo.");
    }
  }

  async function continueWithGoogle(key: FormKey, form: HTMLFormElement) {
    const payload = collectPayload(key, form);
    if (!payload.nombre) {
      showToast("Escribe tu nombre antes de continuar con Google.");
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
      showToast("No pudimos iniciar sesión con Google. Intenta con tu correo.");
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
        <label htmlFor={`${key}-email`}>Correo electrónico</label>
        <input id={`${key}-email`} name="email" type="email" required placeholder="tu@correo.com" defaultValue={carry.email} />
      </div>
      {/* Honeypot: hidden from humans; bots that fill it get a silent no-op. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className={styles.hp} />
      <button className="btn btn-solid" type="submit" disabled={submitting}>
        {submitting ? "Enviando…" : "Enviar solicitud"}
      </button>
      <div className={styles.divider}>
        <span>o</span>
      </div>
      <button
        className={`btn ${styles.googleBtn}`}
        type="button"
        disabled={submitting}
        onClick={(e) => continueWithGoogle(key, (e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
      >
        Continuar con Google
      </button>
      <span className={styles.hint}>
        Creamos tu acceso a {PLATFORM_NAME[key]} y te respondemos por correo. Te llegará un mensaje de bienvenida al instante.
      </span>
    </>
  );

  const successPanel = phase.name === "success" && (
    <div className={styles.success}>
      <h3>¡Solicitud recibida! 🎉</h3>
      {phase.outcome === "created" ? (
        <p>
          Creamos tu cuenta en <b>{PLATFORM_NAME[phase.pillar]}</b> y te enviamos un correo de bienvenida. Nuestro equipo te
          responderá pronto — si aún no tienes contraseña, llegará adjunta a nuestra primera respuesta.
        </p>
      ) : (
        <p>
          Vinculamos tu solicitud a tu cuenta existente y te enviamos un correo de confirmación. Nuestro equipo te responderá
          pronto.
        </p>
      )}
      <button className="btn btn-solid" type="button" onClick={close}>
        Entendido
      </button>
    </div>
  );

  return (
    <ContactModalContext.Provider value={{ openForm }}>
      {children}
      <Modal open={openKey !== null} onClose={close} ariaLabel="Formulario de contacto">
        {successPanel}
        {phase.name !== "success" && openKey === "general" && (
          <div>
            <h3>Escríbenos</h3>
            <p>Cuéntanos quién eres y qué necesitas. Creamos tu cuenta y te respondemos por correo.</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                submitWithEmail("general", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="g-nombre">Nombre</label>
                  <input id="g-nombre" name="nombre" required placeholder="Su nombre" />
                </div>
                <div>
                  <label htmlFor="g-org">Organización / finca</label>
                  <input id="g-org" name="org" placeholder="Empresa, finca o marca" />
                </div>
              </div>
              <div>
                <label htmlFor="g-tema">Tema</label>
                <select
                  id="g-tema"
                  name="tema"
                  defaultValue="general"
                  onChange={(e) => {
                    if (e.target.value !== "general") switchTema(e.target.value as FormKey, e.target);
                  }}
                >
                  <option value="general">Consulta general</option>
                  <option value="tech">CTC Tech · tecnologías agrónomas</option>
                  <option value="cocreate">CTC Co-Create · proyecto EE.UU./Europa</option>
                  <option value="varietales">Varietales Registrados · chapolas</option>
                </select>
              </div>
              <div>
                <label htmlFor="g-msg">Mensaje</label>
                <textarea id="g-msg" name="msg" placeholder="¿En qué podemos ayudarte?" />
              </div>
              {footer("general")}
            </form>
          </div>
        )}

        {phase.name !== "success" && openKey === "tech" && (
          <div>
            <h3>CTC Tech · Agendar diagnóstico</h3>
            <p>Un diagnóstico en finca para definir qué tecnología aplica a su beneficio y su presupuesto.</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                submitWithEmail("tech", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="t-nombre">Nombre</label>
                  <input id="t-nombre" name="nombre" required placeholder="Su nombre" defaultValue={carry.nombre} />
                </div>
                <div>
                  <label htmlFor="t-finca">Finca / organización</label>
                  <input id="t-finca" name="finca" placeholder="Nombre de la finca" />
                </div>
              </div>
              <div>
                <label htmlFor="t-ubic">Ubicación</label>
                <input id="t-ubic" name="ubicacion" placeholder="Vereda · Municipio · Departamento" />
              </div>
              <div>
                <label>Tecnologías de interés</label>
                <div className={styles.chips}>
                  {["Ozono + UVC", "Técnicas de fermentación", "Selección óptica", "Cromatografía de suelos", "Instrumentación de medición"].map(
                    (opt) => (
                      <label className={styles.chip} key={opt}>
                        <input type="checkbox" name="interes" value={opt} /> {opt}
                      </label>
                    )
                  )}
                </div>
              </div>
              <div>
                <label htmlFor="t-msg">Cuéntenos de su proceso actual</label>
                <textarea id="t-msg" name="msg" placeholder="Volumen, beneficio actual, retos…" defaultValue={carry.msg} />
              </div>
              {footer("tech")}
            </form>
          </div>
        )}

        {phase.name !== "success" && openKey === "cocreate" && (
          <div>
            <h3>CTC Co-Create · Proponer un proyecto</h3>
            <p>Cuéntanos de tu funnel de demanda y armamos la mesa de trabajo.</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                submitWithEmail("cocreate", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="c-nombre">Nombre</label>
                  <input id="c-nombre" name="nombre" required placeholder="Tu nombre" defaultValue={carry.nombre} />
                </div>
                <div>
                  <label htmlFor="c-marca">Empresa / marca</label>
                  <input id="c-marca" name="marca" placeholder="Nombre de la marca" />
                </div>
              </div>
              <div className={styles.row2}>
                <div>
                  <label htmlFor="c-mercado">Mercado</label>
                  <select id="c-mercado" name="mercado" defaultValue="Estados Unidos">
                    <option>Estados Unidos</option>
                    <option>Europa</option>
                    <option>Ambos</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="c-canal">Canal</label>
                  <select id="c-canal" name="canal" defaultValue="Tostaduría">
                    <option>Tostaduría</option>
                    <option>Cadena / retail</option>
                    <option>Marca privada</option>
                    <option>E-commerce</option>
                    <option>Otro</option>
                  </select>
                </div>
              </div>
              <div className={styles.row2}>
                <div>
                  <label htmlFor="c-formato">Formato</label>
                  <select id="c-formato" name="formato" defaultValue="Café verde">
                    <option>Café verde</option>
                    <option>Café tostado</option>
                    <option>Verde + tostado</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="c-vol">Volumen estimado (kg/año)</label>
                  <input id="c-vol" name="vol" type="number" placeholder="Ej. 6000" />
                </div>
              </div>
              <div>
                <label htmlFor="c-msg">El proyecto</label>
                <textarea id="c-msg" name="msg" placeholder="Etapa del funnel, calidades buscadas, tiempos…" defaultValue={carry.msg} />
              </div>
              {footer("cocreate")}
            </form>
          </div>
        )}

        {phase.name !== "success" && openKey === "varietales" && (
          <div>
            <h3>Varietales Registrados · Solicitar catálogo</h3>
            <p>Genética verificada en estado de chapola. Mínimo 100 unidades · $150–$300 COP c/u según varietal.</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                submitWithEmail("varietales", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="v-nombre">Nombre</label>
                  <input id="v-nombre" name="nombre" required placeholder="Su nombre" defaultValue={carry.nombre} />
                </div>
                <div>
                  <label htmlFor="v-finca">Finca</label>
                  <input id="v-finca" name="finca" placeholder="Nombre de la finca" />
                </div>
              </div>
              <div>
                <label htmlFor="v-ubic">Ubicación y altura</label>
                <input id="v-ubic" name="ubicacion" placeholder="Municipio, Departamento · msnm" />
              </div>
              <div className={styles.row2}>
                <div>
                  <label htmlFor="v-var">Varietal de interés</label>
                  <input id="v-var" name="varietal" placeholder="Ej. Gesha, Sidra, Pink Bourbon…" />
                </div>
                <div>
                  <label htmlFor="v-cant">Cantidad de chapolas</label>
                  <input id="v-cant" name="cantidad" type="number" min={100} placeholder="Mínimo 100" />
                </div>
              </div>
              <div>
                <label htmlFor="v-msg">Mensaje</label>
                <textarea id="v-msg" name="msg" placeholder="Perfil de taza objetivo, fecha de siembra…" defaultValue={carry.msg} />
              </div>
              {footer("varietales")}
            </form>
          </div>
        )}
      </Modal>
    </ContactModalContext.Provider>
  );
}
