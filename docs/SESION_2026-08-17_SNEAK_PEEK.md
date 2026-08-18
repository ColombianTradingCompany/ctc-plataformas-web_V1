# Sesión 2026-08-17 · el plan V5 y el módulo «Sneak Peek»

Traspaso de una sesión larga. Lo que sigue es lo que hace falta saber para **abrir la siguiente y ejecutar**,
sin volver a deducir nada. Todo está empujado a `origin/main`; producción en **V4.21**.

> **Lo siguiente que toca hacer**: `docs/V5_CONSOLAS_PLAN.md` §2 — el paso (i), congelar los nombres → V4.22.
> El plan abre con un «▶ EMPIEZA AQUÍ» y §0.1 explica el bucle de cada paso.

---

## 1. Qué se hizo

**(a) El plan de la reorganización** — `docs/V5_CONSOLAS_PLAN.md` (`00c9721`). Es el paso (i) de F14: convierte
el PDF de estructura del owner y las decisiones de `ESTADO_Y_PREGUNTAS_2026-08-17.md` en pasos con PR y
versión propios. Contrastado contra el código real, no contra el recuerdo (`consoles.ts`, el árbol de rutas,
las compuertas de `lib/panel`, `next.config.ts`, el esquema vivo de Supabase). Radio de la mudanza medido:
**127 rutas `/bcp/` + 57 `/ecp/` + 34 `/ocp/`** escritas a mano y **20 archivos** con `revalidatePath`.

**(b) El módulo «Active Catalogue Sneak Peek»** — construido entero, V4.16 → V4.21. Cinta pública de tarjetas
de lote **sin un solo dato comercial**, montada en **siete superficies**, con siete lotes mock que se retiran
solos. Inventario y detalle en el §1 del plan y en la sección propia del HANDOFF.

**(c) Cambio de cara pública**: en Cherry Picked Green la cinta **sustituye** a la parrilla para quien no ha
entrado. `loadCatalog()` ya no corre sin sesión → los lotes y sus precios dejaron de ser públicos. Fue
decisión del owner (D0.5) y es lo más visible de toda la tanda.

**(d) La rama `fix/rastro-cacao` se cerró y se borró.** Era la otra respuesta al problema del cacao y no es la
que se desplegó; se rescataron dos cosas y el resto quedó documentado en el §9 del plan para que nadie repita
el análisis.

---

## 2. Lo que hay que saber antes de tocar el módulo

- **La cinta NO es una animación CSS.** La mueve un bucle de `requestAnimationFrame` sobre `translate3d`
  (`SneakPeek.tsx`). Con `@keyframes` el navegador reinicia la animación al cambiar velocidad o sentido, que
  era el salto visible al pasar el ratón por una flecha. La velocidad **persigue** a su objetivo.
- **El envoltorio de la posición no se aplica mientras se centra una tarjeta**, o la tarjeta no llega nunca y
  no se voltea. Costó un ciclo descubrirlo.
- ⚠️ **No importe un VALOR desde `lib/catalogo/sneakPeek.ts` en un componente de cliente**: ese módulo es
  `server-only` y arrastra `supabase/server` + `next/headers` al paquete del navegador → la página entera en
  500. Los TIPOS sí (se borran al compilar). Por eso los diez atributos SCA viven en `atributosSca.ts`.
  **`tsc --noEmit` NO lo ve**; lo caza el servidor de desarrollo.
- **Nada comercial puede salir por la cinta por construcción**: `SneakPeekLot` no tiene dónde poner precio,
  MOQ, kilos, anticipo ni fecha de llegada, y el guardián lo comprueba campo por campo.
- **Los mock se retiran de un tirón**: un archivo (`sneakPeekMock.ts`, con la receta en su cabecera), `mock:
  true` en cada entrada, ids `mock-lote-NN`, y sus activos en `public/images/catalogo/sneak-peek/` y
  `public/docs/fichas-mock/`. Y se retiran solos: el relleno solo llega a siete tarjetas, así que cada lote
  real publicado desplaza a un mock.
- **Los datos analíticos de los mock son INVENTADOS por encargo del owner** (2026-08-17). Suman exactamente el
  puntaje real de cada lote y los documentos van sellados MUESTRA. No inventado: puntaje total, variedad,
  proceso, finca y notas de cata — eso sale de Notion.
- **Verificación**: el panel de vista previa no sirve para nada con movimiento — no pinta fotogramas, no corre
  `requestAnimationFrame` y devuelve el valor inicial de una transición. Se mide con Chrome headless por CDP.

---

## 3. Estado de la compuerta

`tsc --noEmit` limpio · `eslint src` **0 errores** (27 avisos, todos preexistentes, en `DefinicionDeContexto.jsx`
y compañía) · `npm run build` exit 0 con las siete superficies aún **estáticas** · guardianes:
`qa-sneak-peek-check` **177/177**, `qa-nav-check` 18/18, `qa-grados-check` 44/44.

⚠️ **`npm audit` ya no está en 0**: 3 altas por un aviso NUEVO sobre `deepmerge-ts` ← `html-to-text` ←
`mailparser` (dependencia directa del Buzón). No lo introdujo esta tanda —el lock no cambió— y el arreglo que
ofrece npm es una bajada rompedora. Es el **to-do de desarrollo 1** del §9 del plan.

---

## 4. Lo que quedó abierto

| # | Qué | Dónde |
|---|---|---|
| 1 | `npm audit` a 3 altas por `mailparser` | plan §9, to-do 1 |
| 2 | Los lotes VIVOS no tienen ficha técnica (no hay columna) ni telaraña | plan §9, to-do 2 |
| 3 | Las 12 herramientas de `public/tools/` son superficie SEO sin gobernar: solo 2 llevan meta description | plan §9, to-do 3 |
| 4 | La carpeta vacía de OneDrive **se queda** (Claude Code la tiene fijada); no volver a proponer borrarla | plan §9, to-do 4 |
| 5 | **D0.9** variedad de la tarjeta #2 (Bourbon vs Castillo) y **D0.10** finca de la #3 (La Floresta vs La Fortaleza) | plan §1.0 |
| 6 | Higiene en Notion: `Grado CTC` contradice su propia columna `SCA` en 6 de 7 fichas; «Tiryan» mal escrito | plan §9 |

---

## 5. Reglas que salieron de esta sesión

- **Las definiciones del repo mandan sobre cualquier fuente externa** (owner, 2026-08-17). Si Notion —o una
  hoja, o un PDF de un socio— contradice algo que este repo define, gana el repo y lo que se corrige es la
  fuente. Está como regla 5 del §0 del plan y comprobada por el guardián.
- **Una tanda de trabajo puede comerse varias versiones.** El paso 0 se planeó con una y usó seis. El mapa de
  versiones del §7 se rebasó sobre la realidad; si vuelve a pasar, se rebasa otra vez.
