# Brief · Seguimiento de Temas  (componente: consolas · slug: `seguimiento-de-temas` · 2026-09-19)

> Fase 6 del overhaul (`docs/OVERHAUL_CONSOLAS_PLAN.md`, D9). En el cuadro del owner es la segunda entrada de la cabecera del
> ECP, entre **Tablero de Ejecución** y **Transcripciones**. Estado: **en scoping — espera al owner.**
> ⚠️ De las seis entradas sin módulo, ésta es la única de la que el repo no dice NADA: solo existe su nombre en el cuadro. Todo
> lo de abajo es una LECTURA del nombre por el sitio que ocupa. La decisión n.º 1 es confirmarla o corregirla.

**Qué es** — El sitio de **lo que está abierto y NO se puede deducir de un dato**. El Tablero de Ejecución enseña tareas
DERIVADAS (un lead sin responder, una finca por revisar): aparecen y desaparecen solas. Pero una reunión deja cosas que ningún
estado de la base conoce —«hay que decidir la entidad legal», «el laboratorio quedó en mandar tarifas», «volver a hablar con el
agente de carga en octubre»—. Un **tema** es eso: un hilo con título, dueño, estado, próximo paso con fecha y de dónde salió.
Es lo único de las consolas que se escribe a mano a propósito, y por eso va al lado del Tablero y no dentro de él.

**Para quién** — El **owner** y el **equipo CTC**. Nadie de fuera lo ve.

**Lo que ya hay (hechos, 2026-09-19)**
- **Tablero de Ejecución** (`src/lib/panel/tareas.ts`): cinco tipos de tarea derivada; nada se crea a mano, ni tiene título
  libre, responsable o fecha. Solo se guarda la casilla.
- **Transcripciones**: una transcripción guarda asunto, fecha, notas, hablantes y texto. **No guarda temas, acuerdos ni tareas.**
  Hoy una reunión transcrita no deja rastro de lo que se acordó.
- **Mapa de Trabajo** (`/bcp/mapa`): es un diagrama del proceso, no una lista de asuntos. No tiene estados ni responsables.
- **Notion · «Reuniones Generales»**: 39 filas — 17 concluidas, **15 *open points***, 7 programadas. Y «Objetivos y Tareas».
  La Secretaría las espeja **a mano** y en su fase F3, sin cablear (`docs/SECRETARIA_PLAN.md`, correspondencias 10 y 11).
- Los «Pendientes» de los charters y `ALINEACION` §3b: son pendientes **de código, para una sesión**. No son esto y no se tocan.

**Dónde vivirá** — Módulo de consola: **`/ecp/temas`**, en «ECP · Ejecución». Lógica en `src/lib/temas/`.

**Datos** — Dos tablas, patrón de la casa (RLS + cero políticas): **`temas`** — `titulo`, `estado` (abierto · en curso ·
esperando · cerrado), `esperando_a` (texto: a quién), `responsable` (perfil interno), `componente` (clave de charter, opcional),
`proximo_paso`, `proximo_paso_para` (fecha), `origen_tipo` + `origen_id` (una transcripción, un lead, una reunión de Notion, o
nada), `cerrado_at`, `cerrado_como`. Y **`tema_notas`** — la bitácora del hilo (quién, cuándo, qué). Nada se borra: un tema se cierra.
Un tema con la fecha vencida aparece **en el Tablero de Ejecución** como un tipo de tarea más (`tema`), derivado: no se duplica.

**IA** — **Opt-in y en segunda tanda**: un botón «proponer temas» sobre una transcripción, que lee el texto y SUGIERE hilos
(nunca los crea solo). Modelo pequeño, una llamada por transcripción, superficie `temas` en el libro `ai_usage`. La primera
tanda no gasta nada.

**Contratos que toca** — Niveles por consola: crear, anotar y cerrar un tema es **`borrador`** (interno, nadie de fuera lo ve,
no notifica ni gasta, se puede deshacer) → entra PRIMERO en la lista blanca de `BCP_USER_ADMIN_PLAN.md`, que es la fuente que
lee `qa-niveles-check`. El botón de IA sería `emite` (gasta). · El espejo con Notion es de `secretaria`.

**Guardián previsto** — `qa-temas-check`: (1) las acciones del módulo están en la lista blanca con clase `borrador`, y la de IA
NO; (2) `tema` está declarado en `TIPOS_DE_TAREA` y su consola dueña es el ECP; (3) ningún tema sin responsable ni uno
«esperando» sin decir a quién; (4) cerrar exige decir cómo se cerró.

**Primera tanda** — Las dos tablas, la lista con filtros (estado · responsable · componente · vencidos) y la ficha del tema con
su bitácora; más el enlace «abrir un tema desde aquí» en el detalle de una transcripción. Verificable en vivo por SQL y por el
Tablero: un tema vencido aparece allí.

**Decisiones del owner**
1. **¿Es esto lo que llamas «Seguimiento de Temas»?** La otra lectura posible es «los asuntos de cada reunión, agrupados por
   reunión» (una agenda con seguimiento). Cambia el grano de la tabla: aquí el grano es el TEMA; allá sería la REUNIÓN.
2. **¿Dónde manda la verdad, aquí o en Notion?** Tienes 15 *open points* en Notion. Recomiendo que mande **la plataforma** y que
   Notion sea el espejo (la Secretaría ya tiene la espina para eso), porque aquí el tema puede enlazar a un lote, un lead o una
   transcripción y en Notion no. Si prefieres seguir escribiéndolos en Notion, este módulo es una vista de lectura y cambia entero.
3. **¿Se migran los 15 *open points*?** A mano, en la primera tanda, o se empieza en limpio.
4. **¿Quién los ve?** Propuesta: cualquiera con acceso al ECP ve todos. ¿O cada uno los suyos y el owner todos?
5. **¿La IA que propone temas desde una transcripción: sí, y cuándo?**
