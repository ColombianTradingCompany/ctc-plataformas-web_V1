# `incoterms` · Navegador de Incoterms® 2020 (mar y aire)

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-10-29 (V6.14, **V1** de la herramienta).

| | |
|---|---|
| Estado | Viva · **V1** · nueva (V6.14) — **alta en `tools` pendiente del deploy** (acta `docs/migraciones/2026-10-29_tools_incoterms.sql`) |
| Nivel | default (decisión por omisión de la sesión; se cambia en BCP · Herramientas sin desplegar) |
| Idioma | **en · es · ja · de** (conmutador propio; `?lang=` manda sobre la preferencia guardada y el idioma del navegador; el `<html lang>` servido es `en`) |
| Superficies (`tools.kr/cp/web/dc`) | KR · CP · web (DC apagada) — por omisión, el owner decide |
| Memoria | **no**: el estado es solo regla · idioma · destino; la regla viaja en el hash (`#fob`, `#cif-cip`), idioma y destino en `localStorage` |
| Trabajos guardados | — |

## Qué es

Los once Incoterms® 2020 explicados para compradores y para la casa, **con la regla marítima y su equivalente aéreo lado a lado**.
Un deslizador recorre nueve puntos de entrega (EXW → FCA → FAS → FOB → CFR/CPT → CIF/CIP → DAP → DPU → DDP); en FAS y FOB el carril
aéreo dice «sin equivalente, use FCA» y explica por qué «FOB aeropuerto» no existe. Cada carril trae el diagrama del recorrido (morado =
paga el vendedor, dorado = paga el comprador, rombo rojo = pasa el riesgo), la tira de los 13 rubros de costo, los sellos de despacho
(exportación / importación) y los datos clave. Ocho pestañas siguen al deslizador: Resumen · Quién hace qué (A1–A10 / B1–B10) · Quién paga
(13 rubros con notas) · Riesgo y seguro (ICC (A) vs (C)) · Documentos (juego de exportación colombiano, juego de importación del destino) ·
Trampas · **Destino** (Estados Unidos · UE/Alemania · Japón · Reino Unido · otro: aranceles de 0901.11 y 0901.21, IVA/consumo, trámites,
puertas de entrada) · Las 11 reglas (escalera de obligación + matriz clásica). Glosario con diálogo. **«Imprimir hoja de dos páginas»**
arma un resumen imprimible de la selección (regla, pareja mar/aire, destino, idioma) con redacción sugerida para el contrato, línea legal
de la casa y «Copiar como texto»; la impresión usa `@media print` (A4). Sin servidor, sin IA, sin CDN.

## Dónde vive

**Servida** (`public/tools/incoterms/`, URL `/tools/incoterms/<archivo>`):
- `incoterms-navigator.html` — la V1 (~456 KB: cuatro idiomas, el loro y el QR en base64, las tipografías Anton e Inter de `assets/fonts/`).

**Fuente** — EXCEPCIÓN al patrón `reference/html_tools/<id>/`: la fuente vive **en git, en el repo privado de la campaña SCAJ 2026**
(`ColombianTradingCompany/ctc-campana-scaj2026`, `entregables/incoterms-navigator/`), porque la herramienta nació allí como entregable:
- `src/page.html` — maqueta, CSS, datos estructurales (paradas, reglas, matriz S/B, nodos del diagrama) y los renderizadores.
- `src/i18n/{en,es,ja,de}.js` — un paquete de contenido por idioma, **misma estructura** (549 claves; la paridad se comprueba al construir).
- `src/fonts-local.css` — las `@font-face` de Anton e Inter copiadas de `calculadora-logistica` (rutas `/tools/assets/fonts/`).
- `build.py` — arma `index.html` (sabor artefacto de claude.ai: sin esqueleto, Google Fonts) y `dist/incoterms-navigator.html`
  (sabor plataforma: esqueleto completo, `<head>` de la casa, fuentes locales). La copia servida aquí ES ese `dist/`.

**Cómo se edita.** En el repo de la campaña: tocar `src/`, correr `python3 build.py`, copiar `dist/incoterms-navigator.html` a
`public/tools/incoterms/` y desplegar. No se edita el HTML servido a mano: la próxima construcción lo pisaría.

## Lo que trae la V1 (V6.14)

- **Contenido verificado el 2026-10-29**: Incoterms® 2020 sigue vigente (la siguiente edición se espera hacia 2029–2030); los cambios 2020
  (DAT → DPU, CIP con ICC (A), opción de B/L «a bordo» en FCA, costos en A9/B9); aranceles e impuestos por destino desde los aranceles
  públicos (US HTS, TARIC, Aduana de Japón, UK Trade Tariff) y la Kaffeesteuer alemana (2,19 €/kg tostado). Nada de precios internos.
- **`<head>` de la casa**: título «Incoterms® 2020 Navigator · Colombian Trading Company», meta description en inglés con el sufijo
  (156 caracteres), favicon con el loro.
- **Diseño**: un solo color por significado (morado vendedor, dorado comprador, rojo riesgo); iconos de línea propios (bodega, grúa, torre,
  barco, avión, camión, tren, sello, monedas, escudo, montacargas…); tema claro y oscuro; teclado (flechas en pestañas y deslizador).
- La frase de anti-elusión de la casa («a los productores se llega a través de CTCx, nunca rodeándolo») va en la pestaña Destino.

## Guardianes

- `qa-tools-carpetas` y `qa-tools-seo-check` la recorren por estar en su carpeta; `qa-tools-seo-espejo` la comparará con `tools.meta_description`
  en cuanto exista la fila.
- Sin guardián propio todavía. Candidato `qa-incoterms-check`: paridad de claves entre los cuatro paquetes (hoy la hace `build.py`), matriz
  S/B de las 11 reglas contra la tabla de referencia, y que cada regla tenga ejemplo escrito con «Incoterms® 2020».

## Abierto

1. **Alta en `tools`** tras el deploy, con el acta de `docs/migraciones/2026-10-29_tools_incoterms.sql` (y la captura del carrusel si no se
   generó en esta tanda: `node scripts/build-tool-shots.mjs incoterms` con `next dev` arriba).
2. **Nivel y superficies** puestos por omisión (default · KR · CP · web); el owner decide en BCP · Herramientas.
3. **Revisión por hablantes nativos** del japonés y del alemán (escritos en la sesión, como el de Gulliver: decisión 4 de aquel brief).
4. **Tres datos por confirmar con el agente de aduanas** antes de usar la hoja con compradores: si Japón exige certificado fitosanitario
   al café verde (las fuentes discrepan), el estatus SGP de Colombia en Japón para el tostado, y el anexo vigente del arancel 301 de EE. UU.
   (el café se reportó exento).
5. **Imprimir dentro de la concha**: `window.print()` desde el iframe imprime el documento del iframe en los navegadores de escritorio; falta
   comprobarlo en producción en móvil. El botón ofrece «Copiar como texto» como salida alterna.
6. **Memoria con el puente**: no se pidió; si algún día se quiere, el estado es trivial (`{v:1, stop, lang, dest}`).

## Hoy (línea para la próxima conversación)

```
Hoy: Navegador de Incoterms (incoterms). <la tarea>. Lee primero esta ficha; la FUENTE está en el repo de la campaña
SCAJ 2026 (entregables/incoterms-navigator/, build.py) y la copia servida es dist/ copiado a public/tools/incoterms/.
```
