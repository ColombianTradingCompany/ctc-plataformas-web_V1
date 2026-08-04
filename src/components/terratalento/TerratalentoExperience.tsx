"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  cargarTerratalento,
  guardarPerfilRecolector,
  setDisponibleRecolector,
  type TerratalentoBundle,
} from "@/lib/terratalento/actions";
import { JornadaCard } from "./JornadaCard";
import { RedSwitcher } from "@/components/RedSwitcher";
import { SurfaceShell } from "@/components/services/SurfaceShell";
import surface from "@/components/services/surface.module.css";
import styles from "./terratalento.module.css";
import { PasswordField } from "@/components/PasswordField";

// ── Terratalento · la superficie del RECOLECTOR ──────────────────────────────
// Patrón Directorio: sin sesión → landing / acceso (la MISMA cuenta del
// ecosistema, ortogonal a profiles.role); con sesión sin perfil → completa tu
// perfil; con perfil → panel (jornadas abiertas + mis postulaciones +
// disponibilidad). Español a propósito — es la superficie del campo.

export function TerratalentoExperience() {
  const [cargando, setCargando] = useState(true);
  const [bundle, setBundle] = useState<TerratalentoBundle | null>(null);
  const [vista, setVista] = useState<"landing" | "login">("landing");
  const [modoLogin, setModoLogin] = useState<"entrar" | "crear">("entrar");

  const recargar = useCallback(async () => {
    setBundle(await cargarTerratalento());
    setCargando(false);
  }, []);

  useEffect(() => {
    let vivo = true;
    const supabase = createClient();
    const cargar = async () => {
      const b = await cargarTerratalento();
      if (!vivo) return;
      setBundle(b);
      setCargando(false);
    };
    cargar();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (["SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) cargar();
    });
    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const salir = useCallback(async () => {
    await createClient().auth.signOut();
    setBundle(null);
    setVista("landing");
    window.scrollTo(0, 0);
  }, []);

  return (
    <SurfaceShell name="Terratalento">
      {cargando ? (
        <div className={styles.authWrap}>
          <p style={{ textAlign: "center", color: "var(--muted, #6b6459)" }}>Cargando…</p>
        </div>
      ) : bundle ? (
        <Panel bundle={bundle} onRecargar={recargar} onSalir={salir} />
      ) : vista === "login" ? (
        <Acceso modoInicial={modoLogin} onVolver={() => setVista("landing")} />
      ) : (
        <Landing
          onCrear={() => {
            setModoLogin("crear");
            setVista("login");
            window.scrollTo(0, 0);
          }}
          onEntrar={() => {
            setModoLogin("entrar");
            setVista("login");
            window.scrollTo(0, 0);
          }}
        />
      )}
    </SurfaceShell>
  );
}

// ── Landing ──────────────────────────────────────────────────────────────────

function Landing({ onCrear, onEntrar }: { onCrear: () => void; onEntrar: () => void }) {
  return (
    <>
      <section className={surface.hero}>
        <span className={surface.tag}>Terratalento</span>
        <h1>Las manos que recogen la cosecha</h1>
        <p className={surface.heroSub}>El puente entre las fincas de la red CTC y los recolectores de café</p>
        <p className={surface.heroBody}>
          Cada cosecha, las fincas necesitan manos de confianza — y los recolectores, jornadas serias con condiciones
          claras. Terratalento junta a los dos: tú creas tu perfil una sola vez, las fincas de la red publican sus
          Jornadas de Recolecta, y CTC hace el llamado. Gratis para el recolector.
        </p>
        <div className={surface.ctaRow}>
          <button className="btn btn-solid" type="button" onClick={onCrear}>
            Crear mi perfil de recolector
          </button>
          <button className="btn" type="button" onClick={onEntrar}>
            Ya tengo cuenta
          </button>
        </div>
        <div className={surface.chips}>
          <span className={surface.chip}>Gratis · sin intermediarios</span>
          <span className={surface.chip}>Fincas verificadas de la red CTC</span>
          <span className={surface.chip}>Una sola cuenta para toda la red</span>
        </div>
      </section>

      <section className={`${surface.section} ${surface.sectionAlt}`}>
        <div className={`${surface.sectionInner} ${surface.single}`}>
          <div>
            <p className={surface.sectionTagline}>Cómo funciona</p>
            <h2>Tres pasos, sin papeleo</h2>
            <div className={surface.points}>
              <div className={surface.point}>
                <p className={surface.pointT}>1 · Crea tu perfil</p>
                <p className={surface.pointD}>
                  Tu nombre, tu celular, tu municipio y tu experiencia. Con eso basta — el perfil se llena una vez y
                  queda listo para todas las cosechas.
                </p>
              </div>
              <div className={surface.point}>
                <p className={surface.pointT}>2 · Postúlate a una Jornada</p>
                <p className={surface.pointD}>
                  Las fincas de la red publican sus Jornadas de Recolecta con fechas, cupos y condiciones. Te postulas a
                  las que te sirvan con un solo botón.
                </p>
              </div>
              <div className={surface.point}>
                <p className={surface.pointT}>3 · CTC hace el llamado</p>
                <p className={surface.pointD}>
                  El equipo de CTC empareja cada jornada con sus recolectores y confirma los cupos. Tu estado se ve
                  siempre en tu panel: postulado, llamado o confirmado.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={surface.closing}>
        <h2>La cosecha no espera</h2>
        <p>Crea tu perfil hoy y quedas visible para las fincas de la red desde la próxima Jornada.</p>
        <button className="btn btn-solid-accent" type="button" onClick={onCrear}>
          Crear mi perfil de recolector
        </button>
      </section>
    </>
  );
}

// ── Acceso (misma cuenta del ecosistema) ─────────────────────────────────────

function Acceso({ modoInicial, onVolver }: { modoInicial: "entrar" | "crear"; onVolver: () => void }) {
  const [modo, setModo] = useState(modoInicial);
  const [nombre, setNombre] = useState("");
  const [mail, setMail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mail.trim() || !pass) {
      setError("Escribe tu correo y contraseña.");
      return;
    }
    setError(null);
    setAviso(null);
    setCargando(true);
    const supabase = createClient();

    if (modo === "crear") {
      const { data, error: err } = await supabase.auth.signUp({
        email: mail.trim(),
        password: pass,
        options: { data: { full_name: nombre.trim() || undefined } },
      });
      setCargando(false);
      if (err) {
        setError(
          err.message.includes("already registered")
            ? "Ese correo ya tiene una cuenta. Usa «Entrar»."
            : "No se pudo crear la cuenta. Intenta de nuevo."
        );
        return;
      }
      if (!data.session) {
        setAviso("Cuenta creada. Revisa tu correo para confirmarla y luego entra con tu contraseña.");
      }
      return;
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email: mail.trim(), password: pass });
    setCargando(false);
    if (err) setError("Credenciales inválidas.");
  };

  // El prefijo /terratalento va a propósito: proxy.ts no reescribe una ruta que
  // ya empieza por la base, así que esta misma URL sirve en el subdominio y en
  // dev. Debe estar en la allowlist de Supabase (Authentication → URL Config).
  const conGoogle = async () => {
    setError(null);
    setAviso(null);
    await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/terratalento/auth/callback` },
    });
  };

  return (
    <div className={styles.authWrap}>
      <div className={styles.authCard}>
        <h2>{modo === "crear" ? "Crear mi cuenta" : "Entrar a Terratalento"}</h2>
        <p className={styles.cardSub}>
          Es la misma cuenta de toda la red CTC: si ya tienes una (Kaffetal Regal, Cherry Picked, el Directorio), entra
          con ella.
        </p>
        <div className={styles.authTabs}>
          <button className={`btn btn-sm ${modo === "entrar" ? "btn-solid" : ""}`} type="button" onClick={() => setModo("entrar")}>
            Entrar
          </button>
          <button className={`btn btn-sm ${modo === "crear" ? "btn-solid" : ""}`} type="button" onClick={() => setModo("crear")}>
            Crear cuenta
          </button>
        </div>
        <form className={styles.authForm} onSubmit={enviar}>
          {modo === "crear" && (
            <div className={styles.field}>
              <label htmlFor="tt-nombre">Nombre</label>
              <input id="tt-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre completo" />
            </div>
          )}
          <div className={styles.field}>
            <label htmlFor="tt-mail">Correo electrónico</label>
            <input id="tt-mail" type="email" value={mail} onChange={(e) => setMail(e.target.value)} placeholder="tu@correo.com" />
          </div>
          <div className={styles.field}>
            <label htmlFor="tt-pass">Contraseña</label>
            <PasswordField id="tt-pass" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </div>
          <button className="btn btn-solid" type="submit" disabled={cargando}>
            {cargando ? "Un momento…" : modo === "crear" ? "Crear cuenta" : "Entrar"}
          </button>
        </form>
        <div className={styles.divisor}>
          <span>o</span>
        </div>
        <button className={`btn ${styles.googleBtn}`} type="button" disabled={cargando} onClick={conGoogle}>
          Continuar con Google
        </button>
        {aviso && <p className={styles.aviso}>{aviso}</p>}
        {error && <p className={styles.error}>{error}</p>}
        <button className={`${styles.volver} ${styles.salir}`} type="button" onClick={onVolver} style={{ marginLeft: 0 }}>
          ← Volver
        </button>
      </div>
    </div>
  );
}

// -- Panel del recolector ----------------------------------------------------

const COLUMNAS: { key: string; label: string }[] = [
  { key: "postulado", label: "Postulado" },
  { key: "llamado", label: "Te llamaron" },
  { key: "confirmado", label: "Confirmado" },
];

function Panel({ bundle, onRecargar, onSalir }: { bundle: TerratalentoBundle; onRecargar: () => void; onSalir: () => void }) {
  const p = bundle.perfil;
  const [editando, setEditando] = useState(!p);
  const [nombre, setNombre] = useState(p?.nombre ?? "");
  const [cedula, setCedula] = useState(p?.cedula ?? "");
  const [celular, setCelular] = useState(p?.celular ?? "");
  const [whatsapp, setWhatsapp] = useState(p?.whatsapp ?? true);
  const [departamento, setDepartamento] = useState(p?.departamento ?? "Santander");
  const [municipio, setMunicipio] = useState(p?.municipio ?? "");
  const [experiencia, setExperiencia] = useState(p?.experienciaAnios?.toString() ?? "");
  const [notas, setNotas] = useState(p?.notas ?? "");
  const [emerNombre, setEmerNombre] = useState(p?.contactoEmergenciaNombre ?? "");
  const [emerCelular, setEmerCelular] = useState(p?.contactoEmergenciaCelular ?? "");
  const [medioPago, setMedioPago] = useState(p?.medioPago ?? "");
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setOcupado(true);
    setError(null);
    const res = await guardarPerfilRecolector({
      nombre, cedula, celular, whatsapp, departamento, municipio, experienciaAnios: experiencia, notas,
      contactoEmergenciaNombre: emerNombre, contactoEmergenciaCelular: emerCelular, medioPago,
    });
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditando(false);
    onRecargar();
  };

  const toggleDisponible = async () => {
    if (!p) return;
    setOcupado(true);
    await setDisponibleRecolector(!p.disponible);
    setOcupado(false);
    onRecargar();
  };

  return (
    <div className={styles.panelWrap}>
      <div className={styles.panelHead}>
        <h1>{p ? `Hola, ${p.nombre.split(" ")[0]}` : "Completa tu perfil"}</h1>
        <span className={styles.panelMail}>{bundle.correo}</span>
        <RedSwitcher actual="tt" compact />
        <button className={styles.salir} type="button" onClick={onSalir}>
          Cerrar sesion
        </button>
      </div>

      {(!p || editando) && (
        <div className={styles.card}>
          <h2>Tu perfil de recolector</h2>
          <p className={styles.cardSub}>
            Con esto las fincas y CTC saben a quien llamar. Se llena una sola vez; lo puedes editar cuando quieras.
          </p>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label htmlFor="pf-nombre">Nombre completo *</label>
              <input id="pf-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-cedula">Cedula</label>
              <input id="pf-cedula" value={cedula} onChange={(e) => setCedula(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-celular">Celular *</label>
              <input id="pf-celular" value={celular} onChange={(e) => setCelular(e.target.value)} placeholder="300 000 0000" />
            </div>
            <div className={styles.check}>
              <input id="pf-wa" type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
              <label htmlFor="pf-wa">Tiene WhatsApp</label>
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-depto">Departamento *</label>
              <input id="pf-depto" value={departamento} onChange={(e) => setDepartamento(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-mun">Municipio *</label>
              <input id="pf-mun" value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-exp">Anos de experiencia recolectando</label>
              <input id="pf-exp" type="number" min={0} max={80} value={experiencia} onChange={(e) => setExperiencia(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-pago">Como prefieres que te paguen?</label>
              <input id="pf-pago" value={medioPago} onChange={(e) => setMedioPago(e.target.value)} placeholder="Nequi, efectivo, cuenta..." />
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-emer">Contacto de emergencia</label>
              <input id="pf-emer" value={emerNombre} onChange={(e) => setEmerNombre(e.target.value)} placeholder="Nombre" />
            </div>
            <div className={styles.field}>
              <label htmlFor="pf-emer-cel">Celular de ese contacto</label>
              <input id="pf-emer-cel" value={emerCelular} onChange={(e) => setEmerCelular(e.target.value)} />
            </div>
            <div className={`${styles.field} ${styles.wide}`}>
              <label htmlFor="pf-notas">Algo mas que deban saber (opcional)</label>
              <textarea id="pf-notas" rows={3} value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Cultivos que conoces, cuadrilla, disponibilidad de viaje..." />
            </div>
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.jorFoot}>
            <button className="btn btn-solid" type="button" disabled={ocupado} onClick={guardar}>
              {ocupado ? "Guardando..." : "Guardar perfil"}
            </button>
            {p && (
              <button className="btn" type="button" onClick={() => setEditando(false)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      )}

      {p && !editando && (
        <div className={styles.card}>
          <h2>Tu perfil</h2>
          <p className={styles.cardSub}>
            {p.nombre} - {p.celular}
            {p.whatsapp && " (WhatsApp)"} - {p.municipio}, {p.departamento}
            {p.experienciaAnios !== null && ` - ${p.experienciaAnios} ano${p.experienciaAnios === 1 ? "" : "s"} de experiencia`}
          </p>
          <div className={styles.jorFoot}>
            <span className={`${styles.chip} ${p.disponible ? styles.chipOk : styles.chipOff}`}>
              {p.disponible ? "Disponible para llamados" : "En pausa"}
            </span>
            <button className="btn btn-sm" type="button" disabled={ocupado} onClick={toggleDisponible}>
              {p.disponible ? "Pausar mi disponibilidad" : "Volver a estar disponible"}
            </button>
            <button className="btn btn-sm" type="button" onClick={() => setEditando(true)}>
              Editar perfil
            </button>
          </div>
        </div>
      )}

      {p && bundle.misPostulaciones.length > 0 && (
        <div className={styles.card}>
          <h2>Mis postulaciones</h2>
          <p className={styles.cardSub}>Tu propio proceso: donde va cada jornada a la que te postulaste.</p>
          <div className={styles.tablero}>
            {COLUMNAS.map((c) => {
              const col = bundle.misPostulaciones.filter((j) => j.miPostulacion === c.key);
              return (
                <div className={styles.col} key={c.key}>
                  <div className={styles.colHead}>
                    <h3>{c.label}</h3>
                    <span className={styles.colCount}>{col.length}</span>
                  </div>
                  {col.length === 0 ? (
                    <p className={styles.colEmpty}>-</p>
                  ) : (
                    col.map((j) => <JornadaCard key={j.id} j={j} onRecargar={onRecargar} compacta />)
                  )}
                </div>
              );
            })}
          </div>
          {bundle.misPostulaciones.some((j) => j.miPostulacion === "descartado") && (
            <p className={styles.cardSub} style={{ marginTop: 12, marginBottom: 0 }}>
              Alguna de tus postulaciones no siguio esta vez. Sigue disponible: entran jornadas nuevas cada cosecha.
            </p>
          )}
        </div>
      )}

      {p && (
        <div className={styles.card}>
          <h2>Jornadas abiertas</h2>
          <p className={styles.cardSub}>
            Las jornadas de las fincas de la red. Revisa los terminos, marca que los entiendes y postulate - CTC hace
            el llamado.
          </p>
          {bundle.abiertas.length === 0 ? (
            <p className={styles.cardSub} style={{ marginBottom: 0 }}>
              No hay jornadas abiertas en este momento. Tu perfil ya queda visible para la proxima.
            </p>
          ) : (
            bundle.abiertas.map((j) => <JornadaCard key={j.id} j={j} onRecargar={onRecargar} />)
          )}
        </div>
      )}
    </div>
  );
}
