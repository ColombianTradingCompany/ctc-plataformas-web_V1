# private/herramientas-internas · herramientas sueltas del equipo, guardadas y todavía sin montar

HTML autónomos que el equipo usa en su navegador y que van a **Herramientas Internas** (ECP). Viven en `private/` y no en
`public/` para que nadie los abra sin sesión: **hoy no los sirve ninguna ruta** (`next.config.ts` solo traza
`private/ocp-apps/**`), así que se usan **abriendo el archivo en local** (doble clic) hasta que se monten en la consola.

| Archivo | Herramienta | Estado |
|---|---|---|
| `divisor-de-video.html` | **Divisor de video** (Video Splitter): cortar un video largo en clips | guardado el 2026-11-10; sin montar en el ECP |

## Divisor de video

Se carga un video, se reproduce, y se colocan **marcadores de corte** donde debe terminar cada clip (botón «Add cut here» o
tecla **M**, doble clic en la línea de tiempo; los marcadores se arrastran, y «Suggest cuts» propone cortes cada ~5 min con
clips de 4 a 7 min). Un **relleno de 0 a 3 s** (por defecto 2 s) se suma antes y después de cada corte, para que los clips
vecinos se solapen. El **nombre es obligatorio** y cada clip lo hereda con su número delante: `(1 of 5) Nombre.mp4`,
`(2 of 5) Nombre.mp4`… Los clips se guardan como descargas o directamente en una carpeta (Chrome/Edge).

- **Nada se sube a ningún sitio**: el video se procesa en el navegador. Hace falta internet solo para cargar las librerías
  de jsDelivr, con versión fijada en el import map del propio archivo: [Mediabunny](https://mediabunny.dev) 1.62.1 (MPL-2.0)
  y, solo para videos que el navegador no sabe mostrar, `@hevcjs/mediabunny-plugin` 0.1.1 + `@hevcjs/core` 1.7.0 (MIT).
- **Corte rápido (por defecto)**: copia el video sin recodificar (calidad original, segundos). En MP4/MOV cada clip empieza en
  el fotograma exacto; en MKV/WebM/TS puede empezar en el keyframe anterior (solo añade solape).
- **Videos HEVC / H.265 de teléfono** (p. ej. Pixel): si el navegador no los pinta, la herramienta decodifica los fotogramas
  ella misma (WebAssembly) y el reproductor queda para el audio. Es más lento al saltar; la exportación no cambia.
- Recuerda en el navegador (`localStorage`) los cortes y el nombre de cada video, para no perderlos al recargar.
- También da los mismos cortes como comandos de `ffmpeg`.

**Probado** en Chromium sin cabeza el 2026-11-10: MP4 H.264, MKV, WebM, MPEG-TS y HEVC Main 10 rotado (tipo Pixel); el primer
fotograma de cada clip coincide con el del original en el corte, y la vista previa HEVC enseña el fotograma correcto. **Sin
probar**: video real de cámara o teléfono, Safari y Firefox.

## Pendiente para montarla en el ECP

Es la pendiente del charter `herramientas-internas` del 2026-11-10. Montarla es una tanda con versión, no un cambio de
archivo: (1) servirla detrás de la sesión de la consola, como `private/ocp-apps/` (ruta + lista blanca + traza en
`next.config.ts` + guardián); (2) su entrada en el rail del ECP — el rail es de `consolas` y no promete lo que no hay; (3)
decidir con el owner en qué grupo va. Ojo: el charter dice que las utilidades del equipo (Transcriptor, Herramienta de Guion)
salieron de este componente el 2026-09-19 hacia «ECP · Caja de herramientas» de `consolas`; esta se pidió para Herramientas
Internas el 2026-11-10, así que el grupo lo confirma el owner.
