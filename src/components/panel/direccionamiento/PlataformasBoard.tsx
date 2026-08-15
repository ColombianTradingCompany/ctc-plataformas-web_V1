"use client";

// ── ECP · Direccionamiento · Manejo de Plataformas ───────────────────────────
// Las 19 superficies de la red, juntas, con el título y la descripción que cada
// una le enseña a un buscador. Que estén JUNTAS es medio módulo: hasta hoy esos
// textos vivían escritos a mano en 14 `page.tsx` distintos y no había forma de
// verlos en la misma pantalla — ni de notar que dos decían casi lo mismo, que es
// como se reparte la autoridad entre páginas que deberían turnarse.
//
// Editar aquí es una EXCEPCIÓN, no una copia: en blanco manda lo que declara el
// código, y por eso el campo enseña ese valor como marca de agua en vez de
// precargarlo. Precargarlo convertiría cada visita a esta pantalla en una
// bifurcación silenciosa del texto.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { guardarSuperficie, type FilaHerramienta, type FilaSuperficie } from "@/app/ecp/(app)/direccionamiento/plataformasActions";
import styles from "@/app/bcp/(app)/shared.module.css";

const LARGO_IDEAL = { min: 120, max: 160 };

function Semaforo({ n }: { n: number }) {
  if (n === 0) return <span style={{ ...pill, background: "#FEE2E2", color: "#991B1B" }}>sin descripción</span>;
  if (n < LARGO_IDEAL.min) return <span style={{ ...pill, background: "#FEF3C7", color: "#92400E" }}>{n} · corta</span>;
  if (n > LARGO_IDEAL.max) return <span style={{ ...pill, background: "#FEF3C7", color: "#92400E" }}>{n} · larga</span>;
  return <span style={{ ...pill, background: "#DCFCE7", color: "#166534" }}>{n} ✓</span>;
}

export function PlataformasBoard({
  superficies,
  herramientas,
}: {
  superficies: FilaSuperficie[];
  herramientas: FilaHerramienta[];
}) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const sinDescripcion = herramientas.filter((h) => h.indexable && !h.metaDescription).length;
  const indexables = herramientas.filter((h) => h.indexable).length;

  function guardar(f: FilaSuperficie) {
    setMsg(null);
    start(async () => {
      const res = await guardarSuperficie(f);
      if (res.ok) {
        setMsg({ ok: true, text: `«${f.route}» guardada ✓` });
        router.refresh();
      } else setMsg({ ok: false, text: res.error });
    });
  }

  return (
    <div>
      <h1 className={styles.title}>Manejo de Plataformas</h1>
      <p className={styles.subtitle}>
        Cómo se presenta cada superficie de la red hacia afuera. Lo que se escribe aquí <b>pisa</b> lo que declara el
        código; dejarlo en blanco devuelve el mando al código, que es lo que dice la marca de agua de cada campo.
      </p>

      <div style={{ ...caja, marginTop: 14 }}>
        <p style={{ margin: 0, fontSize: 13.5 }}>
          <b>El canonical de toda la red apunta a <code>www.ctcexport.com</code> + la ruta</b> (decisión del owner,
          2026-08-15). No hay interruptor por superficie a propósito: es una decisión de red, y poder romperla de a una
          sería exactamente la forma de deshacerla sin darse cuenta.
        </p>
      </div>

      {msg && (
        <p style={{ fontSize: 13, fontWeight: 600, color: msg.ok ? "var(--primary)" : "#B45309", margin: "12px 0 0" }}>
          {msg.text}
        </p>
      )}

      <div style={{ ...caja, marginTop: 16 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Superficies ({superficies.length})</h2>
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 620 }}>
            <thead>
              <tr>
                <th style={th}>Superficie</th>
                <th style={th}>Título</th>
                <th style={{ ...th, width: 130 }}>Descripción</th>
                <th style={{ ...th, textAlign: "center", width: 90 }}>Sitemap</th>
                <th style={{ ...th, width: 90 }} />
              </tr>
            </thead>
            <tbody>
              {superficies.map((s) => (
                <Fila
                  key={s.route}
                  s={s}
                  abierta={abierta === s.route}
                  onToggle={() => setAbierta(abierta === s.route ? null : s.route)}
                  onGuardar={guardar}
                  pending={pending}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── El inventario que abrió el tema ── */}
      <div style={{ ...caja, marginTop: 20 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Herramientas indexables</h2>
        <p className={styles.subtitle} style={{ marginTop: 6 }}>
          Los HTML de <code>public/tools/</code> son URLs públicas que un buscador puede indexar, así que su título es
          un titular más de la red. <b>{indexables - sinDescripcion} de {indexables}</b> llevan descripción.
          {sinDescripcion > 0 && " Las que faltan se corrigen DENTRO del archivo — su <title> y su <meta> viven en el propio HTML, no aquí."}
        </p>
        <p className={styles.meta} style={{ marginTop: 8 }}>
          La descripción que se escribe en la ficha de una herramienta (ECP → Herramientas del café) manda sobre las
          versiones <b>subidas</b>, que sirve la plataforma. Sobre las heredadas del repositorio no puede mandar: ese
          archivo lo entrega la CDN tal cual está escrito.
        </p>
        <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
          {herramientas.map((h) => (
            <li key={h.id}>
              <b>{h.nombre}</b>{" "}
              {h.indexable ? (
                <span style={{ ...pill, background: "#F1F5F9", color: "#334155" }}>{h.srcPublico}</span>
              ) : (
                <span style={{ ...pill, background: "#EEF2FF", color: "#3730A3" }}>
                  {h.origen === "subida" ? "servida por la plataforma · noindex" : "sin versión publicada"}
                </span>
              )}{" "}
              {h.indexable && !h.metaDescription && (
                <span style={{ ...pill, background: "#FEE2E2", color: "#991B1B" }}>sin descripción</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Fila({
  s,
  abierta,
  onToggle,
  onGuardar,
  pending,
}: {
  s: FilaSuperficie;
  abierta: boolean;
  onToggle: () => void;
  onGuardar: (f: FilaSuperficie) => void;
  pending: boolean;
}) {
  const [f, setF] = useState<FilaSuperficie>(s);
  const set = <K extends keyof FilaSuperficie>(k: K, v: FilaSuperficie[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <>
      <tr style={abierta ? { background: "var(--bg-soft, rgba(0,0,0,.03))" } : undefined}>
        <td style={td}>
          <b>{s.route}</b>
          <br />
          <span className={styles.meta}>{s.subdominio ? `${s.subdominio}.ctcexport.com` : "casa matriz"}</span>
        </td>
        <td style={td}>
          {s.title ? (
            <span>{s.title}</span>
          ) : (
            <span className={styles.meta}>— lo declara el código —</span>
          )}
        </td>
        <td style={td}>
          {s.description ? <Semaforo n={s.description.length} /> : <span className={styles.meta}>del código</span>}
        </td>
        <td style={{ ...td, textAlign: "center" }}>{s.enSitemap ? "●" : "·"}</td>
        <td style={td}>
          <button className="btn btn-sm" onClick={onToggle} aria-expanded={abierta}>
            {abierta ? "Cerrar" : "Editar"}
          </button>
        </td>
      </tr>
      {abierta && (
        <tr>
          <td style={{ ...td, padding: 14 }} colSpan={5}>
            <label style={campo}>
              <span style={etiqueta}>Título</span>
              <input
                value={f.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="En blanco: manda el que declara su page.tsx"
                style={input}
              />
            </label>
            <label style={{ ...campo, marginTop: 10 }}>
              <span style={etiqueta}>Descripción</span>
              <textarea
                value={f.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                placeholder="En blanco: manda la que declara su page.tsx"
                style={input}
              />
              <span className={styles.meta}>
                {f.description.length} caracteres · lo cómodo son {LARGO_IDEAL.min}–{LARGO_IDEAL.max}.
              </span>
            </label>
            <label style={{ ...campo, marginTop: 10 }}>
              <span style={etiqueta}>Nota interna</span>
              <input
                value={f.notas}
                onChange={(e) => set("notas", e.target.value)}
                placeholder="Por qué se cambió, o qué falta"
                style={input}
              />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, fontSize: 13 }}>
              <input type="checkbox" checked={f.enSitemap} onChange={(e) => set("enSitemap", e.target.checked)} />
              Anunciarla en el sitemap de la casa matriz
            </label>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-sm btn-solid" disabled={pending} onClick={() => onGuardar(f)}>
                Guardar superficie
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

const caja: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  padding: 20,
};
const th: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "2px solid var(--line)",
  fontFamily: "var(--font-spline-mono), monospace",
  fontSize: 10.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--muted)",
};
const td: React.CSSProperties = { padding: "8px", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
const pill: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 7px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 600,
};
const campo: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3 };
const etiqueta: React.CSSProperties = {
  fontFamily: "var(--font-spline-mono), monospace",
  fontSize: 10.5,
  letterSpacing: ".06em",
  textTransform: "uppercase",
  color: "var(--muted)",
};
const input: React.CSSProperties = {
  padding: "6px 8px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  fontSize: 13,
  fontFamily: "inherit",
  background: "var(--card)",
  color: "inherit",
  width: "100%",
};
