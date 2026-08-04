"use client";

// ── Coffeed · Identidad de marca ─────────────────────────────────────────────
// La guía estética que fuerza que TODOS los outputs se vean de la misma
// familia: el post renderizado (postTemplate.ts la lee), el muro de KR/CP/DC y
// el contexto que reciben los agentes (la dirección de arte viaja en el prompt).
// No es decoración: es lo que evita que veinte capítulos parezcan de veinte
// marcas distintas.

import { useRef, useState } from "react";
import { putSignedUrlWithProgress } from "@/lib/kaffetalMedia";
import { clearBrandLogo, prepareBrandLogoUpload, saveBrand, setBrandLogo } from "@/lib/coffeed/ecpActions";
import { COFFEED_BASE_COLORS, COFFEED_FONTS, COFFEED_PALETTE_MAX, coffeedFontStack, type CoffeedBrand, type CoffeedResult } from "@/lib/coffeed/types";
import styles from "./coffeedConsole.module.css";
import { Ring } from "./Ring";

const DEFAULT_NEW = "#7A8C55";

export function CoffeedBrandPanel({
  brand,
  busy,
  run,
  refresh,
  showToast,
}: {
  brand: CoffeedBrand;
  busy: boolean;
  run: (fn: () => Promise<CoffeedResult>, okMsg?: [string, string]) => Promise<boolean>;
  refresh: () => Promise<void>;
  showToast: (kicker: string, msg: string) => void;
}) {
  const [companyName, setCompanyName] = useState(brand.companyName);
  const [slogan, setSlogan] = useState(brand.slogan ?? "");
  const [palette, setPalette] = useState<string[]>(brand.palette.length ? brand.palette : ["#15201B"]);
  const [fontFamily, setFontFamily] = useState(brand.fontFamily);
  const [artDirection, setArtDirection] = useState(brand.artDirection ?? "");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const setColor = (i: number, v: string) => setPalette((p) => p.map((c, j) => (j === i ? v.toUpperCase() : c)));
  const addColor = () => setPalette((p) => (p.length >= COFFEED_PALETTE_MAX ? p : [...p, DEFAULT_NEW]));
  const removeColor = (i: number) => setPalette((p) => (p.length <= 1 ? p : p.filter((_, j) => j !== i)));

  const save = () =>
    run(() => saveBrand({ companyName, slogan, palette, fontFamily, artDirection }), [
      "Identidad guardada",
      "Los próximos posts y el muro se renderizan con esta guía.",
    ]);

  async function uploadLogo(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      showToast("Muy pesado", "El logo debe pesar menos de 5 MB.");
      return;
    }
    setUploading(true);
    setProgress(0);
    const prep = await prepareBrandLogoUpload(file.name);
    if (!prep.ok) {
      setUploading(false);
      showToast("No se pudo", prep.error);
      return;
    }
    const put = await putSignedUrlWithProgress(prep.path, prep.token, file, setProgress);
    if (!put.ok) {
      setUploading(false);
      showToast("No se pudo", put.error);
      return;
    }
    const res = await setBrandLogo(prep.path);
    setUploading(false);
    if (!res.ok) {
      showToast("No se pudo", res.error);
      return;
    }
    await refresh();
    showToast("Logo actualizado", "Va empotrado en cada post que se renderice desde ahora.");
  }

  return (
    <section>
      <div className={styles.viewhead}>
        <span className={styles.eyebrow}>Guía estética</span>
        <h1>Identidad de marca</h1>
        <p>
          Lo que fuerza que todos los outputs se vean de la misma familia: el post descargable, el muro que ven Kaffetal Regal,
          Cherry Picked y el Directorio, y el contexto que reciben los agentes al escribir. La tipografía no fuerza todo el
          texto — solo los bloques estándar (titular, paneles, pie).
        </p>
      </div>

      <div className={styles.brandGrid}>
        <div className={styles.formCard}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Nombre de la empresa</span>
              <input className={styles.input} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span className={styles.eyebrow}>Slogan</span>
              <input className={styles.input} value={slogan} onChange={(e) => setSlogan(e.target.value)} placeholder="Una línea, la que va bajo el nombre" />
            </label>
          </div>

          <div className={styles.field}>
            <span className={styles.eyebrow}>Paleta · hasta {COFFEED_PALETTE_MAX} colores propios</span>
            <p className={styles.hint}>
              Blanco y negro están siempre disponibles y no ocupan sitio. El primer color es la tinta (textos y filetes); el
              tercero, si existe, es el acento de los rótulos.
            </p>
            <div className={styles.swatches}>
              {COFFEED_BASE_COLORS.map((c) => (
                <span className={styles.swatchWrap} key={c}>
                  <span className={styles.swatchLocked} style={{ background: c }} title="Siempre disponible" />
                  <span className={styles.swatchLabel}>fijo</span>
                </span>
              ))}
              {palette.map((c, i) => (
                <span className={styles.swatchWrap} key={i}>
                  <input
                    className={styles.swatch}
                    type="color"
                    value={c}
                    aria-label={`Color ${i + 1}`}
                    onChange={(e) => setColor(i, e.target.value)}
                  />
                  <button className={styles.swatchLabel} type="button" onClick={() => removeColor(i)} style={{ background: "none", border: 0, textDecoration: "underline" }}>
                    quitar
                  </button>
                </span>
              ))}
              {palette.length < COFFEED_PALETTE_MAX && (
                <button className={`${styles.btn} ${styles.btnQuiet} ${styles.btnSm}`} type="button" onClick={addColor}>
                  + Color
                </button>
              )}
            </div>
          </div>

          <label className={styles.field}>
            <span className={styles.eyebrow}>Tipografía principal</span>
            <select className={styles.input} value={fontFamily} onChange={(e) => setFontFamily(e.target.value)}>
              {COFFEED_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.eyebrow}>Dirección de arte · instrucciones generales</span>
            <textarea
              className={styles.input}
              value={artDirection}
              onChange={(e) => setArtDirection(e.target.value)}
              placeholder="Qué se ve y qué no: tipo de fotografía, densidad, qué evitar. Esto viaja con cada prompt."
            />
            <p className={styles.hint}>Este texto entra como contexto en la extracción, las propuestas y la redacción del post.</p>
          </label>

          <div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={busy} onClick={save}>
              Guardar identidad
            </button>
          </div>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <div className={styles.logoBox}>
            {brand.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed Supabase URL
              <img src={brand.logoUrl} alt="Logo de la marca" />
            ) : (
              <span className={styles.eyebrow}>Sin logo</span>
            )}
            {uploading ? (
              <span className={styles.ringRow}>
                <Ring /> Subiendo… {Math.round(progress * 100)}%
              </span>
            ) : (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => fileRef.current?.click()}>
                  {brand.logoUrl ? "Cambiar logo" : "Subir logo"}
                </button>
                {brand.logoUrl && (
                  <button className={`${styles.btn} ${styles.btnStamp} ${styles.btnSm}`} disabled={busy} onClick={() => run(clearBrandLogo)}>
                    Quitar
                  </button>
                )}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.target.value = "";
              }}
            />
            <p className={styles.hint}>PNG, JPG, SVG o WebP · máx. 5 MB. Se empotra en base64 en cada post para que el archivo descargado sea autosuficiente.</p>
          </div>

          <div className={styles.preview} style={{ fontFamily: coffeedFontStack(fontFamily) }}>
            <span className={styles.eyebrow}>Vista previa</span>
            <div className={styles.previewBar}>
              {[...palette, ...COFFEED_BASE_COLORS].slice(0, 7).map((c, i) => (
                <span key={i} style={{ background: c }} />
              ))}
            </div>
            <div className={styles.previewName} style={{ color: palette[0] ?? "#15201B" }}>
              {companyName || "Nombre de la empresa"}
            </div>
            {slogan && <div className={styles.previewSlogan}>{slogan}</div>}
            <div style={{ borderTop: `2px solid ${palette[0] ?? "#15201B"}`, paddingTop: 8, fontSize: 13 }}>
              <b style={{ color: palette[2] ?? palette[1] ?? "#A3241B" }}>CAPÍTULO 12</b>
              <div style={{ fontWeight: 700, fontSize: 17, lineHeight: 1.15, marginTop: 4 }}>Así se verá el titular de cada post</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
