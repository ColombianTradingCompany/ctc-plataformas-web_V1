# `incoterms` · Navegador de Incoterms® 2020 (mar y aire)

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-10-30 (V6.15, **V2** de la herramienta).

| | |
|---|---|
| Estado | Viva · **V2** (V6.15) · nueva en la V6.14 · **alta en `tools` hecha el 2026-10-29** tras el deploy 93a3aad (acta `docs/migraciones/2026-10-29_tools_incoterms.sql`) |
| Nivel | **plus** (owner, 2026-10-29: «make it Plus»; `tools.tier` por SQL) |
| Idioma | **en · es · ja · de** (conmutador propio; `?lang=` manda sobre la preferencia guardada y el idioma del navegador; el `<html lang>` servido es `en`) |
| Superficies (`tools.kr/cp/web/dc`) | KR · CP · web (DC apagada) — por omisión |
| Memoria | **no**: el estado es regla · idioma · destino; la regla viaja en el hash (`#fob`, `#cif-cip`), idioma y destino en `localStorage` (`?dest=` manda) |
| Trabajos guardados | 0 |

## Qué es

Los once Incoterms® 2020 explicados para compradores y para la casa, **con la regla marítima y su equivalente aéreo lado a lado**, para
cualquier destino. Un **selector de mercado** arriba de la página elige entre Estados Unidos · Unión Europea (con los 27 códigos de miembros a
la vista) · Japón · China · Corea del Sur · Canadá · Australia · Emiratos Árabes Unidos · otro. Un deslizador recorre nueve puntos de entrega
(EXW → FCA → FAS → FOB → CFR/CPT → CIF/CIP → DAP → DPU → DDP); en FAS y FOB el carril aéreo dice «sin equivalente, use FCA». Cada carril trae el
diagrama del recorrido (morado = paga el vendedor, dorado = paga el comprador, rombo rojo = pasa el riesgo), la tira de los 13 rubros de costo,
los sellos de despacho y los datos clave.

**Diez pestañas** siguen al deslizador y al destino: Resumen · Quién hace qué (A1–A10 / B1–B10) · Quién paga (13 rubros con notas) · Riesgo y
seguro (ICC (A) vs (C)) · Documentos (juego de exportación colombiano, juego de importación del destino) · Trampas · Las 11 reglas (escalera de
obligación + matriz) · **Destino** (aranceles 0901.11 y 0901.21, IVA o consumo, trámites, puertas de entrada, rutas) · **Reglas de importación**
(aduana y entrada, inocuidad, sanidad vegetal, etiquetado y normas, aranceles e impuestos, acuerdos y preferencias, cuidado con; más los
organismos oficiales del mercado) · **Puertos y aeropuertos** (mapa SVG del mercado con puertos y aeropuertos numerados; cada marcador abre un
panel con el volumen 2024, la relevancia cafetera, el tránsito típico desde Colombia, la web de la autoridad y los contactos de aduana, arancel,
inocuidad, sanidad vegetal, normas, promoción comercial, gremio cafetero y presencia colombiana). Glosario con diálogo. **«Imprimir hoja de dos
páginas»** arma un resumen imprimible de la selección (regla, pareja mar/aire, destino, idioma) con redacción sugerida para el contrato y la línea
legal de la casa; «Copiar como texto» como salida alterna. Sin servidor, sin IA, sin CDN.

## Dónde vive

**Servida** (`public/tools/incoterms/`, URL `/tools/incoterms/<archivo>`):
- `incoterms-navigator.html` — la V2 (~706 KB: cuatro idiomas con sus paquetes de destino, los mapas, el loro y el QR en base64, las
  tipografías Anton e Inter de `assets/fonts/`).

**Fuente** — EXCEPCIÓN al patrón `reference/html_tools/<id>/`: la fuente vive **en git, en el repo privado de la campaña SCAJ 2026**
(`ColombianTradingCompany/ctc-campana-scaj2026`, `entregables/incoterms-navigator/`), porque la herramienta nació allí como entregable:
- `src/page.html` — maqueta, CSS, sprite de iconos, datos estructurales (paradas, reglas, matriz S/B, nodos del diagrama, **organismos oficiales y
  puertas de entrada por mercado** con coordenadas, cifras 2024 y webs) y los renderizadores.
- `src/i18n/{en,es,ja,de}.js` — paquete de contenido base por idioma; `src/i18n/{en,es,ja,de}.dest.js` — paquete de destinos (mercados, reglas,
  tránsito, una nota por puerta). Misma estructura en los cuatro (773 claves; la paridad se comprueba al construir).
- `src/maps.js` — **generado** por `tools/make_maps.py` desde Natural Earth 1:50m (dominio público): contornos simplificados de cada mercado con
  vecinos tenues y la proyección con que se colocan los marcadores.
- `src/fonts-local.css` — las `@font-face` de Anton e Inter copiadas de `calculadora-logistica` (rutas `/tools/assets/fonts/`).
- `build.py` — arma `index.html` (sabor artefacto de claude.ai: sin esqueleto, Google Fonts) y `dist/incoterms-navigator.html` (sabor plataforma:
  esqueleto completo, `<head>` de la casa, fuentes locales). La copia servida aquí ES ese `dist/`.

**Cómo se edita.** En el repo de la campaña: tocar `src/`, correr `python3 build.py`, copiar `dist/incoterms-navigator.html` a
`public/tools/incoterms/` y desplegar. Los mapas solo se regeneran si cambian los mercados o sus cajas (`tools/make_maps.py <geojson>`). No se
edita el HTML servido a mano: la próxima construcción lo pisaría.

## Lo que trae la V2 (V6.15) sobre la V1

- **Selector de destino mundial** arriba (nueve mercados) en lugar del selector dentro de la pestaña Destino (US · UE · JP · UK · otro).
- **Reglas de importación** por mercado, investigadas el 2026-10-29 en fuentes públicas: GACC (Decretos 248/249/280, Anuncio 219/2025) y
  arancel NMF 8 %/15 % con IVA 9 %/13 % (China); TLC Corea–Colombia (verde 0 % de inmediato, tostado a cero en tres años) y la exención temporal
  de IVA al verde importado reportada hasta 2027 (Corea); arancel Free, CARM, SFCR, AIRS y GST tarifa cero (Canadá); arancel Free, BICON (fito sí,
  permiso no), IFIS y GST-free (Australia); arancel CCG (verde 0 % en la mayoría de las fuentes, 5 % por omisión), IVA 5 %, MOCCAE, Dubai
  Municipality, zonas francas (EAU); IVA por Estado miembro, Kaffeesteuer y los impuestos al café de BE · DK · HR · GR · LV, EUDR 2025/2650 (UE);
  Sección 301 del 2026-07 con el café reportado exento (EE. UU.); Japón como en la V1.
- **Puertos y aeropuertos**: 61 puertas (puertos: p. ej. Shanghái 51,5 M TEU, Róterdam 13,8, Amberes-Brujas 13,5, Jebel Ali 15,5, Busan 24,4,
  LA/LB 19,9, NY/NJ 8,7; aeropuertos: p. ej. MIA 2,75 Mt, ICN 2,95 Mt, PVG 3,78 Mt), cifras 2024 redondeadas de las autoridades o de ACI; webs
  oficiales; contactos solo con sitios oficiales (sin teléfonos ni nombres de funcionarios, a propósito).
- **Pestañas en filas** (la última quedaba cortada en pantallas medianas); marcadores numerados con separación automática en los cúmulos
  (bahía de Tokio, delta del río de las Perlas, Dubái) y panel lateral (hoja inferior en móvil).
- `<head>` de la casa sin cambios (misma meta description: la fila de `tools` la espeja).

## Guardianes

- `qa-tools-carpetas` y `qa-tools-seo-check` la recorren por estar en su carpeta; `qa-tools-seo-espejo` compara su meta description con
  `tools.meta_description` (necesita `.env.local`).
- Sin guardián propio todavía. Candidato `qa-incoterms-check`: paridad de claves entre los ocho paquetes (hoy la hace `build.py`), matriz S/B de
  las 11 reglas contra la tabla de referencia, que cada regla tenga ejemplo escrito con «Incoterms® 2020», y que cada puerta tenga nota en los
  cuatro idiomas.

## Abierto

1. **Revisión por hablantes nativos** del japonés y del alemán (escritos en la sesión, como el de Gulliver: decisión 4 de aquel brief).
2. **Datos por confirmar con el agente de aduanas** antes de usar la hoja con compradores, por mercado: Japón (si exige fito al verde; SGP de
   Colombia para el tostado) · EE. UU. (anexo vigente de la Sección 301) · China (clasificación de IVA del verde al 9 % y la vía de registro
   fitosanitario de los empacadores colombianos tras el Decreto 280) · Corea (vigencia de la exención de IVA al verde) · Canadá y Australia
   (si piden fito al lote concreto) · EAU (línea del arancel del verde, 0 % o 5 %, y estado del CEPA EAU–Colombia).
3. **Imprimir dentro de la concha**: `window.print()` desde el iframe imprime el documento del iframe en escritorio; falta comprobarlo en
   producción en móvil. El botón ofrece «Copiar como texto».
4. **Peso**: ~706 KB. Si estorba, bajar la tolerancia de los contornos de contexto en `make_maps.py` o cargar los paquetes de destino bajo demanda.
5. **Memoria con el puente**: no se pidió; si algún día se quiere, el estado es trivial (`{v:1, stop, lang, dest}`).
6. **Superficies** por omisión (KR · CP · web); el owner decide en BCP · Herramientas.

## Hoy (línea para la próxima conversación)

```
Hoy: Navegador de Incoterms (incoterms). <la tarea>. Lee primero esta ficha; la FUENTE está en el repo de la campaña
SCAJ 2026 (entregables/incoterms-navigator/: src/page.html, src/i18n/*.js y *.dest.js, src/maps.js generado, build.py) y la
copia servida es dist/ copiado a public/tools/incoterms/.
```
