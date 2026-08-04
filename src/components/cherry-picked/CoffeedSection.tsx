"use client";

// Coffeed en Cherry Picked: los capítulos publicados por el Estudio de
// Contenido, en carrusel. La cabecera se traduce; los capítulos se producen
// en español (la lengua editorial de Coffeed) y se muestran tal cual.

import { useLang, type Lang } from "./i18n";
import { CoffeedWall, type CoffeedWallLabels } from "@/components/coffeed/CoffeedWall";

const EN = {
  eyebrow: "Coffeed · the network's newsfeed",
  title: "The coffee market, told in chapters",
  sub: "Short panel-by-panel episodes on price, regulation, quality and logistics — produced by the network's content studio. Episodes are written in Spanish, the editorial language of origin.",
  labels: {
    chapter: "Chapter",
    panels: "panels",
    announcement: "Announcement",
    pinned: "pinned",
    video: "Video",
    shared: "Shared",
    emptyTitle: "The first chapter is in production",
    emptyBody: "Coffeed is the CTC network's newsfeed: short chapters on the coffee market, told in panels. Check back soon.",
    loading: "Loading the wall…",
  } as CoffeedWallLabels,
};

const T: Record<Lang, typeof EN> = {
  en: EN,
  es: {
    eyebrow: "Coffeed · el noticiero de la red",
    title: "El mercado del café, contado en capítulos",
    sub: "Episodios breves, panel a panel, sobre precio, regulación, calidad y logística — producidos por el estudio de contenido de la red.",
    labels: {
      chapter: "Capítulo",
      panels: "paneles",
      announcement: "Anuncio",
      pinned: "fijado",
    video: "Video",
    shared: "Compartido",
      emptyTitle: "El primer capítulo está en producción",
      emptyBody: "Coffeed es el noticiero de la red CTC: capítulos breves sobre el mercado del café, en paneles. Vuelve pronto.",
      loading: "Cargando el muro…",
    },
  },
  de: {
    eyebrow: "Coffeed · der Newsfeed des Netzwerks",
    title: "Der Kaffeemarkt, erzählt in Kapiteln",
    sub: "Kurze Episoden, Panel für Panel, über Preis, Regulierung, Qualität und Logistik — produziert vom Content-Studio des Netzwerks. Die Episoden erscheinen auf Spanisch, der redaktionellen Sprache des Ursprungs.",
    labels: {
      chapter: "Kapitel",
      panels: "Panels",
      announcement: "Ankündigung",
      pinned: "angeheftet",
    video: "Video",
    shared: "Geteilt",
      emptyTitle: "Das erste Kapitel ist in Produktion",
      emptyBody: "Coffeed ist der Newsfeed des CTC-Netzwerks: kurze Kapitel über den Kaffeemarkt, in Panels erzählt. Schau bald wieder vorbei.",
      loading: "Die Wand wird geladen…",
    },
  },
};

export function CoffeedSection() {
  const lang = useLang();
  const t = T[lang];
  return (
    <section id="coffeed">
      <div className="wrap">
        <p className="eyebrow">{t.eyebrow}</p>
        <h2>{t.title}</h2>
        <p style={{ maxWidth: "62ch", marginBottom: 22 }}>{t.sub}</p>
        <CoffeedWall labels={t.labels} accent="var(--accent, #a3241b)" />
      </div>
    </section>
  );
}
