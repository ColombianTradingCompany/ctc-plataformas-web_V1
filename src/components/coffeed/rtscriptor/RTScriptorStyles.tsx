"use client";

/* ── RT-Scriptor · la hoja de estilo del prototipo ───────────────────────────
   MISMA desviación deliberada que Datawave (ver DatawaveStyles.tsx): la hoja
   viene del artifact con ~300 usos de clases `rt-*` ya namespaceadas bajo
   `.rt-root`. Pasarla a CSS Modules sería un renombrado mecánico enorme sin
   ganancia y rompería la posibilidad de diffear contra el prototipo.

   DOS cambios respecto al original, los dos a propósito:
     · fuera el `@import` de Google Fonts — ninguna otra superficie de la
       plataforma trae tipografías de un tercero en tiempo de ejecución, y una
       hoja que se bloquea esperando a fonts.googleapis.com es una hoja que
       parpadea. Se mapean a pilas del sistema; la del guion sigue siendo
       Courier, que es lo único que un guion literario no puede negociar.
     · el bloque final es NUEVO: los seis añadidos de la V1 (tomas con
       duración, voz en off, tres fotos por personaje, guion editable con sus
       propuestas, filtro de serie, tira de fotogramas).                        */

export function RTScriptorStyles() {
  return (
    <style>{`
.rt-root{
  --slate:#14191A; --panel:#1E2526; --panel2:#273031; --edge:#38403F; --edge2:#2C3435;
  --bone:#EDE9DF; --dim:#C9C6BD; --mute:#8E9793; --faint:#5C6766;
  --grease:#E4472C; --signal:#4DD0C4; --amber:#E0A73C; --ok:#6FBF6A;
  --mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  --sans: ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
  --cond: "Oswald", "Segoe UI Semibold", ui-sans-serif, system-ui, sans-serif;
  --script: "Courier New", Courier, monospace;
  background:var(--slate); color:var(--bone); min-height:100vh;
  font-family:var(--sans); -webkit-font-smoothing:antialiased; padding-bottom:64px;
}
.rt-root *{box-sizing:border-box;}
.rt-root button{font-family:inherit;color:inherit;}
.rt-wrap{max-width:1280px;margin:0 auto;padding:0 16px;}
.rt-mono{font-family:var(--mono);}
.rt-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.rt-sp{margin-left:auto;}

.rt-slate{border-bottom:1px solid var(--edge);
  background:repeating-linear-gradient(115deg,#0F1314 0 22px,#1A2021 22px 44px);}
.rt-slate-in{max-width:1280px;margin:0 auto;padding:12px 16px;display:flex;align-items:center;
  gap:16px;flex-wrap:wrap;}
.rt-mark{font-family:var(--cond);font-weight:600;letter-spacing:.16em;font-size:22px;
  line-height:1;text-transform:uppercase;background:none;border:0;padding:0;cursor:pointer;}
.rt-mark span{color:var(--grease);}
.rt-tag{font-family:var(--mono);font-size:10px;color:var(--mute);
  letter-spacing:.12em;text-transform:uppercase;margin-top:5px;}
.rt-readout{display:flex;border:1px solid var(--edge);}
.rt-readout div{padding:5px 11px;border-right:1px solid var(--edge);}
.rt-readout div:last-child{border-right:0;}
.rt-readout b{display:block;font-size:13px;font-weight:500;font-family:var(--mono);}
.rt-readout i{font-style:normal;color:var(--mute);font-size:9px;letter-spacing:.16em;
  text-transform:uppercase;font-family:var(--mono);}

.rt-btn{background:transparent;border:1px solid var(--edge);color:var(--mute);cursor:pointer;
  font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;
  padding:7px 12px;transition:border-color .15s,color .15s;}
.rt-btn:hover{border-color:var(--mute);color:var(--bone);}
.rt-btn[data-on="1"]{border-color:var(--signal);color:var(--signal);}
.rt-btn[data-tone="go"]{background:var(--grease);border-color:var(--grease);color:#12100F;font-weight:500;}
.rt-btn[data-tone="go"]:hover{filter:brightness(1.1);color:#12100F;}
.rt-btn:disabled{opacity:.4;cursor:not-allowed;}
.rt-btn:focus-visible,.rt-tab:focus-visible{outline:2px solid var(--signal);outline-offset:2px;}
.rt-seg{display:flex;border:1px solid var(--edge);}
.rt-seg button{background:transparent;border:0;border-right:1px solid var(--edge);cursor:pointer;
  font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;
  padding:7px 12px;color:var(--mute);}
.rt-seg button:last-child{border-right:0;}
.rt-seg button[data-on="1"]{background:var(--panel2);color:var(--bone);}

.rt-tabs{display:flex;gap:2px;margin:12px 0 18px;border-bottom:1px solid var(--edge);overflow-x:auto;}
.rt-tab{background:transparent;border:0;border-bottom:2px solid transparent;color:var(--mute);
  font-family:var(--cond);font-weight:500;letter-spacing:.13em;text-transform:uppercase;
  font-size:12.5px;padding:12px 14px;cursor:pointer;white-space:nowrap;display:flex;gap:7px;
  align-items:baseline;}
.rt-tab:hover{color:var(--bone);}
.rt-tab[data-on="1"]{color:var(--bone);border-bottom-color:var(--grease);}
.rt-tab em{font-style:normal;font-family:var(--mono);font-size:10px;color:var(--faint);}

.rt-card{background:var(--panel);border:1px solid var(--edge);}
.rt-head{display:flex;align-items:center;gap:9px;padding:10px 13px;border-bottom:1px solid var(--edge);
  flex-wrap:wrap;}
.rt-head h2{margin:0;font-family:var(--cond);font-weight:500;font-size:12.5px;
  letter-spacing:.18em;text-transform:uppercase;}
.rt-head p{margin:0;font-size:11px;color:var(--mute);font-family:var(--mono);}
.rt-body{padding:13px;}
.rt-note{font-size:12px;color:var(--mute);line-height:1.55;}
.rt-label{font-family:var(--cond);font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;
  margin:0 0 8px;border-bottom:1px solid var(--edge);padding-bottom:6px;display:flex;gap:8px;
  align-items:center;}
.rt-label span{margin-left:auto;font-family:var(--mono);font-size:10px;color:var(--mute);}
.rt-chip{font-family:var(--mono);font-size:10px;border:1px solid var(--edge);
  padding:2px 7px;color:var(--mute);white-space:nowrap;}

.rt-infowrap{position:relative;display:inline-flex;vertical-align:middle;}
.rt-info{width:15px;height:15px;border-radius:50%;border:1px solid var(--faint);background:transparent;
  color:var(--mute);font-family:var(--mono);font-size:9px;line-height:1;cursor:pointer;
  display:grid;place-items:center;padding:0;flex:0 0 15px;}
.rt-info:hover{border-color:var(--signal);color:var(--signal);}
.rt-pop{position:absolute;top:21px;left:-6px;width:270px;max-width:calc(100vw - 32px);background:#0E1213;border:1px solid var(--signal);
  padding:11px 13px 12px;font-size:12px;line-height:1.55;color:var(--dim);z-index:60;
  box-shadow:0 12px 32px rgba(0,0,0,.55);text-transform:none;letter-spacing:0;font-weight:400;
  font-family:var(--sans);text-align:left;}
.rt-pop[data-side="right"]{left:auto;right:-6px;}
.rt-pop b{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--signal);margin-bottom:5px;}

.rt-scrim{position:fixed;inset:0;background:rgba(8,11,12,.78);z-index:80;display:flex;
  align-items:flex-start;justify-content:center;padding:32px 16px;overflow:auto;}
.rt-sheet{background:var(--panel);border:1px solid var(--edge);width:100%;max-width:560px;}
.rt-sheet[data-wide="1"]{max-width:940px;}
.rt-sheet-h{display:flex;align-items:center;gap:9px;padding:13px 15px;border-bottom:1px solid var(--edge);}
.rt-sheet-h h3{margin:0;font-family:var(--cond);font-weight:500;font-size:13px;
  letter-spacing:.18em;text-transform:uppercase;}
.rt-x{margin-left:auto;background:none;border:0;color:var(--mute);font-size:20px;cursor:pointer;
  line-height:1;padding:0 2px;}
.rt-sheet-b{padding:15px;}
.rt-sheet-f{padding:12px 15px;border-top:1px solid var(--edge);display:flex;gap:8px;align-items:center;flex-wrap:wrap;}

.rt-field{margin-bottom:13px;}
.rt-field > label{display:flex;gap:7px;align-items:center;font-family:var(--mono);
  font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin-bottom:6px;}
.rt-in{width:100%;background:#171D1E;border:1px solid var(--edge);color:var(--bone);font:inherit;
  font-size:13px;padding:8px 10px;}
.rt-in:focus{outline:1px solid var(--signal);}
textarea.rt-in{resize:vertical;min-height:70px;line-height:1.55;}
.rt-pick{display:flex;flex-wrap:wrap;gap:6px;}
.rt-pk{background:transparent;border:1px solid var(--edge);color:var(--mute);cursor:pointer;
  font-family:var(--mono);font-size:10px;padding:5px 9px;letter-spacing:.06em;}
.rt-pk[data-on="1"]{color:#12100F;font-weight:500;}
.rt-sw{width:22px;height:22px;border:1px solid var(--edge);cursor:pointer;padding:0;}
.rt-sw[data-on="1"]{box-shadow:inset 0 0 0 2px var(--slate),0 0 0 1px var(--bone);}

.rt-flag{display:flex;gap:10px;align-items:flex-start;padding:9px 12px;margin-bottom:9px;
  border-left:2px solid var(--amber);background:#241F14;font-size:12px;line-height:1.5;color:var(--dim);}
.rt-flag b{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--amber);flex:0 0 auto;padding-top:1px;}
.rt-flag[data-kind="block"]{border-left-color:var(--grease);background:#25191A;}
.rt-flag[data-kind="block"] b{color:var(--grease);}

.rt-hubgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:12px;}
.rt-proj{background:var(--panel);border:1px solid var(--edge);text-align:left;cursor:pointer;padding:0;
  display:flex;flex-direction:column;transition:border-color .15s;}
.rt-proj:hover{border-color:var(--mute);}
.rt-proj-art{height:96px;border-bottom:1px solid var(--edge);background:#11181A;}
.rt-proj-b{padding:11px 12px 13px;}
.rt-proj-b h3{margin:0 0 4px;font-family:var(--cond);font-weight:500;font-size:15px;
  letter-spacing:.06em;text-transform:uppercase;}
.rt-proj-m{font-family:var(--mono);font-size:10px;color:var(--mute);letter-spacing:.06em;}
.rt-new{border:1px dashed var(--edge);background:transparent;color:var(--mute);cursor:pointer;
  min-height:190px;display:grid;place-items:center;font-family:var(--mono);font-size:11px;
  letter-spacing:.14em;text-transform:uppercase;}
.rt-new:hover{border-color:var(--signal);color:var(--signal);}

.rt-slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:8px;}
.rt-slot{aspect-ratio:1;border:1px solid var(--edge);position:relative;overflow:hidden;background:#141A1B;
  padding:0;cursor:pointer;}
.rt-slot img{width:100%;height:100%;object-fit:cover;display:block;}
.rt-slot u{position:absolute;left:0;right:0;bottom:0;background:rgba(10,13,14,.82);text-decoration:none;
  font-family:var(--mono);font-size:9px;color:var(--mute);padding:3px 5px;letter-spacing:.06em;}
.rt-slot-add{border-style:dashed;color:var(--mute);display:grid;place-items:center;font-size:22px;}
.rt-slot-add:hover{border-color:var(--signal);color:var(--signal);}

.rt-chartwrap{position:relative;}
.rt-lane-lbl{cursor:pointer;}
.rt-tt{pointer-events:none;}
.rt-scrub{width:100%;accent-color:var(--grease);}
.rt-ribbon{display:flex;gap:2px;width:100%;}
.rt-rb{border:1px solid var(--edge);border-bottom-width:2px;background:#171D1E;padding:6px 7px;
  cursor:pointer;min-width:0;overflow:hidden;text-align:left;}
.rt-rb[data-on="1"]{background:var(--panel2);border-color:var(--bone);}
.rt-rb b{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;}
.rt-rb u{display:block;text-decoration:none;font-size:9.5px;color:var(--faint);white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;margin-top:2px;}

.rt-cast{display:grid;grid-template-columns:1fr;gap:10px;}
.rt-castrow{display:flex;gap:12px;padding:12px;background:var(--panel);border:1px solid var(--edge);
  border-left:3px solid var(--edge);cursor:pointer;text-align:left;width:100%;transition:background .15s;}
.rt-castrow:hover{background:var(--panel2);}
.rt-port{width:60px;height:72px;flex:0 0 60px;border:1px solid var(--edge);background:#171D1E;overflow:hidden;}
.rt-port img{width:100%;height:100%;object-fit:cover;display:block;}
.rt-castmeta h3{margin:0 0 2px;font-family:var(--cond);font-weight:500;font-size:15px;
  letter-spacing:.06em;text-transform:uppercase;}
.rt-role{font-family:var(--mono);font-size:9.5px;letter-spacing:.13em;text-transform:uppercase;
  margin:0 0 7px;}
.rt-castmeta p{margin:0 0 8px;font-size:12.5px;line-height:1.5;color:var(--dim);}
.rt-chips{display:flex;flex-wrap:wrap;gap:5px;}

.rt-strip{background:#111516;border:1px solid var(--edge);overflow-x:auto;}
.rt-perf{height:11px;background-color:#0C0F10;
  background-image:radial-gradient(circle at 8px 5.5px,#2C3435 3px,transparent 3.5px);background-size:20px 11px;}
.rt-frames{display:flex;padding:8px;min-width:max-content;}
.rt-frame{position:relative;background:transparent;border:1px solid var(--edge);border-right:0;padding:0;
  width:96px;flex:0 0 96px;cursor:pointer;}
.rt-frame:last-of-type{border-right:1px solid var(--edge);}
.rt-frame small{position:absolute;left:5px;top:4px;font-family:var(--mono);font-size:9px;
  color:var(--mute);}
.rt-frame[data-on="1"] small{color:var(--grease);}
.rt-newtake{flex:0 0 56px;border:1px dashed var(--edge);background:transparent;color:var(--mute);
  margin-left:8px;cursor:pointer;font-size:19px;}
.rt-ring{position:absolute;inset:-9px -7px;pointer-events:none;}
.rt-ring path{fill:none;stroke:var(--grease);stroke-width:2.2;stroke-linecap:round;stroke-dasharray:540;
  stroke-dashoffset:540;animation:rt-draw .55s ease-out forwards;opacity:.9;}
@keyframes rt-draw{to{stroke-dashoffset:0;}}

.rt-cols{display:grid;grid-template-columns:1fr;gap:16px;}
.rt-preview{aspect-ratio:16/9;background:#11181A;border:1px solid var(--edge);position:relative;overflow:hidden;}
.rt-preview img{width:100%;height:100%;object-fit:cover;display:block;}
.rt-tiles{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.rt-tile{background:#151B1C;border:1px solid var(--edge);padding:0;cursor:pointer;position:relative;}
.rt-tile[data-on="1"]{border-color:var(--signal);box-shadow:inset 0 0 0 1px var(--signal);}
.rt-tile span{position:absolute;left:6px;bottom:5px;font-family:var(--mono);font-size:9px;
  color:var(--mute);text-transform:uppercase;}
.rt-tile[data-on="1"] span{color:var(--signal);}
.rt-slider label{display:flex;justify-content:space-between;font-family:var(--mono);
  font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute);margin-bottom:5px;}
.rt-slider label b{color:var(--bone);font-weight:500;}
.rt-slider input{width:100%;accent-color:var(--signal);}
.rt-slider{margin-bottom:11px;}
.rt-line{display:flex;gap:10px;padding:7px 0;border-bottom:1px dotted var(--edge);align-items:baseline;}
.rt-cue{font-family:var(--mono);font-size:10px;flex:0 0 72px;text-transform:uppercase;}
.rt-line p{margin:0;font-size:12.5px;line-height:1.5;color:var(--dim);}
.rt-mini{flex:0 0 60px;border:1px solid var(--edge);background:#171D1E;padding:0;cursor:pointer;overflow:hidden;}
.rt-mini[data-on="1"]{border-color:var(--grease);}
.rt-mini img{width:100%;height:54px;object-fit:cover;display:block;}
.rt-mini u{display:block;text-decoration:none;font-family:var(--mono);font-size:9px;
  color:var(--mute);padding:3px 0 4px;text-align:center;border-top:1px solid var(--edge);}
.rt-mini[data-on="1"] u{color:var(--grease);}
.rt-scenecast{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;}

.rt-page{background:#F2EFE6;color:#1A1A18;font-family:var(--script);
  font-size:13.5px;line-height:1.5;padding:44px 52px 60px;max-width:660px;margin:0 auto;}
.rt-slug{font-weight:700;text-transform:uppercase;margin:26px 0 10px;position:relative;}
.rt-slug:first-child{margin-top:0;}
.rt-slug s{position:absolute;left:-30px;top:2px;width:5px;height:14px;text-decoration:none;display:block;}
.rt-act{margin:0 0 12px;}
.rt-anno{margin:0 0 12px;color:#6A6A62;text-transform:uppercase;font-size:11.5px;letter-spacing:.04em;}
.rt-chr{margin:0;text-transform:uppercase;padding-left:38%;}
.rt-par{margin:0;padding-left:30%;color:#3A3A36;}
.rt-dlg{margin:0 0 12px;padding-left:22%;padding-right:18%;}
.rt-tr{margin:12px 0;text-align:right;text-transform:uppercase;}
.rt-pgnum{text-align:right;color:#8A8A80;font-size:11px;margin-bottom:18px;}

/* ══════ NUEVO en la V1 de la plataforma ══════════════════════════════════ */

/* el indicador de guardado — la referencia lo pide a gritos: escritura
   optimista y la base como árbitro, así que hay que VER el arbitraje */
.rt-save{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;
  color:var(--faint);display:inline-flex;align-items:center;gap:6px;}
.rt-save::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--faint);}
.rt-save[data-s="saving"]{color:var(--amber);} .rt-save[data-s="saving"]::before{background:var(--amber);}
.rt-save[data-s="saved"]{color:var(--ok);}     .rt-save[data-s="saved"]::before{background:var(--ok);}
.rt-save[data-s="error"]{color:var(--grease);} .rt-save[data-s="error"]::before{background:var(--grease);}

/* insignia de fase — la promesa que hay que no romper: esto no anima todavía */
.rt-phase{font-family:var(--mono);font-size:9px;letter-spacing:.13em;text-transform:uppercase;
  border:1px solid var(--amber);color:var(--amber);padding:2px 7px;}

/* las tres fotos del personaje */
.rt-pics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
.rt-pic{position:relative;aspect-ratio:3/4;border:1px dashed var(--edge);background:#141A1B;padding:0;
  cursor:pointer;overflow:hidden;display:grid;place-items:center;}
.rt-pic[data-has="1"]{border-style:solid;}
.rt-pic img{width:100%;height:100%;object-fit:cover;display:block;}
.rt-pic u{position:absolute;left:0;right:0;bottom:0;background:rgba(10,13,14,.82);text-decoration:none;
  font-family:var(--mono);font-size:8.5px;color:var(--mute);padding:2px 4px;letter-spacing:.08em;
  text-transform:uppercase;}
.rt-pic i{font-style:normal;color:var(--faint);font-family:var(--mono);font-size:18px;}
.rt-picx{position:absolute;top:3px;right:3px;background:rgba(10,13,14,.85);border:1px solid var(--edge);
  color:var(--mute);font-size:11px;line-height:1;padding:2px 5px;cursor:pointer;z-index:2;}

/* voz en off: transversal a las tomas, así que se dibuja como una banda */
.rt-vo{border-left:2px solid var(--signal);background:#12201F;padding:8px 10px;margin-bottom:7px;}
.rt-vo-h{display:flex;gap:8px;align-items:center;font-family:var(--mono);font-size:9px;
  letter-spacing:.1em;text-transform:uppercase;color:var(--signal);margin-bottom:5px;}
.rt-vo-h .rt-sp + button{flex:0 0 auto;}
.rt-vo p{margin:0;font-size:12.5px;line-height:1.5;color:var(--dim);}

/* la tira de fotogramas revelados */
.rt-photos{display:flex;gap:6px;overflow-x:auto;padding:8px;background:#111516;
  border:1px solid var(--edge);}
.rt-photo{flex:0 0 132px;border:1px solid var(--edge);background:#0E1213;padding:0;cursor:pointer;
  position:relative;overflow:hidden;}
.rt-photo img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover;}
.rt-photo u{display:block;text-decoration:none;font-family:var(--mono);font-size:9px;color:var(--mute);
  padding:3px 5px;border-top:1px solid var(--edge);letter-spacing:.06em;}
.rt-photo[data-on="1"]{border-color:var(--grease);}

/* el guion editable y su hoja de propuestas */
.rt-ed{width:100%;background:#FFFDF6;border:1px solid #D8D2C2;color:#1A1A18;font:inherit;
  padding:3px 6px;display:block;}
.rt-ed:focus{outline:1px solid #B08A2C;}
textarea.rt-ed{resize:vertical;min-height:52px;}
.rt-prop{display:flex;gap:10px;align-items:flex-start;padding:9px 11px;border:1px solid var(--edge);
  margin-bottom:7px;background:#171D1E;}
.rt-prop[data-src="ia"]{border-left:2px solid var(--signal);}
.rt-prop[data-src="regla"]{border-left:2px solid var(--amber);}
.rt-prop input{margin-top:3px;accent-color:var(--signal);}
.rt-prop b{display:block;font-size:12.5px;font-weight:500;margin-bottom:3px;}
.rt-prop small{font-family:var(--mono);font-size:10px;color:var(--mute);display:block;}
.rt-prop em{font-style:normal;font-family:var(--mono);font-size:9px;letter-spacing:.1em;
  text-transform:uppercase;color:var(--faint);margin-left:auto;flex:0 0 auto;}

/* filtro de series en la sala (nota 5) */
.rt-filter{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}

/* ══════ V3.2 · el espacio de la toma y sus mandos ════════════════════════ */

.rt-spin{display:inline-flex;align-items:center;gap:6px;}
.rt-spin svg{animation:rt-spin .8s linear infinite;}
@keyframes rt-spin{to{transform:rotate(360deg);}}
@media (prefers-reduced-motion:reduce){.rt-spin svg{animation-duration:2.4s;}}

.rt-stage{border:1px solid var(--edge);background:#0E1213;overflow:hidden;}
.rt-stagenotes{display:flex;flex-wrap:wrap;gap:6px;padding:6px 8px;border-top:1px solid var(--edge);
  background:#11181A;}
.rt-stagenotes span{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;color:var(--amber);
  border:1px solid #3A3222;padding:2px 6px;}

.rt-stagewrap{display:grid;grid-template-columns:1fr;gap:16px;}
.rt-rig{min-width:0;}

/* los encuadres: catorce chips que caben, no seis mosaicos que no */
.rt-shots{display:flex;flex-wrap:wrap;gap:4px;}
.rt-shot{background:#171D1E;border:1px solid var(--edge);color:var(--mute);cursor:pointer;
  font-family:var(--mono);font-size:10px;letter-spacing:.04em;padding:5px 8px;white-space:nowrap;}
.rt-shot:hover{border-color:var(--mute);color:var(--bone);}
.rt-shot[data-on="1"]{border-color:var(--signal);color:var(--signal);background:#132022;}

/* los mandos, densos: dos columnas y sin aire de sobra */
.rt-dials{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;}
.rt-dial{margin-bottom:4px;}
.rt-dial label{display:flex;justify-content:space-between;font-family:var(--mono);font-size:9px;
  letter-spacing:.06em;text-transform:uppercase;color:var(--mute);margin-bottom:2px;cursor:help;}
.rt-dial label b{color:var(--bone);font-weight:500;}
.rt-dial input{width:100%;accent-color:var(--signal);height:14px;}

.rt-mini-row{display:flex;flex-wrap:wrap;gap:6px;}
.rt-mini-add{display:grid;place-items:center;border-style:dashed;color:var(--mute);}
.rt-mini-add span{font-size:20px;line-height:44px;display:block;}
.rt-mini-add:hover{border-color:var(--signal);color:var(--signal);}

.rt-markbox{border:1px solid var(--edge);border-left:2px solid var(--signal);padding:9px 11px;margin-top:10px;
  background:#11181A;}

.rt-statusrow{display:inline-flex;align-items:center;gap:5px;flex-wrap:wrap;}
.rt-statusrow em{font-style:normal;font-family:var(--mono);font-size:9px;letter-spacing:.12em;
  text-transform:uppercase;color:var(--faint);margin-right:2px;}

.rt-prompt{margin-top:8px;border:1px solid var(--edge);background:#11181A;}
.rt-prompt summary{cursor:pointer;padding:6px 10px;font-family:var(--mono);font-size:10px;
  letter-spacing:.1em;text-transform:uppercase;color:var(--mute);}
.rt-prompt summary:hover{color:var(--bone);}
.rt-prompt pre{margin:0;padding:0 10px 10px;font-family:var(--mono);font-size:11px;line-height:1.6;
  color:var(--dim);white-space:pre-wrap;}

@media (min-width:1000px){
  .rt-stagewrap{grid-template-columns:minmax(0,1fr) 340px;}
}

@media (min-width:900px){
  .rt-cast{grid-template-columns:1fr 1fr;}
  .rt-cols{grid-template-columns:minmax(0,1.05fr) minmax(0,1fr) 132px;}
  .rt-scenecast{flex-direction:column;overflow:visible;}
  .rt-mini{flex:0 0 auto;}
  .rt-split{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:14px;align-items:start;}
}
@media (prefers-reduced-motion:reduce){.rt-ring path{animation:none;stroke-dashoffset:0;}}
`}</style>
  );
}
