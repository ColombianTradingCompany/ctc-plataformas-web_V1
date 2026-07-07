"use client";

import { createContext, useContext, useState } from "react";
import { Modal } from "@/components/Modal";
import { useToast } from "@/components/Toast";
import styles from "./ContactModal.module.css";

type FormKey = "general" | "tech" | "cocreate" | "varietales";

const MAIL = "info@ctcexport.com";

const ContactModalContext = createContext<{
  openForm: (key: FormKey) => void;
} | null>(null);

export function useContactModal() {
  const ctx = useContext(ContactModalContext);
  if (!ctx) throw new Error("useContactModal must be used within ContactModalProvider");
  return ctx;
}

function gv(fd: FormData, key: string) {
  const v = (fd.get(key) as string | null)?.trim();
  return v && v.length ? v : "—";
}

export function ContactModalProvider({ children }: { children: React.ReactNode }) {
  const [openKey, setOpenKey] = useState<FormKey | null>(null);
  const { showToast } = useToast();

  const close = () => setOpenKey(null);

  function sendMail(key: FormKey, form: HTMLFormElement) {
    const fd = new FormData(form);
    let subject = "";
    let lines: string[] = [];

    if (key === "general") {
      const temaSelect = form.elements.namedItem("tema") as HTMLSelectElement;
      subject = "CTC · Consulta general";
      lines = [
        "Nombre: " + gv(fd, "nombre"),
        "Organización: " + gv(fd, "org"),
        "Tema: " + (temaSelect?.selectedOptions[0]?.text ?? "Consulta general"),
        "",
        gv(fd, "msg"),
      ];
    } else if (key === "tech") {
      const ints = fd.getAll("interes").join(", ") || "—";
      subject = "CTC Tech · Solicitud de diagnóstico";
      lines = [
        "Nombre: " + gv(fd, "nombre"),
        "Finca/organización: " + gv(fd, "finca"),
        "Ubicación: " + gv(fd, "ubicacion"),
        "Tecnologías de interés: " + ints,
        "",
        "Proceso actual:",
        gv(fd, "msg"),
      ];
    } else if (key === "cocreate") {
      subject = "CTC Co-Create · Propuesta de proyecto";
      lines = [
        "Nombre: " + gv(fd, "nombre"),
        "Empresa/marca: " + gv(fd, "marca"),
        "Mercado: " + gv(fd, "mercado"),
        "Canal: " + gv(fd, "canal"),
        "Formato: " + gv(fd, "formato"),
        "Volumen estimado: " + gv(fd, "vol") + " kg/año",
        "",
        "El proyecto:",
        gv(fd, "msg"),
      ];
    } else if (key === "varietales") {
      subject = "Varietales Registrados · Solicitud de catálogo";
      lines = [
        "Nombre: " + gv(fd, "nombre"),
        "Finca: " + gv(fd, "finca"),
        "Ubicación: " + gv(fd, "ubicacion"),
        "Varietal de interés: " + gv(fd, "varietal"),
        "Cantidad de chapolas: " + gv(fd, "cantidad"),
        "",
        gv(fd, "msg"),
      ];
    }

    window.location.href =
      "mailto:" + MAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
    showToast("Abriendo tu aplicación de correo con el mensaje listo…");
    close();
  }

  return (
    <ContactModalContext.Provider value={{ openForm: setOpenKey }}>
      {children}
      <Modal open={openKey !== null} onClose={close} ariaLabel="Formulario de contacto">
        {openKey === "general" && (
          <div>
            <h3>Escríbenos</h3>
            <p>Cuéntanos quién eres y qué necesitas. Al enviar, se abrirá tu correo con el mensaje listo para info@ctcexport.com.</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                sendMail("general", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="g-nombre">Nombre</label>
                  <input id="g-nombre" name="nombre" placeholder="Su nombre" />
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
                    if (e.target.value !== "general") setOpenKey(e.target.value as FormKey);
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
              <button className="btn btn-solid" type="submit">
                Enviar correo ✉
              </button>
              <span className={styles.hint}>Se abre tu aplicación de correo con todo diligenciado.</span>
            </form>
          </div>
        )}

        {openKey === "tech" && (
          <div>
            <h3>CTC Tech · Agendar diagnóstico</h3>
            <p>Un diagnóstico en finca para definir qué tecnología aplica a su beneficio y su presupuesto.</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                sendMail("tech", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="t-nombre">Nombre</label>
                  <input id="t-nombre" name="nombre" placeholder="Su nombre" />
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
                  {["Ozono + UV", "Técnicas de fermentación", "Selección óptica", "Cromatografía de suelos", "Instrumentación de medición"].map(
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
                <textarea id="t-msg" name="msg" placeholder="Volumen, beneficio actual, retos…" />
              </div>
              <button className="btn btn-solid" type="submit">
                Enviar correo ✉
              </button>
              <span className={styles.hint}>Se abre tu aplicación de correo con todo diligenciado.</span>
            </form>
          </div>
        )}

        {openKey === "cocreate" && (
          <div>
            <h3>CTC Co-Create · Proponer un proyecto</h3>
            <p>Cuéntanos de tu funnel de demanda y armamos la mesa de trabajo.</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                sendMail("cocreate", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="c-nombre">Nombre</label>
                  <input id="c-nombre" name="nombre" placeholder="Tu nombre" />
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
                <textarea id="c-msg" name="msg" placeholder="Etapa del funnel, calidades buscadas, tiempos…" />
              </div>
              <button className="btn btn-solid" type="submit">
                Enviar correo ✉
              </button>
              <span className={styles.hint}>Sujeto a volúmenes mínimos requeridos · calidades respaldadas por la Arena.</span>
            </form>
          </div>
        )}

        {openKey === "varietales" && (
          <div>
            <h3>Varietales Registrados · Solicitar catálogo</h3>
            <p>Genética verificada en estado de chapola. Mínimo 100 unidades · $150–$300 COP c/u según varietal.</p>
            <form
              className={styles.fform}
              onSubmit={(e) => {
                e.preventDefault();
                sendMail("varietales", e.currentTarget);
              }}
            >
              <div className={styles.row2}>
                <div>
                  <label htmlFor="v-nombre">Nombre</label>
                  <input id="v-nombre" name="nombre" placeholder="Su nombre" />
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
                <textarea id="v-msg" name="msg" placeholder="Perfil de taza objetivo, fecha de siembra…" />
              </div>
              <button className="btn btn-solid" type="submit">
                Enviar correo ✉
              </button>
              <span className={styles.hint}>Se abre tu aplicación de correo con todo diligenciado.</span>
            </form>
          </div>
        )}
      </Modal>
    </ContactModalContext.Provider>
  );
}
