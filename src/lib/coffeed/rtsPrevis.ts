import "server-only";

// ── RT-Scriptor · revelar un fotograma ───────────────────────────────────────
//
// Desde la V3.2 este archivo NO dibuja. La composición vive en
// `components/coffeed/rtscriptor/stage.ts`, que es puro y lo usan los dos
// lados: la app lo pinta en vivo mientras mueves un mando, y aquí se serializa
// el MISMO cuadro a un archivo.
//
// Ése era el bug de fondo de la V3.1: había una rutina de dibujo en el
// servidor y otra cosa distinta en la pantalla, así que «Acción» revelaba algo
// que no era lo que estabas mirando. Ahora revelar es congelar.
//
// La fase 1 sigue siendo geometría, no fotografía. El prompt compuesto viaja
// con cada fotograma para que la fase 2 —una imagen de verdad por Gemini, vía
// Make— no tenga que rehacer el trabajo caro.

import type { Deck, Project, Scene, Take } from "@/components/coffeed/rtscriptor/model";
import { camLabel, marksOf, tc } from "@/components/coffeed/rtscriptor/model";
import { composeStage, stageToSvg, type StageActor, type StageProp } from "@/components/coffeed/rtscriptor/stage";

/** Los instantes que se muestrean de una toma: repartidos, extremos incluidos. */
export function frameTimes(dur: number, frames: number): number[] {
  if (frames <= 1) return [Math.round(dur / 2)];
  return Array.from({ length: frames }, (_, i) => Math.round((i / (frames - 1)) * dur));
}

export function stageActors(project: Project, take: Take): StageActor[] {
  const marks = marksOf(take);
  return take.cast
    .map((cid) => {
      const ch = project.characters.find((c) => c.id === cid);
      if (!ch) return null;
      return { id: ch.id, color: ch.color, mark: marks[cid], height: 172 } satisfies StageActor;
    })
    .filter(Boolean) as StageActor[];
}

export function stagePalette(deck: Deck | null) {
  const pal = deck?.palette?.length ? deck.palette : ["#141A1B", "#1B2A33", "#C9C6BD"];
  return { ground: pal[0] ?? "#141A1B", sky: pal[1] ?? "#1B2A33", ink: pal[2] ?? "#C9C6BD" };
}

export function previsFrame(input: {
  project: Project;
  scene: Scene;
  take: Take;
  deck: Deck | null;
  props?: StageProp[];
  n: number;
  frames: number;
  at: number;
  sceneNo: number;
}): string {
  const { project, scene, take, deck, n, frames, at, sceneNo } = input;

  const draw = composeStage({
    cam: take.cam,
    treatment: take.treatment,
    actors: stageActors(project, take),
    props: input.props ?? [],
    palette: stagePalette(deck),
    aspect: project.aspect,
    // La fase dentro de la toma: solo la usa la cámara en mano, que no está
    // quieta. Determinista, para que revelar dos veces dé lo mismo.
    phase: frames > 1 ? (n - 1) / (frames - 1) : 0.5,
  });

  return stageToSvg(draw, {
    slate: `SC${String(sceneNo).padStart(2, "0")} · T${String(take.no).padStart(2, "0")} · ${camLabel(take)}`,
    foot: `${project.code || project.title.slice(0, 12).toUpperCase()} · ${scene.int}. ${scene.location} — ${scene.tod}`,
    right: `${tc(at)} · ${n}/${frames}`,
    ink: stagePalette(deck).ink,
  });
}
