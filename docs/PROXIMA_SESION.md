# Pendientes

## RT-Scriptor · lo único que queda del encargo (V3.3, 2026-08-06)

Las pestañas **Escenarios** y **Props** ya están, la composición de escena va
antes de los encuadres, los fotogramas recuerdan su configuración y el control
de tratamiento se explica solo. Del encargo del owner queda **una cosa**:

**Fase 2: imagen real por Make (Gemini + Canva).** La espina ya existe
(`src/lib/integraciones/`: emit → dispatch → `/api/integraciones/[canal]`),
`coffeed_rts_renders` ya tiene `provider` y `config`, y cada fotograma ya
guarda su PROMPT compuesto — que ahora describe también el decorado, no solo la
cámara. El camino: `renderTake` con `provider:'gemini'` emite un evento con el
prompt y el previs; un escenario de Make llama a Gemini, pasa por Canva para la
composición de marca, y devuelve la imagen por la puerta de entrada; el
fotograma cambia de ruta y el estado pasa a `complete`. Registrar en
`/ecp/automatizaciones`.
**Ojo**: el previs NO se tira — es el encuadre exacto que el modelo debe
respetar, y va como referencia de composición.

## RT-Scriptor · escrito al cierre de la sesión nocturna del 2026-08-06 (V3.1)

RT-Scriptor entró como **app #3 del Estudio de Contenido**
(`/socios/estudio-contenido/panel/rt-scriptor`) con las seis mejoras de
«Temporal - improvement notes for V1» dentro. Detalle completo en
`docs/HANDOFF.md` (sección del Estudio) y en el log V27 de la doc interactiva.

**Lo primero al despertar, en orden:**

1. **NADA ESTÁ DESPLEGADO.** El código está en el árbol de trabajo, sin commit y
   sin push, a propósito: desplegar a producción de madrugada sin que nadie mire
   no me tocaba. Revisa, commitea y empuja cuando lo hayas visto.
2. **La BASE DE DATOS SÍ está aplicada en producción** (hacía falta para
   construir contra ella): 2 migraciones, `coffeed_deliverable_kind_guion` y
   `rt_scriptor_module`. Ambas son ADITIVAS — 4 tablas nuevas, un valor de enum
   nuevo y una rama nueva en `coffeed_guard_deliverable`; ningún camino existente
   cambia. Con el código sin desplegar no pasa nada raro.
3. **Recórrelo tú.** El Estudio está detrás de la credencial del socio y no se
   puede conducir en un navegador automatizado (mismo caso que el BCP con su
   2FA): esto se verificó con `tsc`, `eslint`, `next build`, SQL y un guardián
   nuevo de 41 comprobaciones, pero **nadie ha pulsado un botón todavía**.
   Crea un vídeo, dale un par de escenas con sus tomas, pulsa «Acción» y mira
   la tira de fotogramas.
4. **La pasada de IA del guion está sin probar en vivo.** Las reglas
   deterministas sí (están en el guardián); lo que no se ha ejercitado contra la
   API real es `analyseScript`. Si falla, cae de pie: devuelve solo las
   propuestas de regla y lo dice en la consola (`[rts:analyse]`).

**Decisiones que tomé y conviene que confirmes o revoques:**

- **No adopté el esquema `rts` ni el subdominio `scriptor.`** que pedía la guía
  de integración del paquete. Traía su propia tenencia por organización
  (`rts.orgs` + `rts.org_members`), que habría sido un segundo padrón de
  identidades dentro de la plataforma. Fui por `coffeed_rts_*` de service-role,
  como Coffeed y Datawave. Si querías de verdad un despliegue independiente en
  `scriptor.ctcexport.com`, esto es lo que hay que rehacer — y es caro.
- **No hay Realtime**, aunque la referencia lo llamaba «el producto»: exigiría
  abrir esas tablas al JWT del navegador.
- **No hice ningún escenario de Make.** El espinazo de esta app es interno
  (Server Actions + Storage + la cola del ECP); un escenario no habría hecho
  nada que la plataforma no haga ya.
- **La fase 1 dibuja los fotogramas, no los pide a una IA de imagen.** No hay
  clave de ningún proveedor de imagen en la plataforma y darla de alta —con
  coste— no era decisión mía. El prompt de cada fotograma YA se compone y se
  guarda, así que enchufar un proveedor es cambiar `provider`, no rehacer nada.
  **Ésta es la decisión que más me interesa que revises.**

**Deuda propia de RT-Scriptor:**

- El guion editable no permite reordenar líneas de diálogo (solo añadir, editar
  y quitar).
- La sala no tiene búsqueda; con veinte vídeos hará falta.
- `coffeed_rts_renders` no tiene política de reintento ni purga: los fotogramas
  viejos se quedan en Storage. Decidir junto con el proveedor de la fase 2.
- Los fotogramas se guardan como SVG. Si algún día hay que publicarlos fuera del
  muro (Instagram), harán falta PNG — el mismo paso que ya bloquea F4.

---

## Pendientes · escrito al cierre del 2026-08-05 (V3.0)

La sesión del 5 de agosto cerró con el hito **V3.0**: las fases F0–F3 de
integraciones vivas, Coffeed dando la vuelta completa por primera vez, y el
barrido leyendo feeds. Esto es lo
que quedó abierto, en orden de valor.

## Coffeed

1. **Probar la extracción de vídeo con Gemini EN VIVO.** `gemini.ts` está
   desplegado pero la forma de la respuesta REST de la Interactions API no está
   documentada con claridad; el parser prueba las formas conocidas y si falla
   cae al camino de texto. Basta con seleccionar un vídeo del barrido, extraer,
   y mirar los logs de Vercel: `[coffeed:ia:extract:gemini:…]` = cayó al texto.
2. **5 medios sin feed**: Federación Nacional de Cafeteros, Perfect Daily
   Grind, Coffee ad Astra (¡es YouTube y no resolvió el channel_id — mirar por
   qué!), Comunicaffe, ICO. Van por el agente (lento, 150 s si expira). O se
   les encuentra el feed a mano y se escribe en `coffeed_sources.feed_url`, o
   se acepta el camino lento.
3. **Calidad editorial** («clunky y básico», dixit el owner): el tono vive en
   `VOZ` (aiActions.ts) y en `coffeed_brand.art_direction` (lo edita el ECP).
   Afinar con ejemplos reales, ahora que ya salen piezas.
4. `deliverables`: solo existe 1 (la prueba de vida). El muro en las 4
   superficies sigue casi vacío — producir 2-3 capítulos reales.

## Integraciones (F4 · F5)

5. **F4 (redes)** sigue esperando: decidido que se desbloqueaba Coffeed
   primero. Cuando haya piezas reales: carrusel→Instagram exige render a
   imagen (posible proyecto Canva) + bucket público + cuenta IG Business.
   La vía barata mientras tanto: capturar a mano el permalink como entrega
   `embed` (el muro ya lo modela).
6. **`cotizacion.nota` sin probar de punta a punta** — falta emitir una
   cotización REAL desde el OCP, escribirle la Nota comercial en Notion y
   esperar el barrido de 15 min. Todo lo demás del espejo está probado.
7. **F5 (WhatsApp)**: sin empezar; recordar las semanas de trámite de Meta.

## Deuda y limpieza

8. `qa-guard-check.mjs` no corre: necesita una cuenta QA de productor
   (procedimiento en la memoria del roster). Crear Prueba, correr, borrar.
9. **Version Wrap V27** de la documentación interactiva: el Log V26 tiene ~12
   entradas del 5 de agosto sin compilar (skill `architecture-doc-versioning`).
10. Registrar en `/ecp/automatizaciones` una nota sobre la GEMINI_API_KEY
    (vive en Vercel, la usa la plataforma — NO Make).
11. GDPR: la política de privacidad sigue sin escribirse y la lista de
    subprocesadores creció hoy: Resend, Notion, Google, Make, Anthropic y
    ahora Google Gemini (vídeo). Cada día que pasa es más urgente.
12. Rotar `INTEGRACIONES_SECRET_MAKE` quedó HECHO (2026-08-05); la variable de
    Make (`{{var.organization.CTC_SECRET}}`) hace que rotar sea: Vercel +
    variable de Make + redeploy. Documentado en el registro del ECP.

## Salud del sistema (auditado 2026-08-05 al cierre)

- Guardianes: feeds 25/25 · grados 44/44 · integraciones 9/9 · docs 14/14 ·
  claims 26/26 · embed 26/26 · anclas 13/13 · espejo-notion 9/9.
- Cola de integraciones: 0 pendientes, 0 fallidos, 0 entrantes sin aplicar.
- Escenarios de Make: los 3 activos, con el secreto vía variable de org.
- `quotes`: 2, intactas. Bitácora V26: 0 marcas «pending» (selladas por blame).
