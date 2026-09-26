# `agtron` · Disco Agtron (Agtron Dial)

> Ficha de la herramienta dentro del componente `herramientas-cafe`. Se lee DESPUÉS del charter
> (`docs/componentes/herramientas-cafe.md`) y del recuento (`../README.md`). Estado al 2026-09-26 (V5.93, **V8** de la herramienta).
> Esta carpeta es el sitio para los briefs y notas de la conversación de esta herramienta.

| | |
|---|---|
| Estado | Viva · **V8** |
| Nivel | default |
| Idioma | en (el `<head>` y la columna `tools.lang`) · la herramienta habla **ES · EN · DE** |
| Superficies (`tools.kr/cp/web/dc`) | KR · CP · web |
| Memoria | sí · **esquema propio** `agtron-dial/1` (V5.93) |
| Trabajos guardados | 1 (de la V7: solo guardó el matiz; se sigue abriendo) |

## Dónde vive

**Servida** (`public/tools/agtron/`, URL `/tools/agtron/<archivo>`; la URL plana vieja es un 308):
- agtron-dial.html — la V8; solo difiere de la fuente en el `<head>` (fuentes locales + meta description) y la línea del puente.

**Fuentes del owner** (`C:\dev\ctc-platforms\reference\html_tools\agtron\`, fuera de git):
- agtron_dial_metre-V7.html — la del owner (2026-07-20).
- agtron_dial_metre-V8.html — la V8 (2026-09-26), escrita en la conversación de esta herramienta sobre la V7.

**Cómo se hizo la V8 (y cómo se hará la V9).** El archivo pesa ~600 KB, de los que ~480 KB son 7 imágenes en base64 (logo, dos
figuras del panel «i» y las cuatro máscaras de los granos). Para editar sin cargarlas: se separan las `data:image/...;base64,...` en
un mapa JSON y se deja un marcador `data:__B64_n__` (0 logo · 1 tabla de referencia · 2 foto de discos · 3–6 máscaras de granos);
se edita la plantilla; se reinyecta para escribir la fuente `-V9.html`; y la copia servida se arma tomando de la servida ACTUAL el
bloque entre `</title>` y el `<style>` principal (meta description + fuentes locales) y el bloque del puente antes de `</body>`.
Ojo: la copia de trabajo de `public/` está en CRLF (`core.autocrlf=true`): normalizar antes de buscar anclas.

## Lo que hace la V8 (V5.93)

- **Dial** 0–100 (Gourmet / Commercial ≈ Gourmet × 0,75), tres muestras (color plano, un grano, un puñado), **matiz** y **brillo**
  solo de visualización, ocho tramos con nombre, equivalencias aproximadas Probat Colorette y Tonino.
- **Ventana de catación SCA**: ≈ 58 en grano entero y 63 en molido, escala Gourmet, ±1 (conmutador Grano entero · Molido): banda
  en el dial y estado («dentro» · «N ptos más claro/oscuro que el objetivo»).
- **Lectura por foto** (feedback del owner, 2026-09-26): foto con **luz de día o luz blanca a unos 12 cm**, sin flash y con papel
  blanco en el encuadre. Herramientas **Puntos** (hasta 7; cada uno muestrea ≈ 1,5 % de la foto, siete bien repartidos ≈ 10,5 %),
  **Área** (rectángulos arrastrados, varios), **Blanco** (el papel) y **Mover** (con zoom). El **% del área marcada** se ve en vivo
  (también mientras se arrastra) y **Aplicar exige el 10 %**. Se promedia la UNIÓN de lo marcado en luz lineal; **el número sale
  de L\*** (curva de anclajes invertida) y el matiz, del color que sobra. Con blanco, cada canal se escala para que el papel lea
  L\* 95 neutro. Avisos: blanco quemado (> 25 % de píxeles ≥ 250), blanco no más claro que el café, sin blanco. El aplicado
  automático dispara **una vez**, 10 s después del último cambio; mover el dial a mano lo cancela y borra la procedencia «desde foto».
- **Idioma**: `?lang=` → la clave que la superficie guardó en ese origen (`ctc-lang`, `cp-lang`, `kr-lang`) → el navegador → EN.
- **Memoria**: `CTC.usarEstado` con `{ esquema: 'agtron-dial/1', valor, escala, forma, matiz, brillo, foto }` (`foto` = `{ pct,
  blanco, hex, lab }` cuando el número salió de una foto; la foto NUNCA se guarda) y `CTC.usarResumen` → «Agtron 58 · Gourmet ·
  Medium Dark». Un trabajo de la V7 (`{ "i:hueSlider": … }`) restaura el matiz. El registro se hace en `DOMContentLoaded` y se
  re-anuncia `ready`, como el Lector de Cromatografía (el puente carga después del script de la herramienta).

**Probado** (Chrome headless, fotos sintéticas con exposición y dominante conocidas): neutra 45 → 45; subexpuesta ×0,7 + cálida,
70 real → 62 sin blanco, **70 con blanco**; ×1,04 + fría 55 → 55; blanco quemado → aviso; 6 puntos 9,0 % (bloquea), 7 puntos
10,5 % (habilita), deshacer; aplicado único y el dial manual ya no se sobrescribe; idiomas; captura y restauración por el puente;
móvil 375 px sin scroll horizontal. El guardián `qa-tools-puente-conformance` la sondea (captura + resumen + restaura).

## Como interfaz en otras partes de la plataforma

**Hoy:**
- Cherry Picked · Gadgets (`GadgetsSection.tsx`) y Directorio (`PanelHerramientas.tsx`) la ofrecen por nombre. El comentario de
  `GadgetsSection.tsx` que la llama «inglés» quedó viejo (es de `cherry-picked`; anotado en ALINEACION §3, V5.93).

**Previsto / candidato:**
- **Master Roaster** (socios) y perfiles de tueste de Papagayo Beans®.
- EVA / Centro de Calidad: color de tueste de la muestra de catación — la ventana SCA ya está en la herramienta.
- Ficha técnica del lote (tueste recomendado).

> Regla: una pieza que otra parte de la plataforma reutiliza se EXTRAE a una fuente única (datos puros en
> `src/lib/tools/agtron/`: anclajes, tramos, ventana SCA, lectura por L\*) — nunca una copia que se separa. Tocar el
> componente que la consume exige línea en `docs/ALINEACION.md` §3.

## Abierto

1. **Nombres de tramo (decisión del owner o de un catador)**: los discos SCAA son #25 Very Dark · #35 Dark · #45 Moderately Dark ·
   **#55 Medium · #65 Light Medium · #75 Moderately Light** · #85 Light · #95 Very Light; la herramienta dice Medium Dark, Medium y
   Medium Light en esos tres, y rotula el tramo más claro «Light City» (en el orden tradicional el Cinnamon es más claro que el City).
   No se tocó en la V8.
2. **Alemán**: lo escribió la IA; falta la revisión de un hablante nativo.
3. **Calibrar con fotos reales** de móvil contra un Agtron o un kit de discos (misma muestra, grano y molido): la V8 está probada con
   fotos sintéticas, que validan el método, no la curva de anclajes.
4. **Anclajes L\*a\*b\***: el panel «i» dice que vienen de «correlaciones publicadas» pero no cita la fuente de los números.
5. `maximum-scale=1.0` en el viewport impide el zoom con los dedos en el móvil (es `<head>`: se puede tocar; no se pidió).
6. `tools.lang` sigue en `en` (manda el `<html lang>` del archivo, que es el idioma por defecto).

## Kick-off de su conversación

El del charter (`docs/componentes/herramientas-cafe.md` § Kick-off) con `<id>` = `agtron` y:

```
Hoy: Revisar el Disco Agtron V8 con fotos reales y decidir los nombres de tramo (ficha § Abierto).
```
