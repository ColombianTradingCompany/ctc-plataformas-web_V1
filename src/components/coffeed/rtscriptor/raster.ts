"use client";

// ── Rasterizar el encuadre en el navegador ───────────────────────────────────
//
// La fase 2 le manda a Gemini el DIBUJO como referencia de composición, y para
// eso hace falta un PNG: un SVG no le sirve a un modelo de imagen.
//
// Se hace AQUÍ y no en el servidor por una razón concreta: `sharp` no es una
// dependencia declarada de este proyecto —llega de rebote con Next— y añadirla
// significaría cargar treinta megas de binarios nativos para una conversión que
// el navegador ya sabe hacer con un canvas y veinte líneas. Además el cliente ya
// tiene la composición delante: es literalmente el cuadro que está mirando.
//
// Efecto secundario que conviene recordar: esto deja resuelto el paso que la F4
// de integraciones tiene pendiente desde julio —«carrusel→Instagram exige render
// a imagen»—. El mismo helper vale.

import { composeStage, stageToSvg, type StageInput } from "./stage";

const SIN_QUEMAR = { slate: "", foot: "", right: "", ink: "#000000" };

/** SVG → PNG (data URL). Devuelve null si el navegador no puede: la fase 2 debe
 *  seguir funcionando sin referencia, solo con el prompt. */
export async function rasterizeSvg(svg: string, w: number, h: number): Promise<string | null> {
  try {
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("no se pudo cargar el svg"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

/**
 * Los dibujos de referencia de una toma, uno por fotograma, ya en PNG.
 * Se componen con la MISMA función que el servidor, así que la referencia que
 * viaja es exactamente el cuadro que hay en pantalla — no una aproximación.
 *
 * Se rasteriza a 768 px de ancho: suficiente para que un modelo lea el
 * encuadre, y bastante menos que mandar el cuadro a tamaño completo por una
 * Server Action.
 */
export async function stageRefs(base: StageInput, frames: number): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < frames; i++) {
    const phase = frames > 1 ? i / (frames - 1) : 0.5;
    const draw = composeStage({ ...base, phase, width: 768 });
    const png = await rasterizeSvg(stageToSvg(draw, SIN_QUEMAR), draw.w, draw.h);
    if (png) out.push(png);
    else out.push("");
  }
  return out;
}
