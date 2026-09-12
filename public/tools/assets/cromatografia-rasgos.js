/* ── Lector de Cromatografía de Suelo · motor de RASGOS (visión clásica) ──────
 *
 * El anclaje contra la alucinación (kickoff v2 §3–§4, PDF2 §6): antes de que un
 * modelo «mire» la foto, este módulo mide lo que se puede medir sin opinar.
 * JS puro, sin dependencias, sin red: corre en el navegador sobre el ImageData
 * de un <canvas> y lo corre también el guardián `scripts/qa-cromatografia-check.mjs`
 * en Node sobre cromas SINTÉTICOS cuyas fronteras y radialidad se conocen.
 *
 *   CromaRasgos.analizar({ width, height, data }) → {
 *     version, valida, validation_report, rasgos | null, ford_programatico | null
 *   }
 *
 * LA COMPUERTA (kickoff §3, `image_validation_gate.reject_if` en el mismo orden
 * que MOTIVOS): sin círculo · nitidez baja · área útil < 40 % · recorte del
 * borde · sin fondo claro. Si falla, no hay rasgos ni lectura; el
 * `validation_report` sale SIEMPRE, con los valores medidos, para trazabilidad.
 *
 * CALIBRACIÓN (1.1, 2026-09-13). Los umbrales de la 1.0 salían de los
 * sintéticos del guardián y rechazaban TODA foto real. Se midieron las 108
 * capturas de laboratorio del dataset abierto de Martins et al. 2026 (Zenodo
 * 10.5281/zenodo.18851814, CC BY 4.0, fondo blanco, papel entero, 448 px):
 *   · nitidez normalizada: mínimo 13,9 · mediana 33  → nitidezMin 10
 *   · área útil del croma: 0,30–0,39 del encuadre      → areaMin 0,20
 * ⚠️ El JSON de reglas dice «área útil < 40 %». Con papel de 15 cm y frente a
 * 6 cm el máximo físico ronda el 50 % del encuadre y ninguna de las 108 fotos
 * de laboratorio llega al 40 %: aplicado literal, la compuerta rechaza las
 * capturas bien hechas. Se usa 0,20 y la corrección del JSON queda como
 * DECISIÓN DEL OWNER (charter herramientas-cafe · Pendientes; fuentes en
 * reference/html_tools/Analisis Cromatografico/fuentes/HALLAZGOS.md §a.6).
 * Falta calibrar con fotos de MÓVIL del protocolo CTC. Cambiar un umbral =
 * subir VERSION.
 */
(function (root) {
  "use strict";

  var VERSION = "croma-rasgos-1.1";

  var UMBRALES = {
    nitidezMin: 10, // varianza del Laplaciano sobre el croma normalizado a radio 250 px (Martins D2: mín. 13,9)
    areaMin: 0.2, // el JSON dice 40 %; ver CALIBRACIÓN arriba (Martins D2: 0,30–0,39)
    fondoLMin: 55, // L* mínima del borde de la foto para contar como fondo claro
    fondoCromaMax: 18, // C* máxima del fondo: por encima hay dominante de color
    deltaMascara: 14, // ΔE*ab respecto al fondo para contar un píxel como croma
    circularidadMax: 0.22, // desviación típica del radio del borde / radio
    rellenoMin: 0.45, // fracción del disco que es croma (el centro puede ser pálido)
    mascaraMin: 0.02, // fracción mínima de la foto que no es fondo
  };

  /* Radios nominales de las fronteras central/mineral, mineral/orgánica y
   * orgánica/enzimática = `zones[].relative_radius` de interpretation_rules.json
   * (0,2 · 0,5 · 0,77). El guardián comprueba que coinciden con el JSON. Se usan
   * como ventanas de búsqueda y como respaldo cuando una frontera no se ve. */
  var ZONAS_NOMINALES = [0.2, 0.5, 0.77];
  var VENTANAS = [
    [0.08, 0.35],
    [0.36, 0.66],
    [0.62, 0.93],
  ];

  /* Mismo orden que image_validation_gate.reject_if. */
  var MOTIVOS = ["sin_circulo", "nitidez", "area", "recorte", "fondo"];

  var RN = 250; // radio del recorte normalizado
  var ANILLOS = 50; // anillos del 2 % de radio (kickoff §4)

  /* ── Color ─────────────────────────────────────────────────────────────── */
  var LIN = new Float32Array(256);
  for (var i0 = 0; i0 < 256; i0++) {
    var c0 = i0 / 255;
    LIN[i0] = c0 <= 0.04045 ? c0 / 12.92 : Math.pow((c0 + 0.055) / 1.055, 2.4);
  }
  function fLab(t) {
    return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  }
  function labDe(r, g, b, out) {
    var R = LIN[r],
      G = LIN[g],
      B = LIN[b];
    var X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
    var Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    var Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
    var fx = fLab(X),
      fy = fLab(Y),
      fz = fLab(Z);
    out[0] = 116 * fy - 16;
    out[1] = 500 * (fx - fy);
    out[2] = 200 * (fy - fz);
  }

  function mediana(arr) {
    if (!arr.length) return NaN;
    var s = Array.prototype.slice.call(arr).sort(function (a, b) {
      return a - b;
    });
    var m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function media(arr) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += arr[i];
    return arr.length ? t / arr.length : NaN;
  }
  function desv(arr) {
    var m = media(arr),
      t = 0;
    for (var i = 0; i < arr.length; i++) t += (arr[i] - m) * (arr[i] - m);
    return arr.length ? Math.sqrt(t / arr.length) : NaN;
  }
  function clamp01(x) {
    return x < 0 ? 0 : x > 1 ? 1 : x;
  }
  function r3(x) {
    return Math.round(x * 1000) / 1000;
  }
  function r1(x) {
    return Math.round(x * 10) / 10;
  }

  /* ── Ford programático (sin IA) ────────────────────────────────────────── */
  function rango(s) {
    var x = 1 + 4 * clamp01(s);
    var lo = Math.floor(x + 1e-9),
      hi = Math.ceil(x - 1e-9);
    if (lo < 1) lo = 1;
    if (hi > 5) hi = 5;
    if (hi < lo) hi = lo;
    if (hi - lo > 1) hi = lo + 1;
    return [lo, hi];
  }
  /** Estimación de la escala 1–5 de Ford derivada SOLO de los rasgos. Es una
   *  referencia comparable entre muestras, no una lectura: no ve la imagen. */
  function fordDesdeRasgos(r) {
    return {
      canales: rango((r.radiality_index - 0.2) / 0.55),
      picos: rango(0.6 * clamp01((r.spike_index - 0.2) / 0.55) + 0.4 * clamp01(r.edge_irregularity / 0.08)),
      intensidad: rango(r.colour_intensity_index),
    };
  }

  /* ── El análisis ───────────────────────────────────────────────────────── */
  function analizar(img, opciones) {
    var U = {};
    for (var k in UMBRALES) U[k] = UMBRALES[k];
    if (opciones && opciones.umbrales) for (var k2 in opciones.umbrales) U[k2] = opciones.umbrales[k2];

    var w = img.width,
      h = img.height,
      d = img.data,
      n = w * h;
    var L = new Float32Array(n),
      A = new Float32Array(n),
      B = new Float32Array(n);
    var tmp = [0, 0, 0];
    for (var p = 0, q = 0; p < n; p++, q += 4) {
      labDe(d[q], d[q + 1], d[q + 2], tmp);
      L[p] = tmp[0];
      A[p] = tmp[1];
      B[p] = tmp[2];
    }

    // 1 · El fondo: la banda del borde de la foto.
    var banda = Math.max(2, Math.round(0.03 * Math.min(w, h)));
    var bl = [],
      ba = [],
      bb = [];
    for (var y = 0; y < h; y += 2) {
      for (var x = 0; x < w; x += 2) {
        if (y < banda || y >= h - banda || x < banda || x >= w - banda) {
          var ib = y * w + x;
          bl.push(L[ib]);
          ba.push(A[ib]);
          bb.push(B[ib]);
        }
      }
    }
    var fondo = [mediana(bl), mediana(ba), mediana(bb)];
    var fondoCroma = Math.sqrt(fondo[1] * fondo[1] + fondo[2] * fondo[2]);
    var fondoClaro = fondo[0] >= U.fondoLMin && fondoCroma <= U.fondoCromaMax;

    // 2 · La máscara del croma: lo que se aparta del fondo.
    var mascara = new Uint8Array(n);
    var sx = 0,
      sy = 0,
      cuenta = 0;
    var d2 = U.deltaMascara * U.deltaMascara;
    for (var yy = 0; yy < h; yy++) {
      for (var xx = 0; xx < w; xx++) {
        var im = yy * w + xx;
        var dl = L[im] - fondo[0],
          da = A[im] - fondo[1],
          db = B[im] - fondo[2];
        if (dl * dl + da * da + db * db > d2) {
          mascara[im] = 1;
          if (yy >= banda && yy < h - banda && xx >= banda && xx < w - banda) {
            sx += xx;
            sy += yy;
            cuenta++;
          }
        }
      }
    }

    var reporte = {
      circulo_detectado: false,
      circularidad: null,
      relleno: null,
      nitidez: null,
      nitidez_min: U.nitidezMin,
      area_util: null,
      area_min: U.areaMin,
      borde_completo: false,
      fondo_claro: fondoClaro,
      fondo_lab: [r1(fondo[0]), r1(fondo[1]), r1(fondo[2])],
      motivos: [],
    };

    function cerrar() {
      if (!reporte.circulo_detectado) reporte.motivos.push("sin_circulo");
      if (reporte.nitidez === null || reporte.nitidez < U.nitidezMin) reporte.motivos.push("nitidez");
      if (reporte.area_util === null || reporte.area_util < U.areaMin) reporte.motivos.push("area");
      if (!reporte.borde_completo) reporte.motivos.push("recorte");
      if (!fondoClaro) reporte.motivos.push("fondo");
      return reporte;
    }

    if (cuenta < U.mascaraMin * n) {
      return { version: VERSION, valida: false, validation_report: cerrar(), rasgos: null, ford_programatico: null };
    }

    // 3 · Centro y radio: caminar desde el centro hacia fuera en N ángulos y
    //     quedarse con el último tramo de croma; recentrar tres veces.
    var cx = sx / cuenta,
      cy = sy / cuenta;
    var maxR = Math.hypot(w, h);
    function radiosDelBorde(N) {
      var rs = new Float32Array(N),
        tocaBorde = 0;
      for (var a = 0; a < N; a++) {
        var th = (2 * Math.PI * a) / N,
          co = Math.cos(th),
          si = Math.sin(th);
        var ultimo = 0,
          racha = 0,
          r = 1,
          fuera = false;
        for (; r < maxR; r++) {
          var px = Math.round(cx + r * co),
            py = Math.round(cy + r * si);
          if (px < 0 || py < 0 || px >= w || py >= h) {
            fuera = true;
            break;
          }
          if (mascara[py * w + px]) {
            racha++;
            if (racha >= 3) ultimo = r;
          } else racha = 0;
        }
        if (fuera && ultimo >= r - 4) tocaBorde++;
        rs[a] = ultimo;
      }
      return { rs: rs, tocaBorde: tocaBorde };
    }
    var borde;
    for (var it = 0; it < 3; it++) {
      borde = radiosDelBorde(72);
      var ddx = 0,
        ddy = 0;
      for (var a2 = 0; a2 < 72; a2++) {
        var th2 = (2 * Math.PI * a2) / 72;
        ddx += borde.rs[a2] * Math.cos(th2);
        ddy += borde.rs[a2] * Math.sin(th2);
      }
      cx += (2 / 72) * ddx;
      cy += (2 / 72) * ddy;
    }
    borde = radiosDelBorde(180);
    var R = mediana(borde.rs);
    var circularidad = R > 0 ? desv(borde.rs) / R : 1;

    var enDisco = 0,
      enDiscoCroma = 0;
    var R2 = R * R;
    var x0 = Math.max(0, Math.floor(cx - R)),
      x1 = Math.min(w - 1, Math.ceil(cx + R));
    var y0 = Math.max(0, Math.floor(cy - R)),
      y1 = Math.min(h - 1, Math.ceil(cy + R));
    for (var y2 = y0; y2 <= y1; y2++) {
      for (var x2 = x0; x2 <= x1; x2++) {
        var ex = x2 - cx,
          ey = y2 - cy;
        if (ex * ex + ey * ey <= R2) {
          enDisco++;
          if (mascara[y2 * w + x2]) enDiscoCroma++;
        }
      }
    }
    var relleno = enDisco ? enDiscoCroma / (Math.PI * R2) : 0;

    reporte.circularidad = r3(circularidad);
    reporte.relleno = r3(relleno);
    reporte.area_util = r3(enDisco / n);
    reporte.borde_completo = borde.tocaBorde < 2 && cx - R >= 1 && cy - R >= 1 && cx + R <= w - 2 && cy + R <= h - 2;
    reporte.circulo_detectado = R >= 0.1 * Math.min(w, h) && circularidad <= U.circularidadMax && relleno >= U.rellenoMin;

    if (!reporte.circulo_detectado) {
      return { version: VERSION, valida: false, validation_report: cerrar(), rasgos: null, ford_programatico: null };
    }

    // 4 · El recorte normalizado: el croma remuestreado a radio RN, para que
    //     nitidez y rasgos no dependan de la resolución de la foto.
    var S = 2 * RN + 1,
      SS = S * S;
    var cL = new Float32Array(SS),
      cA = new Float32Array(SS),
      cB = new Float32Array(SS),
      cR = new Float32Array(SS),
      cT = new Float32Array(SS);
    var escala = R / RN;
    function bil(arr, fx, fy) {
      if (fx < 0 || fy < 0 || fx > w - 1 || fy > h - 1) return NaN;
      var ix = Math.floor(fx),
        iy = Math.floor(fy);
      var ix1 = Math.min(ix + 1, w - 1),
        iy1 = Math.min(iy + 1, h - 1);
      var tx = fx - ix,
        ty = fy - iy;
      return (
        arr[iy * w + ix] * (1 - tx) * (1 - ty) +
        arr[iy * w + ix1] * tx * (1 - ty) +
        arr[iy1 * w + ix] * (1 - tx) * ty +
        arr[iy1 * w + ix1] * tx * ty
      );
    }
    for (var j = 0; j < S; j++) {
      for (var i = 0; i < S; i++) {
        var o = j * S + i,
          ux = i - RN,
          uy = j - RN;
        cR[o] = Math.sqrt(ux * ux + uy * uy) / RN;
        cT[o] = Math.atan2(uy, ux);
        if (cR[o] > 1.02) {
          cL[o] = NaN;
          continue;
        }
        var fx2 = cx + ux * escala,
          fy2 = cy + uy * escala;
        cL[o] = bil(L, fx2, fy2);
        cA[o] = bil(A, fx2, fy2);
        cB[o] = bil(B, fx2, fy2);
      }
    }

    // 5 · Nitidez: varianza del Laplaciano dentro de 0,95 R.
    var laps = [];
    for (var j2 = 1; j2 < S - 1; j2++) {
      for (var i2 = 1; i2 < S - 1; i2++) {
        var o2 = j2 * S + i2;
        if (cR[o2] > 0.95) continue;
        var c = cL[o2],
          l = cL[o2 - 1],
          rr = cL[o2 + 1],
          u = cL[o2 - S],
          dn = cL[o2 + S];
        if (isNaN(c) || isNaN(l) || isNaN(rr) || isNaN(u) || isNaN(dn)) continue;
        laps.push(2.55 * (4 * c - l - rr - u - dn));
      }
    }
    var mLap = media(laps),
      vLap = 0;
    for (var t = 0; t < laps.length; t++) vLap += (laps[t] - mLap) * (laps[t] - mLap);
    vLap = laps.length ? vLap / laps.length : 0;
    reporte.nitidez = r1(vLap);

    cerrar();
    var valida = reporte.motivos.length === 0;
    if (!valida) {
      return { version: VERSION, valida: false, validation_report: reporte, rasgos: null, ford_programatico: null };
    }

    // 6 · Perfil radial en CIELAB: 50 anillos del 2 %.
    var sumL = new Float64Array(ANILLOS),
      sumA = new Float64Array(ANILLOS),
      sumB = new Float64Array(ANILLOS),
      cnt = new Float64Array(ANILLOS);
    for (var o3 = 0; o3 < SS; o3++) {
      if (cR[o3] >= 1 || isNaN(cL[o3])) continue;
      var ring = Math.min(ANILLOS - 1, Math.floor(cR[o3] * ANILLOS));
      sumL[ring] += cL[o3];
      sumA[ring] += cA[o3];
      sumB[ring] += cB[o3];
      cnt[ring]++;
    }
    var perfil = [];
    for (var k3 = 0; k3 < ANILLOS; k3++) {
      perfil.push(cnt[k3] ? [sumL[k3] / cnt[k3], sumA[k3] / cnt[k3], sumB[k3] / cnt[k3]] : [NaN, NaN, NaN]);
    }

    // 7 · Fronteras de zona: máximos de la derivada del perfil (ΔE entre
    //     anillos vecinos), buscados en ventanas alrededor de las nominales.
    var der = [];
    for (var k4 = 0; k4 < ANILLOS - 1; k4++) {
      var P = perfil[k4],
        Q = perfil[k4 + 1];
      var dd = Math.sqrt((P[0] - Q[0]) * (P[0] - Q[0]) + (P[1] - Q[1]) * (P[1] - Q[1]) + (P[2] - Q[2]) * (P[2] - Q[2]));
      der.push(isNaN(dd) ? 0 : dd);
    }
    var suave = der.map(function (v, i) {
      var a = der[i - 1] || 0,
        b = der[i + 1] || 0;
      return (a + 2 * v + b) / 4;
    });
    var fronteras = [],
      origenFronteras = [],
      contrastes = [];
    var minimo = 0;
    for (var z = 0; z < 3; z++) {
      var desde = Math.max(VENTANAS[z][0], minimo),
        hasta = VENTANAS[z][1];
      var mejor = -1,
        mejorV = 0;
      for (var k5 = 0; k5 < der.length; k5++) {
        var pos = (k5 + 1) / ANILLOS;
        if (pos < desde || pos > hasta) continue;
        if (suave[k5] > mejorV) {
          mejorV = suave[k5];
          mejor = k5;
        }
      }
      if (mejor >= 0 && mejorV >= 1.0) {
        fronteras.push((mejor + 1) / ANILLOS);
        origenFronteras.push("medida");
        contrastes.push(der[mejor]);
      } else {
        fronteras.push(Math.max(ZONAS_NOMINALES[z], desde));
        origenFronteras.push("nominal");
        contrastes.push(0);
      }
      minimo = fronteras[z] + 0.08;
    }

    // 8 · Color mediano por zona.
    var limites = [0, fronteras[0], fronteras[1], fronteras[2], 1];
    var nombres = ["central", "mineral", "organic", "enzymatic"];
    var porZona = nombres.map(function () {
      return { l: [], a: [], b: [], hist: new Float64Array(32), n: 0 };
    });
    for (var o4 = 0; o4 < SS; o4 += 2) {
      var rel = cR[o4];
      if (rel >= 1 || isNaN(cL[o4])) continue;
      var zi = rel < limites[1] ? 0 : rel < limites[2] ? 1 : rel < limites[3] ? 2 : 3;
      var Z4 = porZona[zi];
      Z4.l.push(cL[o4]);
      Z4.a.push(cA[o4]);
      Z4.b.push(cB[o4]);
      Z4.hist[Math.max(0, Math.min(31, Math.floor((cL[o4] / 100) * 32)))]++;
      Z4.n++;
    }
    var colorZona = {},
      entropia = {};
    nombres.forEach(function (nm, zi2) {
      var Z5 = porZona[zi2];
      colorZona[nm] = [r1(mediana(Z5.l)), r1(mediana(Z5.a)), r1(mediana(Z5.b))];
      var e = 0;
      for (var hb = 0; hb < 32; hb++) {
        if (!Z5.hist[hb]) continue;
        var pr = Z5.hist[hb] / Z5.n;
        e -= pr * Math.log2(pr);
      }
      entropia[nm] = r3(e);
    });

    // 9 · Radialidad: energía angular de frecuencia media (6–100 ciclos) a
    //     radio fijo. Lo que varía despacio alrededor del croma (una luz de
    //     lado) no cuenta; canales y picos sí.
    var NA = 256;
    var COS = [],
      SIN = [];
    for (var kk = 6; kk <= 100; kk++) {
      var fc = new Float64Array(NA),
        fs = new Float64Array(NA);
      for (var jj = 0; jj < NA; jj++) {
        fc[jj] = Math.cos((2 * Math.PI * kk * jj) / NA);
        fs[jj] = Math.sin((2 * Math.PI * kk * jj) / NA);
      }
      COS.push(fc);
      SIN.push(fs);
    }
    function altaFrecuencia(rho) {
      var v = new Float64Array(NA),
        m = 0,
        validos = 0;
      for (var jj = 0; jj < NA; jj++) {
        var th = (2 * Math.PI * jj) / NA;
        var val = bilC(RN + rho * RN * Math.cos(th), RN + rho * RN * Math.sin(th));
        v[jj] = isNaN(val) ? NaN : val;
        if (!isNaN(val)) {
          m += val;
          validos++;
        }
      }
      if (validos < NA * 0.9) return 0;
      m /= validos;
      for (var jj2 = 0; jj2 < NA; jj2++) v[jj2] = isNaN(v[jj2]) ? 0 : v[jj2] - m;
      var e = 0;
      for (var kq = 0; kq < COS.length; kq++) {
        var re = 0,
          imj = 0,
          fc = COS[kq],
          fs = SIN[kq];
        for (var jq = 0; jq < NA; jq++) {
          re += v[jq] * fc[jq];
          imj += v[jq] * fs[jq];
        }
        e += re * re + imj * imj;
      }
      return Math.sqrt(2 * e) / NA;
    }
    function bilC(fx, fy) {
      if (fx < 0 || fy < 0 || fx > S - 1 || fy > S - 1) return NaN;
      var ix = Math.floor(fx),
        iy = Math.floor(fy);
      var ix1 = Math.min(ix + 1, S - 1),
        iy1 = Math.min(iy + 1, S - 1);
      var tx = fx - ix,
        ty = fy - iy;
      return cL[iy * S + ix] * (1 - tx) * (1 - ty) + cL[iy * S + ix1] * tx * (1 - ty) + cL[iy1 * S + ix] * (1 - tx) * ty + cL[iy1 * S + ix1] * tx * ty;
    }
    function indice(radios) {
      var t = 0;
      for (var ir = 0; ir < radios.length; ir++) {
        var hf = altaFrecuencia(radios[ir]);
        t += hf / (hf + 6);
      }
      return radios.length ? t / radios.length : 0;
    }
    var radiosExternos = [];
    var inicio = Math.min(fronteras[2] + 0.03, 0.85);
    for (var rho = inicio; rho <= 0.94 + 1e-9; rho += 0.03) radiosExternos.push(rho);
    var radialidad = indice(radiosExternos);
    var picos = indice([0.88, 0.92, 0.96]);

    // 10 · Simetría: correlación de perfiles radiales en sectores opuestos.
    var SECT = 8,
      AN = 25;
    var sect = [];
    for (var s0 = 0; s0 < SECT; s0++) sect.push({ s: new Float64Array(AN), c: new Float64Array(AN) });
    for (var o5 = 0; o5 < SS; o5 += 2) {
      if (cR[o5] >= 1 || isNaN(cL[o5])) continue;
      var sIdx = Math.floor(((cT[o5] + Math.PI) / (2 * Math.PI)) * SECT) % SECT;
      var aIdx = Math.min(AN - 1, Math.floor(cR[o5] * AN));
      sect[sIdx].s[aIdx] += cL[o5];
      sect[sIdx].c[aIdx]++;
    }
    function perfilSector(sx0) {
      var out = [];
      for (var a = 0; a < AN; a++) out.push(sx0.c[a] ? sx0.s[a] / sx0.c[a] : NaN);
      return out;
    }
    function pearson(u, v) {
      var pu = [],
        pv = [];
      for (var i = 0; i < u.length; i++)
        if (!isNaN(u[i]) && !isNaN(v[i])) {
          pu.push(u[i]);
          pv.push(v[i]);
        }
      if (pu.length < 5) return 0;
      var mu = media(pu),
        mv = media(pv),
        num = 0,
        du = 0,
        dv = 0;
      for (var j = 0; j < pu.length; j++) {
        num += (pu[j] - mu) * (pv[j] - mv);
        du += (pu[j] - mu) * (pu[j] - mu);
        dv += (pv[j] - mv) * (pv[j] - mv);
      }
      return du && dv ? num / Math.sqrt(du * dv) : 0;
    }
    var simetria = 0;
    for (var s1 = 0; s1 < SECT / 2; s1++) simetria += pearson(perfilSector(sect[s1]), perfilSector(sect[s1 + SECT / 2]));
    simetria = clamp01(simetria / (SECT / 2));

    // 11 · Intensidad de color: croma C* de las zonas orgánica y externa, y
    //      nitidez de las fronteras.
    var sumC = 0,
      nC = 0;
    for (var o6 = 0; o6 < SS; o6 += 2) {
      if (cR[o6] < fronteras[1] || cR[o6] >= 1 || isNaN(cL[o6])) continue;
      sumC += Math.sqrt(cA[o6] * cA[o6] + cB[o6] * cB[o6]);
      nC++;
    }
    var cromaMedia = nC ? sumC / nC : 0;
    var intensidad = 0.6 * clamp01(cromaMedia / 40) + 0.4 * clamp01(media(contrastes) / 25);

    var rasgos = {
      center_xy: [r1(cx), r1(cy)],
      outer_radius_px: r1(R),
      radial_profile_lab: perfil.map(function (v) {
        return [r1(v[0]), r1(v[1]), r1(v[2])];
      }),
      zone_boundaries_rel: fronteras.map(r3),
      zone_boundaries_source: origenFronteras,
      zone_colour_median_lab: colorZona,
      radiality_index: r3(radialidad),
      spike_index: r3(picos),
      edge_irregularity: r3(circularidad),
      colour_intensity_index: r3(intensidad),
      texture_entropy_by_zone: entropia,
      texture_entropy_method: "histograma L* de 32 clases, bits",
      symmetry_score: r3(simetria),
      capture_quality: { sharpness: reporte.nitidez, white_balance_ok: fondoClaro, usable_area_ratio: reporte.area_util },
    };
    return { version: VERSION, valida: true, validation_report: reporte, rasgos: rasgos, ford_programatico: fordDesdeRasgos(rasgos) };
  }

  var api = {
    VERSION: VERSION,
    UMBRALES: UMBRALES,
    ZONAS_NOMINALES: ZONAS_NOMINALES,
    MOTIVOS: MOTIVOS,
    analizar: analizar,
    fordDesdeRasgos: fordDesdeRasgos,
  };
  root.CromaRasgos = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
