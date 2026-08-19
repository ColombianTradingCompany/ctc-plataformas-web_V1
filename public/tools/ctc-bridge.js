/* ── CTC Tools Bridge · v1 (A11, 2026-08-19) ─────────────────────────────────
 *
 * El puente entre una herramienta (HTML autocontenido en un <iframe>) y la
 * concha de la plataforma, que es quien guarda TRABAJOS en la base de datos.
 * Una herramienta se vuelve «con memoria» incluyendo UNA línea antes de </body>:
 *
 *     <script src="/tools/ctc-bridge.js"></script>
 *
 * …y marcando `soporta_memoria` en ECP → Herramientas del café. Nada más: por
 * defecto el puente serializa TODOS los <input>, <select> y <textarea> del
 * documento (por name/id, y si no tienen, por posición) y los restaura al
 * abrir el trabajo. Para estado que no vive en campos (un canvas, un array en
 * JS), la herramienta puede tomar el control:
 *
 *     CTC.usarEstado(
 *       function ()       { return miEstado; },     // qué guardar
 *       function (estado) { miEstado = estado; }    // cómo restaurar
 *     );
 *     CTC.tocado();   // avisa «hay cambios» cuando no los dispara un campo
 *     CTC.emitir("reporte.enviado", { lote: "X" }); // empujar al ecosistema
 *
 * EL PROTOCOLO (postMessage, mismo origen — la concha VALIDA el origen; el
 * puente responde solo a su parent):
 *   puente → concha   {ctc:"ready", v:1}            al cargar
 *   concha → puente   {ctc:"init", nombre, estado}  al abrir el trabajo
 *   puente → concha   {ctc:"estado", estado}        tras cambios (debounce 900 ms)
 *   puente → concha   {ctc:"emitir", evento, payload}
 *
 * FUERA de la concha (la herramienta abierta suelta, sin trabajo) el puente no
 * hace nada: sin `init` no captura ni manda. La herramienta sigue funcionando
 * offline y sola, que es el contrato de siempre.
 */
(function () {
  "use strict";
  if (window.CTC && window.CTC.__bridge) return; // doble inclusión = no-op

  var activo = false; // solo tras recibir init de la concha
  var timer = null;
  var custom = null; // {leer, poner} si la herramienta llamó usarEstado
  var resumenFn = null; // si la herramienta llamó usarResumen

  // ── Serialización por defecto: todos los campos del documento ────────────
  function claveDe(el, i) {
    if (el.name) return "n:" + el.name + (el.type === "radio" ? ":" + el.value : "");
    if (el.id) return "i:" + el.id;
    return "x:" + i; // posición en el documento — estable mientras no cambie la versión
  }
  function campos() {
    return Array.prototype.slice.call(document.querySelectorAll("input, select, textarea"));
  }
  function leerCampos() {
    var estado = { __ctc: 1 };
    campos().forEach(function (el, i) {
      if (el.type === "password" || el.type === "file") return; // jamás
      var k = claveDe(el, i);
      if (el.type === "checkbox" || el.type === "radio") estado[k] = !!el.checked;
      else estado[k] = el.value;
    });
    return estado;
  }
  function ponerCampos(estado) {
    campos().forEach(function (el, i) {
      var k = claveDe(el, i);
      if (!(k in estado)) return;
      if (el.type === "password" || el.type === "file") return;
      if (el.type === "checkbox" || el.type === "radio") el.checked = !!estado[k];
      else el.value = String(estado[k]);
      // La herramienta recalcula con sus propios listeners: se le disparan los
      // eventos que dispararía una persona escribiendo.
      try {
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      } catch (e) {
        /* herramientas viejas sin constructor Event: se restaura el valor igual */
      }
    });
  }

  function leerEstado() {
    try {
      return custom ? custom.leer() : leerCampos();
    } catch (e) {
      return null;
    }
  }

  // El RESUMEN (V5.7): la línea que el Home Menu enseña bajo el nombre del
  // trabajo. Por defecto, los primeros campos con valor (texto/número), unidos
  // con « · »; la herramienta puede darla mejor con CTC.usarResumen.
  function resumenDe() {
    try {
      if (resumenFn) return String(resumenFn() || "").slice(0, 140);
      var partes = [];
      campos().some(function (el) {
        if (el.type === "password" || el.type === "file" || el.type === "checkbox" || el.type === "radio" || el.type === "hidden") return false;
        var v = String(el.value || "").trim();
        if (!v || v.length > 60) return false;
        partes.push(v);
        return partes.length >= 3;
      });
      return partes.join(" · ").slice(0, 140);
    } catch (e) {
      return "";
    }
  }

  function mandarEstado() {
    if (!activo) return;
    var estado = leerEstado();
    if (estado == null) return;
    window.parent.postMessage({ ctc: "estado", estado: estado, resumen: resumenDe() }, "*");
  }

  function tocado() {
    if (!activo) return;
    clearTimeout(timer);
    timer = setTimeout(mandarEstado, 900);
  }

  // Cambios de campos → autoguardado. `capture` para oír también lo que la
  // herramienta pare con stopPropagation en burbuja.
  document.addEventListener("input", tocado, true);
  document.addEventListener("change", tocado, true);

  window.addEventListener("message", function (e) {
    var d = e && e.data;
    if (!d || e.source !== window.parent) return;
    // La concha toca a la puerta al cargar el iframe («hola»): si el ready del
    // arranque se perdió por una carrera, se vuelve a anunciar. Belt & braces.
    if (d.ctc === "hola") {
      window.parent.postMessage({ ctc: "ready", v: 1 }, "*");
      return;
    }
    if (d.ctc !== "init") return;
    activo = true;
    if (d.estado && typeof d.estado === "object") {
      try {
        if (custom) custom.poner(d.estado);
        else ponerCampos(d.estado);
      } catch (err) {
        /* un estado de otra versión no debe tumbar la herramienta */
      }
    }
  });

  window.CTC = {
    __bridge: 1,
    /** Sustituir la serialización por defecto por la de la herramienta. */
    usarEstado: function (leer, poner) {
      custom = { leer: leer, poner: poner };
    },
    /** Avisar «hay cambios» cuando no los dispara un campo del formulario. */
    tocado: tocado,
    /** La línea que resume el trabajo en el Home Menu (V5.7). */
    usarResumen: function (fn) {
      resumenFn = fn;
    },
    /** Empujar un evento al resto del ecosistema (lo recoge la concha). */
    emitir: function (evento, payload) {
      window.parent.postMessage({ ctc: "emitir", evento: String(evento || ""), payload: payload || {} }, "*");
    },
  };

  // Anunciarse. Si no hay concha escuchando, no pasa nada — y sin `init`
  // posterior el puente queda inerte.
  window.parent.postMessage({ ctc: "ready", v: 1 }, "*");
})();
