"use client";

/* ── Datawave · la hoja de estilo del prototipo, verbatim ────────────────────
   DESVIACIÓN DELIBERADA de la convención del repo (CSS Modules): esta hoja
   viene del artifact tal cual, con ~250 usos de clases `dw-*` ya namespaceadas
   bajo `.dw` / `.dw-stagewrap`. Renombrarlas una a una a un módulo sería un
   cambio mecánico enorme sin ganancia — el prefijo YA hace el aislamiento que
   daría el módulo, y mantenerla verbatim permite volver a diffear contra el
   prototipo cuando este evolucione. Si algún día se toca el diseño a fondo,
   ESE es el momento de pasarla a módulo, no antes.                            */

export function DatawaveStyles() {
  return (
    <style>{`

.dw, .dw-stagewrap {
  --deck:#0E1116; --panel:#161B23; --line:#252B36; --dim:#828EA6; --chalk:#E9EDF5; --live:#FF4D5E;
  --ink:#12141A; --muted:#6E748F; --paper:#FFFFFF; --hair:rgba(18,20,26,.12);
  --mono: ui-monospace, "SF Mono", Menlo, monospace;
  --sans: ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
}
.dw { background:var(--deck); color:var(--chalk); font-family:var(--sans); min-height:100vh; padding-bottom:64px; }
.dw *, .dw-stagewrap * { box-sizing:border-box; }
.dw button { font:inherit; cursor:pointer; }

.dw-head { position:sticky; top:0; z-index:20; display:flex; align-items:center; justify-content:space-between;
  padding:12px 18px; background:rgba(14,17,22,.9); backdrop-filter:blur(8px); border-bottom:1px solid var(--line); }
.dw-brand { background:none; border:0; color:var(--chalk); font-family:var(--mono); font-size:14px; font-weight:700;
  letter-spacing:.22em; display:flex; align-items:center; gap:10px; padding:0; }
.dw-wave { color:var(--live); letter-spacing:-.08em; font-size:15px; }
.dw-headnote { font-family:var(--mono); font-size:11px; color:var(--dim); letter-spacing:.08em; }

.dw-lib, .dw-episode { max-width:920px; margin:0 auto; padding:28px 18px 0; }
.dw-eyebrow { font-family:var(--mono); font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--dim); }
.dw-title { font-size:clamp(30px,6.4vw,46px); line-height:1.03; letter-spacing:-.03em; font-weight:800; margin:12px 0 0; }
.dw-sub { color:var(--dim); font-size:16px; line-height:1.6; max-width:60ch; margin:14px 0 26px; }

.dw-libgrid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; margin:8px 0 30px; }
.dw-libcard { background:var(--panel); border:1px solid var(--line); border-radius:14px; overflow:hidden; display:flex; flex-direction:column; }
.dw-libopen { background:none; border:0; text-align:left; padding:16px 16px 6px; color:var(--chalk); flex:1; }
.dw-libtitle { font-size:19px; font-weight:700; letter-spacing:-.02em; margin:6px 0 10px; line-height:1.2; }
.dw-libmeta { font-family:var(--mono); font-size:11px; color:var(--dim); margin-top:8px; }
.dw-libact { display:flex; border-top:1px solid var(--line); }
.dw-libact button { flex:1; background:none; border:0; border-right:1px solid var(--line); color:var(--dim);
  font-family:var(--mono); font-size:11px; letter-spacing:.08em; padding:9px 0; }
.dw-libact button:last-child { border-right:0; }
.dw-libact button:hover { color:var(--live); background:rgba(255,77,94,.06); }
.dw-newcard { background:linear-gradient(160deg,#1B2130,#141821); border:1px dashed #39415280; border-radius:14px;
  color:var(--chalk); padding:20px 16px; text-align:left; display:flex; flex-direction:column; gap:6px; min-height:150px; }
.dw-newcard b { color:var(--live); font-size:26px; line-height:1; }
.dw-newcard span { font-size:17px; font-weight:700; }
.dw-newcard small { color:var(--dim); font-size:12px; }
.dw-newcard:hover { border-color:var(--live); }

.dw-epbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:22px; }
.dw-back { background:none; border:0; color:var(--dim); font-family:var(--mono); font-size:12px; letter-spacing:.1em; padding:0; }
.dw-back:hover { color:var(--chalk); }
.dw-epbar-r { display:flex; gap:8px; }
.dw-ghostbtn { background:none; border:1px solid var(--line); color:var(--dim); border-radius:999px;
  font-family:var(--mono); font-size:11px; letter-spacing:.12em; padding:7px 13px; }
.dw-ghostbtn:hover { color:var(--chalk); border-color:var(--dim); }
.dw-recbtn { background:var(--live); border:0; color:#fff; border-radius:999px; font-family:var(--mono);
  font-size:11px; letter-spacing:.14em; padding:7px 14px; display:flex; align-items:center; gap:7px; }
.dw-recbtn i { width:7px; height:7px; border-radius:50%; background:#fff; display:block; }
.dw-warn { background:rgba(245,165,36,.12); border:1px solid rgba(245,165,36,.35); color:#F5C46A;
  border-radius:10px; padding:10px 14px; font-size:13px; margin:16px 0 0; }

.dw-card { background:var(--paper); color:var(--ink); border-radius:16px; padding:18px; margin:16px 0; }
.dw-chartbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; }
.dw-unit { font-family:var(--mono); font-size:11px; color:var(--muted); letter-spacing:.06em; }
.dw-toggle { background:none; border:1px solid var(--hair); border-radius:999px; color:var(--muted);
  font-family:var(--mono); font-size:11px; padding:5px 11px; }
.dw-toggle[aria-pressed="true"] { color:var(--ink); border-color:var(--ink); }
.dw-chartwrap { width:100%; overflow:hidden; }
.dw-grid { stroke:var(--ink); stroke-opacity:.09; }
.dw-axis { font-family:var(--mono); font-size:10px; fill:var(--muted); }
.dw-axis-strong { fill:var(--ink); font-weight:700; }
.dw-ghost { stroke:var(--ink); stroke-opacity:.13; stroke-width:1.4; cursor:pointer; }
.dw-ghost:hover { stroke-opacity:.4; }
.dw-playhead { stroke:var(--ink); stroke-width:1; stroke-dasharray:3 3; stroke-opacity:.45; }

.dw-picker { position:relative; margin-top:10px; }
.dw-search { display:flex; align-items:center; gap:8px; border:1px solid var(--hair); border-radius:10px; padding:8px 12px; }
.dw-search input { flex:1; border:0; outline:none; font-size:15px; background:none; color:var(--ink); }
.dw-mag { color:var(--muted); }
.dw-clear { background:none; border:0; color:var(--muted); font-size:18px; }
.dw-chips { display:flex; flex-wrap:wrap; gap:7px; align-items:center; margin-top:10px; }
.dw-chip { display:flex; align-items:center; gap:7px; border:1.5px solid; background:none; border-radius:999px;
  padding:4px 10px; font-size:13px; color:var(--ink); }
.dw-dot { width:8px; height:8px; border-radius:50%; }
.dw-chip-x { color:var(--muted); }
.dw-clearall { background:none; border:0; color:var(--muted); font-size:12px; text-decoration:underline; }
.dw-drop { position:absolute; z-index:9; left:0; right:0; top:52px; background:#fff; border:1px solid var(--hair);
  border-radius:12px; box-shadow:0 18px 40px rgba(12,16,30,.16); max-height:280px; overflow:auto; padding:10px; }
.dw-group { margin-bottom:10px; }
.dw-grouplabel { font-family:var(--mono); font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
.dw-opts { display:flex; flex-wrap:wrap; gap:6px; }
.dw-opt { border:1px solid var(--hair); background:none; border-radius:999px; padding:4px 10px; font-size:13px; color:var(--ink); }
.dw-opt.is-on { border-color:var(--pc); color:var(--pc); }
.dw-opt:disabled { opacity:.35; }
.dw-tick { color:var(--muted); margin-right:5px; }
.dw-empty { font-size:13px; color:var(--muted); padding:6px 2px; }

.dw-scrub { display:flex; align-items:center; gap:12px; }
.dw-play { width:44px; height:44px; border-radius:50%; border:0; background:var(--ink); color:#fff; font-size:14px; flex:none; }
.dw-ticknum { font-family:var(--mono); font-size:22px; font-weight:700; min-width:74px; letter-spacing:-.02em; }
.dw-slider { flex:1; accent-color:var(--live); }
.dw-speed { background:none; border:1px solid var(--hair); border-radius:8px; color:var(--muted); font-family:var(--mono); font-size:11px; padding:5px 8px; }
.dw-boards { display:grid; gap:18px; margin-top:16px; }
.dw-boardlabel { font-family:var(--mono); font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
.dw-rows { position:relative; }
.dw-row { position:absolute; left:0; right:0; display:flex; align-items:center; gap:8px; background:none; border:0;
  padding:0 4px; transition:transform .42s cubic-bezier(.2,.7,.3,1); text-align:left; color:var(--ink); }
.dw-rank { font-family:var(--mono); font-size:10px; color:var(--muted); width:14px; flex:none; }
.dw-bar { position:absolute; left:20px; top:4px; bottom:4px; background:var(--pc); opacity:.16; border-radius:4px;
  transition:width .42s cubic-bezier(.2,.7,.3,1); }
.dw-row.is-picked .dw-bar { opacity:.3; }
.dw-row.is-big .dw-bar { opacity:.34; }
.dw-rowname { position:relative; font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding-left:8px; }
.dw-row.is-picked .dw-rowname { color:var(--pc); }
.dw-emblem { margin-right:6px; font-weight:400; }
.dw-val { margin-left:auto; font-family:var(--mono); font-size:12px; color:var(--muted); position:relative; }
.dw-row.is-big .dw-rowname { font-size:22px; }
.dw-row.is-big .dw-val { font-size:18px; color:var(--ink); }
.dw-row.is-big .dw-rank { font-size:13px; width:22px; }
.dw-peektoggle { margin-top:14px; background:none; border:1px solid var(--hair); border-radius:999px;
  color:var(--muted); font-family:var(--mono); font-size:11px; padding:6px 12px; }
.dw-peek { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:18px; margin-top:14px; }
.dw-peeklist { list-style:none; margin:0; padding:0; }
.dw-peeklist li { display:flex; justify-content:space-between; gap:10px; font-size:13px; padding:5px 0;
  border-bottom:1px solid var(--hair); cursor:pointer; }
.dw-peeklist li.is-picked { font-weight:700; }
.dw-peeklist b { font-family:var(--mono); color:var(--muted); font-weight:500; }

.dw-actions { display:grid; grid-template-columns:repeat(auto-fit,minmax(210px,1fr)); gap:10px; }
.dw-btn { background:var(--ink); color:#fff; border:0; border-radius:12px; padding:14px 16px; text-align:left;
  font-size:15px; font-weight:600; display:flex; flex-direction:column; gap:3px; width:100%; }
.dw-btn small { font-weight:400; opacity:.65; font-size:12px; }
.dw-btn.alt { background:none; color:var(--ink); border:1px solid var(--hair); margin-top:10px; }
.dw-btn:disabled { opacity:.45; }
.dw-loading { display:flex; align-items:center; gap:9px; color:var(--muted); font-size:13px; margin-top:14px; }
.dw-pulse { width:8px; height:8px; border-radius:50%; background:var(--live); animation:dwp 1s infinite; }
@keyframes dwp { 0%,100%{opacity:.25} 50%{opacity:1} }
.dw-err { background:rgba(229,72,77,.09); color:#A62229; border-radius:10px; padding:10px 13px; font-size:13px; margin-top:12px; }
.dw-intro { font-family:Georgia, serif; font-style:italic; font-size:19px; line-height:1.5; margin:16px 0 0; }
.dw-sec { margin-top:20px; }
.dw-seclabel { font-family:var(--mono); font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); }
.dw-list { list-style:none; margin:10px 0 0; padding:0; }
.dw-list li { display:flex; gap:10px; font-size:15px; line-height:1.5; padding:7px 0; border-top:1px solid var(--hair); }
.dw-list li::before { content:"—"; color:var(--live); }
.dw-caveat { font-size:13px; color:var(--muted); border-left:2px solid var(--hair); padding-left:12px; margin-top:14px; }
.dw-srcs { margin-top:18px; display:flex; flex-direction:column; gap:5px; }
.dw-srcs a { font-size:12px; color:var(--muted); }
.dw-official { margin:10px 0 0; padding-left:20px; }
.dw-official li { display:flex; justify-content:space-between; font-size:14px; padding:4px 0; border-bottom:1px solid var(--hair); }
.dw-official b { font-family:var(--mono); font-weight:500; color:var(--muted); }
.dw-beats { list-style:none; margin:12px 0 16px; padding:0; }
.dw-beats li { display:flex; gap:12px; align-items:baseline; padding:7px 0; border-top:1px solid var(--hair); cursor:pointer; font-size:14px; }
.dw-beats b { font-family:var(--mono); font-size:12px; color:var(--live); flex:none; }
.dw-cues { margin:14px 0; padding-left:18px; }
.dw-cues li { padding:6px 0; font-size:14px; }
.dw-cues b { font-family:var(--mono); font-size:11px; color:var(--muted); display:block; }
.dw-hint { font-size:12.5px; color:var(--muted); line-height:1.5; margin:10px 0 0; }
.dw-readout { font-family:var(--mono); font-size:12px; }
.dw-why { font-size:14px; line-height:1.55; margin-top:12px; padding-top:12px; border-top:1px solid var(--hair); }
.dw-saverow { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; align-items:center; }
.dw-save { background:var(--ink); color:#fff; border:0; border-radius:999px; padding:10px 18px; font-size:14px; }
.dw-save:disabled { opacity:.5; }
.dw-preview { margin-top:14px; }
.dw-preview img { width:100%; border:1px solid var(--hair); border-radius:10px; }

.dw-newep { background:var(--paper); color:var(--ink); border-radius:16px; padding:20px; margin-bottom:24px; }
.dw-field { display:flex; flex-direction:column; gap:5px; margin-top:14px; flex:1; }
.dw-field span { font-family:var(--mono); font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--muted); }
.dw-field i { font-style:normal; opacity:.6; }
.dw-field input, .dw-field textarea { border:1px solid var(--hair); border-radius:9px; padding:9px 11px; font:inherit;
  font-size:15px; color:var(--ink); background:none; outline:none; width:100%; }
.dw-field input:focus, .dw-field textarea:focus, .dw-json:focus { border-color:var(--ink); }
.dw-fieldrow { display:flex; flex-wrap:wrap; gap:10px; }
.dw-fieldrow .dw-field { min-width:88px; }
.dw-json { width:100%; height:340px; margin-top:12px; font-family:var(--mono); font-size:12px; line-height:1.5;
  border:1px solid var(--hair); border-radius:10px; padding:12px; color:var(--ink); background:#FBFAF9; outline:none; }

.dw-foot { color:var(--dim); font-size:13px; line-height:1.6; margin:26px 0 40px; }
.dw-foot summary { font-family:var(--mono); font-size:11px; letter-spacing:.14em; text-transform:uppercase; cursor:pointer; }
.dw-foot code { font-family:var(--mono); font-size:12px; color:var(--chalk); }

.dw-stagewrap { position:fixed; inset:0; background:#05070A; display:flex; align-items:center; justify-content:center; z-index:60; }
.dw-stage { position:relative; width:min(100vw, calc(100vh * 9 / 16)); height:min(100vh, calc(100vw * 16 / 9));
  background:var(--paper); color:var(--ink); display:flex; flex-direction:column; padding:5% 6%; overflow:hidden; }
.dw-stage-head { position:relative; z-index:2; }
.dw-stage-eyebrow { font-family:var(--mono); font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:var(--muted); }
.dw-stage-title { font-size:clamp(22px,4.4vh,38px); font-weight:800; letter-spacing:-.03em; line-height:1.05; margin-top:8px; }
.dw-stage-tick { position:absolute; right:5%; bottom:12%; font-family:var(--mono); font-weight:800;
  font-size:clamp(60px,15vh,150px); color:rgba(18,20,26,.09); letter-spacing:-.04em; z-index:1; }
.dw-stage-body { position:relative; z-index:2; flex:1; display:grid; gap:4%; align-content:center; margin-top:4%; }
.dw-stage-board { font-family:var(--mono); font-size:11px; letter-spacing:.18em; text-transform:uppercase; color:var(--muted); margin-bottom:10px; }
.dw-stage-foot { position:relative; z-index:2; }
.dw-stage-unit { font-family:var(--mono); font-size:11px; color:var(--muted); margin-bottom:8px; }
.dw-stage-progress { height:3px; background:var(--hair); border-radius:2px; overflow:hidden; }
.dw-stage-progress span { display:block; height:100%; background:var(--live); transition:width .3s linear; }
.dw-count { position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-family:var(--mono); font-size:88px; font-weight:800; background:rgba(255,255,255,.94); z-index:5; }
.dw-stagectl { position:fixed; bottom:16px; left:50%; transform:translateX(-50%); display:flex; gap:10px; align-items:center;
  background:rgba(14,17,22,.92); border:1px solid var(--line); border-radius:999px; padding:8px 14px; transition:opacity .3s; }
.dw-stagectl.is-hidden { opacity:0; pointer-events:none; }
.dw-stagectl button { background:none; border:0; color:var(--chalk); font-family:var(--mono); font-size:11px; letter-spacing:.1em; }
.dw-stagectl span { color:var(--dim); font-size:11px; font-family:var(--mono); }

@media (max-width:640px) {
  .dw-boards { grid-template-columns:1fr !important; }
  .dw-card { padding:14px; border-radius:14px; }
  .dw-lib, .dw-episode { padding:20px 12px 0; }
}
@media (prefers-reduced-motion: reduce) {
  .dw-row, .dw-bar, .dw-stage-progress span { transition:none; }
  .dw-pulse { animation:none; }
}
`}</style>
  );
}
