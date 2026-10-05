"use client";

import { BANDAS_PUNTOS, PUNTOS_MAX, SCA_TYRIAN, letras, puntosCtc, type Triada } from "@/lib/pvc/escala";

/** La curva: puntos contra SCA para la tríada elegida, sobre las cinco bandas.
 *  Enseña de un vistazo lo que ninguna tabla dice — que el surplus no desplaza
 *  la línea, la inclina. V5.158: sale de `EscalaBoard` a su propio archivo para que el informe del Centro en el OCP
 *  pinte la misma curva con la tríada del lote. */
export function CurvaDeEscala({ t, sca, puntos }: { t: Triada; sca: number; puntos: number }) {
  const W = 720, H = 300, L = 46, R = 12, T = 10, B = 28;
  const x = (s: number) => L + ((s - 78) / 22) * (W - L - R);
  const y = (p: number) => T + (1 - p / PUNTOS_MAX) * (H - T - B);
  const linea = (tri: Triada) => {
    let d = "";
    for (let s = 78; s <= 100.001; s += 0.25) {
      const p = puntosCtc(s, tri).puntos;
      d += `${d ? " L" : "M"}${x(s).toFixed(1)} ${y(p).toFixed(1)}`;
    }
    return d;
  };
  const ccc: Triada = { variedad: "C", proceso: "C", reconocimiento: "C" };
  const hayS = letras(t) !== "CCC";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
         aria-label="Puntos por puntaje SCA, con las cinco bandas de la escala">
      {BANDAS_PUNTOS.map((b) => (
        <g key={b.id}>
          <rect x={L} y={y(b.max)} width={W - L - R} height={Math.max(0, y(b.min) - y(b.max))} fill={b.hex} opacity="0.10" />
          <text x={W - R - 4} y={y(b.min) - 4} textAnchor="end" fontSize="10" fill={b.hex} fontWeight="600">{b.nombre}</text>
        </g>
      ))}
      {[1000, 1400, 1600, 1800, 2000, 2500].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeWidth="1" opacity="0.6" />
          <text x={L - 6} y={y(v) + 3} textAnchor="end" fontSize="9.5" fill="var(--muted)">{v}</text>
        </g>
      ))}
      {[80, 82, 84, 86, 88, 89, 92, 96, 100].map((s) => (
        <text key={s} x={x(s)} y={H - 10} textAnchor="middle" fontSize="9.5" fill="var(--muted)">{s}</text>
      ))}
      <line x1={x(SCA_TYRIAN)} x2={x(SCA_TYRIAN)} y1={T} y2={H - B} stroke="var(--muted)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
      <path d={linea(ccc)} fill="none" stroke="var(--ink)" strokeWidth="1.5" opacity="0.45" />
      {hayS && <path d={linea(t)} fill="none" stroke="var(--accent, #8A5A2B)" strokeWidth="2.2" />}
      <circle cx={x(sca)} cy={y(puntos)} r="6" fill="var(--accent, #8A5A2B)" stroke="var(--card)" strokeWidth="2" />
    </svg>
  );
}
