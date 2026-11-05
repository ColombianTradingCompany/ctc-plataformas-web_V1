# Charter · `ctcx-os` — CTCx OS (la capa de juego sobre la plataforma, Notion, Drive y Gmail)

> **BORRADOR · decide el owner.** Nació la noche del 2026-11-04 al 05 como trabajo de agentes en la nube y entró en
> `main` con la V6.18 (2026-11-05), sin código vivo. El owner decidió el 2026-11-05 el rumbo (decisión 1) y el canon de
> personajes («Modos de juego»); lo demás de este charter no está decidido hasta que el owner lo diga. El plan maestro de
> Code Master que se cita como «el blueprint» (por sección: §4.4, F4, §9.7…) es un archivo local, fuera del repo: una
> sesión en la nube no lo lee, así que lo que importa de él está escrito aquí. Se lee con `docs/ALINEACION.md`
> al lado, con el **atlas** (`docs/componentes/ctcx-os/atlas.md`: cada superficie con sus tablas, acciones y hechos, y su
> proyección al juego) y con la nota del primer módulo (`docs/componentes/ctcx-os/reuniones.md`). Es un componente **de
> capa**: hoy no posee tablas (propuestas: `os_actas` y las metas, ver «Tablas que posee») y casi no tiene código propio;
> abre las herramientas que ya existen, con contexto.

## Qué es

**CTCx OS** es un caparazón con forma de juego sobre la operación REAL de la casa: la plataforma (las 19 superficies y las
cuatro consolas), Notion (Objetivos, Hitos, Tareas, Reuniones, los directorios), Drive y Gmail. No es otra aplicación ni
una reescritura: **crece encima de lo que existe**, con la misma base, los mismos logins y las mismas reglas. Cada mecánica
del juego es una **acción de negocio real con cifras reales**: recibir un despacho en la bodega, confirmar un 60 %, cerrar
una tarea nacida de una reunión. Sigue siendo un negocio; el juego solo lo hace legible y jugable.

Tres papeles:

- **Los jugadores** son las personas (ver «Modos de juego»).
- **Tailor**, el asistente del lado del Chat, conduce el juego del día a día: abre el turno, propone la siguiente acción,
  lee los hechos.
- **Code Master** (el orquestador local del owner) entrega los parches y las expansiones: módulos nuevos, mecánicas nuevas,
  y revisa cada PR de este componente.

Las herramientas internas y las del café se vuelven **Módulos** que el juego abre con contexto (ruta propuesta `/os/m/…`,
ver «Superficies y rutas» y la decisión abierta 1): el módulo no reimplementa nada, llama a las mismas Server Actions con
las mismas compuertas.

## El vocabulario (owner, 2026-11-04)

| Término del juego | Qué es en la casa | Dónde vive hoy |
|---|---|---|
| **Misión** | un Objetivo | Notion «Objetivos» (D-003, D-025) |
| **Etapa** | un Hito | Notion «Hitos» |
| **Acción** | una Tarea | Notion «Tareas» (la única fuente de tareas, D-003); las tareas DERIVADAS de la plataforma en `src/lib/panel/tareasCarga.ts` |
| **Turno** | la sesión diaria | Notion «Briefings» (apertura · cierre, D-014; proyecto posterior por D-032) |
| **Cuartel** | un proyecto de Claude | Notion «Proyectos Claude» |
| **Jugador** | una cuenta ligada a una persona real (canon del owner, 2026-11-05) | hoy `panel_users` (GVG y GVB); los socios de la Red de Socios con su correo virtual (`partner_accounts`); después, productores (`producer_profiles`) y compradores (`buyer_profiles`) con su sesión |
| **Personaje** | una ficha de los directorios, no jugable: proveedor, cliente, aliado o contacto; los roles se solapan (canon del owner, 2026-11-05) | Notion «7 · Directorios» (Proveedores, Clientes, Aliados, Contactos); en la plataforma, el perfil de un productor o de un comprador mientras no juega (`producer_profiles`, `buyer_profiles`); sus fincas son Parcelas |
| **Incumbent** | un Personaje no aliado y posiblemente confrontacional: un competidor, un intermediario que busca saltarse a CTCx, un actor hostil (owner, 2026-11-05) | **no existe**: dónde vive en Directorios, como rol o como base propia, es la decisión abierta 13 |
| **Ficha** | un lote o un envío | `lots`, `contract_despachos`. **Choca:** Ficha (juego) ≠ ficha técnica (`lot_fichas`, `fichasActions.ts`, `/ocp/fichas`); ver la decisión 7 |
| **Sello** | el sello de un nodo de la Red de Socios | `partner_accounts.node_type`; el del Centro de Calidad, en `lot_evaluations`. **Choca:** Sello (juego) ≠ sellos de grado de Papagayo Beans® (loro y monograma PB, `ALINEACION.md` §1); ver la decisión 7 |
| **Partida** | café en un estado | `stock_partidas`, `stock_transformaciones`, `stock_salidas` |
| **Recibo** | la recepción de un despacho | `contract_despachos` (`recibido_at`, `peso_kg`, `humedad_pct`, `aw`, `pago_despacho_cop` · `pago_recepcion_cop`: el 60/40) |
| **Cuenta** | un lead o un cliente en el embudo | `leads`, `quotes`, `sample_pack_orders`, `buyer_profiles`; Notion «Clientes». **Choca:** Cuenta (juego) ≠ cuenta de usuario / cuenta congelada (`producer_profiles.estado_cuenta`, `ALINEACION.md` §1); ver la decisión 7 |
| **Parcela** | el terreno de una finca | `finca_parcelas` (`lat`, `lng`, `polygon_geojson`) y los campos EUDR de `fincas` |
| **Módulo** | una herramienta para una parte del trabajo | hoy, las rutas de las consolas; mañana `/os/m/<clave>` (propuesto) |
| **Casilla** | un lugar del mapa: una celda H3 de resolución 10 | **no existe** (ver el atlas, §5) |
| **Barras de victoria** | financiera · felicidad · realización | **no existen**: se derivan de los hechos (abajo) |
| **Hecho** | una acción de negocio que ya quedó escrita | `audit_log`, `integration_events`, `latidos` → `src/lib/os/hechos.ts` |

## Modos de juego

**Canon (owner, 2026-11-05):** juegan las cuentas ligadas a una persona real; todo lo demás son Personajes, no jugables,
con los roles ya establecidos (Proveedor, Cliente, Aliado y Contacto, que se solapan) y el tipo nuevo Incumbent.

1. **Equipo** (el primero): GVG y GVB, las personas de la casa. Aquí un jugador es un perfil con fila en `panel_users`; lo que
   puede hacer en un módulo lo deciden sus grants por consola **y nivel** (`admin` · `viewer`, `src/lib/panel/niveles.ts`).
   El juego no inventa permisos.
2. **Productor** (después): el productor de Kaffetal Regal juega sobre SUS Fichas, Parcelas y Recibos, con su sesión de
   siempre (la cookie compartida) y lo que ya ve por `select-own`.
3. **Comprador** (después): el comprador de Cherry Picked juega sobre sus Cuentas y las Fichas del catálogo. Aquí manda
   la regla anticircunvención (`ALINEACION.md` §1, «Lo público del lote»): **nada** lleva al productor sin pasar por CTCx.
4. **Socio** (jugable, canon del owner 2026-11-05): un socio de la Red de Socios juega con su cuenta y su correo virtual, y
   pone su **Sello** (el Centro de Calidad ya lo hace al registrar una evaluación: `lot.evaluacion_registrada_centro`). Qué
   ve y qué hace dentro del OS sigue abierto.

## El principio estrangulador

El juego reemplaza una pantalla vieja **solo a paridad**, módulo por módulo:

1. El módulo nace AL LADO de la pantalla vieja; las dos llaman a las mismas Server Actions (misma clase, misma compuerta,
   mismo `{ ok: false, error }`).
2. **Paridad** = cada acción de la pantalla vieja se puede hacer desde el módulo, con la misma compuerta, los guardianes
   verdes y el visto bueno del owner sobre una lista escrita (la lista vive en este charter, en la fila del módulo).
3. Solo entonces la ruta vieja pasa a talón 308 hacia el módulo, por el mecanismo que ya existe
   (`src/lib/panel/rutasMovidas.ts`); nunca se borra en silencio.
4. Hasta la paridad, la pantalla vieja es la que manda. Un módulo a medio hacer no retira nada.

| Módulo (orden del owner) | Lo que abre | La pantalla vieja que reemplazaría | Acciones reales (ya existen) |
|---|---|---|---|
| 1 · **Reuniones** | antes · durante · después de una reunión | Notion «Reuniones» + `/ecp/transcripciones` | Notion: fila de Reuniones y Tareas con `Origen = Reunión`; plataforma: `src/lib/transcripciones/actions.ts` (detalle en `ctcx-os/reuniones.md`) |
| 2 · **Compra y Bodega** (primero: la recepción en Santillana, la sede de CTCx) | el Recibo de un despacho y la Partida que nace de él | `/ocp/contratos/[id]` (la ventana del contrato), `/ocp/compras`, `/ocp/stock` | `recibirDespacho` (`src/app/ocp/(app)/ventanaActions.ts`: escribe `contract_despachos`, `compras` y `stock_partidas`, y deja `despacho_recibido`, `compra_registrada` y `stock_raiz_despacho` en `audit_log`; y avisa al productor: nota en `producer_comm_log` (la ve él) y correo (`sendTransactionalEmail`). Es clase `emite` (`permisoDeEscritura("ocp", "emite")`). `compras` solo se escribe si no es lo vendido, ni una devolución, ni Tyrian (y el contrato trae su grado); en una devolución no hay partida), `confirmarDespacho`, `stockActions.ts`, `comprasActions.ts` |
| 3 · **Logística** | el envío: muestras, kits, flete | `/ocp/muestras`, `/ocp/stock/sample-kits/[id]`, `/ecp/cotizador-logistico`, `/ecp/cotizador-courier` | `muestrasActions.ts`, `comprasActions.ts` (los Sample Kits), los cotizadores |
| 4 · **Ventas** | la Cuenta y la Ficha en el catálogo | `/ocp/contratos` (Triage), `/ocp/catalogo`, `/lcp/crm/*`, `/ecp/cotizador-lotes` | `triageActions.ts`, `catalogActions.ts`, `crmGreenActions.ts`, `src/lib/cotizador/actions.ts` |

## Guardarraíles

1. **Toda mecánica es una acción de negocio real.** Un punto, una barra o un logro nacen de una Server Action que ya existe
   (o de una acción de Notion, Drive o Gmail bajo la doctrina de la Secretaría). Nada se gana por hacer clic.
2. **Los indicadores son reales.** Una barra lee columnas reales (`medidas` de `hechosCatalogo.ts`: `tabla.columna`); si
   no hay cifra, el hecho solo cuenta. Lo derivado no se persiste. Nada de puntajes inventados.
3. **Las reglas de producción siguen en pie**: clase por acción (`lectura` · `borrador` · `emite`) y compuertas que por
   defecto cierran; los rechazos devuelven `{ ok: false, error }`; `emitEvent` nunca lanza; el libro de consumo de IA
   (`registrarConsumo`); RLS sin políticas por defecto y guard triggers; DDL solo por `apply_migration` con el owner;
   `npm audit` en 0; la compuerta completa y la versión al empujar (`AGENTS.md`, `ALINEACION.md` §4–§5).
4. **Las fuentes de D-002 siguen en pie** (`docs/UNIFICACION_ALINEACION.md`): la plataforma es la interfaz y el registro de
   lo que gestiona (productores, fincas, lotes, muestras, evaluaciones, contratos, stock); Notion es central para el resto y
   refleja la plataforma en solo lectura. El juego LEE las dos y ESCRIBE cada cosa por el camino de su dueño: lo de la
   plataforma, por sus Server Actions. **Propuesto · pendiente del sí del owner:** el código del OS (`src/app/os`,
   `src/lib/os`) escribe en Notion SOLO por la espina: `emitEvent` → `integration_events` → despachador → escenario de Make
   «CTC · Eventos de la plataforma». No usa nunca una llave de escritura propia, ni un conector, ni el trabajo F1. Lo que
   vuelve entra solo por un manejador con nombre en `aplicar.ts` (`reunion.espejada`). Notion se lee con una integración
   de solo lectura.
5. **Misma base, mismos logins, mismas reglas.** Sin autenticación nueva; sin tablas de juego sin decisión del owner (hoy
   ninguna; propuestas `os_actas` y las metas, ver «Tablas que posee»).
6. **Anticircunvención.** Ningún modo de juego de cara a un comprador facilita llegar al productor sin CTCx.
7. **Repo público.** Solo nombres de tablas, rutas y funciones; nunca datos, ids, correos, personas ni ids de Notion, Make o
   Drive; las tareas se citan como «TAR-<n>».
8. **La cola del OCP** (**propuesto · pendiente del sí del owner**). Un precio o unos kilos dichos en una reunión nunca
   cambian un contrato: pasan a ser una propuesta en la cola del OCP, visible en `/ocp/contratos`, y el operador la aplica
   con la acción del contrato que ya existe. Un módulo no llama directo a la acción del contrato con una cifra salida de una
   reunión (vale también para el guardarraíl 1 y la regla propia 1).

## Superficies y rutas

Hoy **ninguna**.

**Rumbo aprobado por el owner (2026-11-05, decisión 1); el diseño de abajo se aprueba al construirlo:**
`www.ctcexport.com/os` es la **quinta consola**, con
entrada `os` en `PanelConsoleKey` y en `CONSOLE_ORDER` (`src/lib/panel/consoles.ts`; hoy hay cuatro: `bcp` · `ecp` · `ocp`
· `lcp`).

- Layout raíz `src/app/os/layout.tsx` (`data-theme="bcp"`, Tailwind, `noindex`).
- Llave `os` en `panel_users.consoles` (al principio, el owner y GVB: el owner dio a GVB acceso completo al sistema salvo
  el lado de Code Master, decisión 3 del 2026-11-05), con los niveles de `src/lib/panel/niveles.ts` y la
  CLASE de cada acción.
- Un interruptor por módulo en `platform_settings`.
- Sin subdominio. Solo la sesión `ctc-panel-auth`, sin mezclarla nunca con la cookie compartida ni con la de socios.
- Los módulos van en `/os/m/<clave>` (el patrón del blueprint de Code Master, §4.4: `/os/m/bodega`…) y las herramientas en
  `/os/herramientas/[slug]`.

## Identidad CTCx

**Propuesto · pendiente del sí del owner.** El owner pidió que la app tenga la identidad y el tacto de CTCx
(2026-11-04).

- **Una sola fuente**: `src/app/globals.css`, con el tema de consola (`data-theme="bcp"`, que es la paleta del logo), y las
  tres fuentes de `src/app/layout.tsx`: Fraunces para títulos, Instrument Sans para texto, Spline Sans Mono para etiquetas
  y cifras.
- **Qué dice cada color**: el morado CTCx es el chrome; `--t-tyrian` solo significa el grado Tyrian; los grados se leen de
  `src/lib/grados/definicion.ts`; las alertas van con `--red`, nunca con `--t-red`.
- **Los tokens propios del juego** van en un solo archivo, derivados con `color-mix` de los de la casa.
- **Logos, loro y sellos** salen solo de los archivos oficiales y no se redibujan.
- **Sin sonido ni bucles**, y con `prefers-reduced-motion`. WCAG 2.2 AA.
- **Las reglas de la casa**: botones abajo a la derecha y acordeones cerrados; español primero y el vocabulario congelado
  de `ALINEACION.md` §1.
- **Pendiente transversal**: la crema como token, el carmesí del logo y el anillo de foco.

## Mapa de código

- `src/lib/os/hechosCatalogo.ts` (puro) y `src/lib/os/hechos.ts` (server-only, solo lectura): **los hechos**. Una forma
  normalizada —tipo · actor (perfil y rol, nunca un nombre) · entidad (término del juego, tabla, id) · cuándo · transición
  · sello · efectos en las barras (con la columna real de cada cifra) · ubicable— sobre `audit_log`, `integration_events` y
  `latidos`. No lee `audit_log.notes` ni el `payload` entero. Llega en un PR propio, sin fusionar.
- `docs/componentes/ctcx-os/atlas.md`: el atlas (PR propio). `docs/componentes/ctcx-os/reuniones.md`: el primer módulo
  (PR propio).

## Tablas que posee

**Hoy, ninguna.** Lee, en solo lectura: `audit_log`, `integration_events`, `latidos` y, para resolver actores, `profiles`,
`panel_users`, `partner_accounts` (ids y roles). Cada módulo lee y escribe las tablas de su dueño **a través de las Server
Actions de su dueño**.

**Propuesto · pendiente del sí del owner** (el blueprint de Code Master, F4):

- **`os_actas`**: el acta durable de una reunión, de borrador a entregada. Aditiva, solo de servicio (service-role), RLS
  sin políticas más un guard trigger; DDL solo por `apply_migration` con el owner y su acta en `docs/migraciones`. Guarda
  el acta en tránsito y la URL de Notion que devuelve `reunion.espejada`. Si sus escrituras dejan `audit_log` (F4 lo
  pide), su `entity_type` entra en `hechosCatalogo.ts` en la misma tanda (regla propia 2). Qué texto guarda el acta y qué
  viaja por la espina es la decisión abierta 11.
- **Las metas (`os_metas`) y el interruptor por módulo**: claves de `platform_settings`, no tablas nuevas.

## Guardianes

- **`qa-os-hechos-check.mjs`** (offline; V6.18): todo `entity_type` de `audit_log` y todo `tipo` de
  `emitEvent` del código tiene su línea en el catálogo y al revés; cada acción con efecto existe; cada medida es una columna
  real; privacidad probada con centinelas; `hechos.ts` es server-only y no escribe.
- Por venir, con el primer módulo: un guardián de **paridad** (cada módulo declara la pantalla vieja y las acciones que
  cubre, y comprueba que llama a las mismas Server Actions).
- **Propuesto · pendiente del sí del owner** (el blueprint de Code Master, §9.7):
  - **`qa-os-check`**: que no haya datos de negocio ni escrituras directas bajo `src/app/os` o `src/lib/os` (incluido
    ningún cliente de Notion ni llamada a `api.notion.com`); que cada pieza tenga fuente y enlace; y la identidad (sin
    colores ni fuentes ajenos a la casa, sin palabras prohibidas, logos con hash oficial).
  - **`qa-os-propuestas`** (F4).
  - La **paridad de lectura** (F3).
  - Se reutilizan los que ya existen: `qa-rutas-consolas`, `qa-niveles-check`, `qa-encoding-check` y `qa-grados-check`.

## Reglas propias

1. **El juego no escribe por su cuenta.** Un módulo llama a la Server Action del dueño; si falta una, se pide al dueño
   (pendiente con dueño en su charter) y se anota en `ALINEACION.md` §3. **Propuesto · pendiente del sí del owner:** en
   Notion escribe SOLO por la espina (`emitEvent` → `integration_events` → Make), nunca con una llave propia, un conector
   ni el trabajo F1 (guardarraíl 4); y una cifra de una reunión va a la cola del OCP, no al contrato (guardarraíl 8).
2. **Un hecho nuevo es un hecho del negocio.** Si una mecánica necesita un hecho que no existe, lo escribe la acción de
   negocio que lo origina (en `audit_log`, local) y su línea entra en `hechosCatalogo.ts` en la misma tanda. Un
   `integration_events` nuevo solo si Notion o Google tienen que reaccionar: esa tabla es la cola de salida a Make (cada fila
   sale al webhook y gasta una operación).
3. **Las barras se calculan al leer**, nunca se guardan.
4. **Los pesos y las metas son del owner**: este componente propone dirección y medida, no valor.

## Lo que las consolas gobiernan de este componente

Todo. Con la propuesta `/os` (decisión 1), el OS es una consola más, la quinta, que escribe solo por las acciones de sus
dueños; no gobierna a las otras. Los grants y niveles de `panel_users` deciden qué juega cada uno; el rail
(`CONSOLE_ORDER`) y `rutasMovidas.ts` deciden dónde vive una pantalla; las tareas derivadas
(`src/lib/panel/tareasCarga.ts`) son las Acciones de la plataforma que el turno lee; cada `entity_type` nuevo que una
consola escriba en `audit_log` alcanza el catálogo de los hechos (y el guardián lo exige).

**Propuesto · pendiente del sí del owner:** la cola del OCP (guardarraíl 8) es de `consolas` (bastidores). Se construye en
el mismo lote que el módulo que la alimente, con su línea «Para `consolas`» en `ALINEACION.md` §3. Dónde se guarda es la
decisión abierta 12.

## Decisiones abiertas (las toma el owner)

1. **Dónde vive el juego** — **decidida (owner, 2026-11-05):** `/os`, la quinta consola en `CONSOLE_ORDER`, con los
   módulos en `/os/m/<clave>` (ver «Superficies y rutas»); Tailor al frente, paridad antes de reemplazar, y Kaffetal Regal
   y Cherry Picked al final, como modos. Sigue abierto el diseño (layout, llave, interruptores), que se aprueba al
   construirlo. Mientras tanto: ninguna ruta.
2. **Las barras**: qué mide cada una, con qué pesos, contra qué meta y en qué periodo (¿el turno, la semana ISO, el ciclo de
   `docs/PLAN_CICLOS.md`?). Mientras tanto: `hechosCatalogo.ts` solo da dirección y medida; en la financiera el signo es el
   sentido del dinero para CTCx (entra +1, sale −1, se compromete 0).
3. **El turno**: ¿es el Briefing de Notion (apertura · cierre, D-014) o una página de la plataforma? ¿Quién lo abre: Tailor?
4. **Cómo llega Tailor a los hechos**: hoy no hay ruta. D-014 6.1 prevé UNA ruta de la plataforma, protegida y de solo
   lectura, para el briefing (P25/P26, sin construir). ¿Los hechos salen por ahí?
5. **La Casilla H3 de resolución 10**: una dependencia nueva (`h3-js`, con `npm audit` en 0) que la derive al leer de
   `finca_parcelas.lat/lng`, o la extensión en la base. Sin columna nueva mientras tanto.
6. **El libro de hechos**: ¿basta `audit_log` para los hechos locales, o hace falta un destino de `integration_events` que
   no salga a Make? Mientras tanto: `audit_log`.
7. **Términos sin dueño claro**: el contrato (`purchase_contracts`) juega hoy como «Ficha»; las muestras y los kits, como
   «Partida». ¿Son términos propios? Y tres términos chocan con palabras que la casa ya usa con otro sentido: Ficha (juego)
   ≠ ficha técnica (`lot_fichas`); Sello (juego) ≠ sellos de grado de Papagayo Beans®; Cuenta (juego) ≠ cuenta de usuario /
   `estado_cuenta`. ¿Se confirman o se renombran?
8. **Los modos Productor y Comprador**: cuándo, y con qué límites además de la anticircunvención.
9. **Quién certifica la paridad** de un módulo y retira la pantalla vieja: propuesta, el owner sobre la lista del charter.
10. **El primer módulo con código**: la nota de Reuniones encontró que casi todo vive en Notion y que el vínculo
    `transcripts` ↔ «Reuniones» no existe; la recepción en Santillana (`recibirDespacho`) ya es una acción completa con
    cifras. ¿Se empieza por Reuniones, como dice el orden, o por la recepción?
11. **El acta y la espina** (si se acepta `os_actas`): qué texto guarda el acta y qué viaja en el payload de la espina (la
    regla S0 del blueprint: solo claves y números).
12. **Dónde se guarda la cola del OCP** (guardarraíl 8): el blueprint no fija la tabla.
13. **Dónde viven los Incumbents** (canon del owner, 2026-11-05): como un rol más en las bases de «7 · Directorios» o como
    una base propia.

*(Las decisiones del blueprint de Code Master se pliegan aquí con la etiqueta «Propuesto · pendiente del sí del owner»;
las que falten, cuando lleguen.)*

## Pendientes

- ~~**Revisión de los tres PR de la noche** (atlas, hechos, este charter) y de la nota de Reuniones: Code Master y el owner.~~
  Hecha el 2026-11-05: entraron en la V6.18 como borrador, con las decisiones 1 y 3 y el canon de personajes plegados.
- **El catálogo de los hechos es anterior al canon** (`src/lib/os/hechosCatalogo.ts`): `TerminoDelJuego` no tiene
  «Jugador» ni «Incumbent», y mapea `panel_user` → «Personaje» y `partner_account` → «Sello». Se corrige con el primer
  código que lea esos términos, con su caso en `qa-os-hechos-check`.
- **Del atlas** (§5, huecos): los elementos del juego sin tabla (Casilla, barras, turno en la plataforma, jugador) y las
  tablas sin superficie, cada uno con su paso mínimo.
- **De Reuniones**, con dueño fuera de este componente (ver `ctcx-os/reuniones.md` §6): el vínculo `transcripts` ↔ Notion
  «Reuniones» y la contraparte de una transcripción (`consolas` + `secretaria`); el rastro de las transcripciones en
  `audit_log` y el gasto de AssemblyAI en `ai_usage` (`consolas`); los manejadores `reunion.*` en `aplicar.ts` (`consolas`);
  las relaciones que faltan en «Reuniones» (el carril R de la unificación).
- **De la revisión de los hechos** (dueño `consolas`, cada uno con su línea en `ALINEACION.md` §3 cuando se haga):
  `recibirDespacho` escribe la misma acción `despacho_recibido` para aceptado, compra ajustada y devolución (el resultado
  queda solo en `contract_despachos.resultado`): mientras la acción no lo diga, un Recibo no mueve la realización. El lado
  comprador del dinero (`place_order` → `orders`) no deja fila en `audit_log` ni en `integration_events`: hoy la barra
  financiera solo ve lo que sale de CTCx y la tarifa de evaluación. Una transformación de stock apunta a la partida
  madre, así que lo transformado (`stock_transformaciones.kg_entrada`) no se ubica desde el hecho.
- **Si el owner acepta `/os`** (decisión 1): `src/lib/panel/consoles.ts` es de `consolas` (charter `consolas`, «Mapa de
  código»). Al construirlo hacen falta la línea «Para `consolas`» en `ALINEACION.md` §3 y la fila «Vocabulario congelado»
  de §1 al día, que hoy nombra cuatro consolas.
- **Cuando el owner decida 1 y 2**: el primer módulo, con su lista de paridad en la tabla de arriba y su guardián.
- **Si el owner acepta el componente**: su fila en la tabla de componentes de `docs/HANDOFF.md` y su grupo en la barra
  lateral (hoy no se tocan: el componente es un borrador).

## Kick-off

```
Trabajas SOLO en el componente «CTCx OS» (clave: ctcx-os) de la plataforma CTC. Es la capa de juego sobre la
operación real: hoy no posee tablas (propuestas: os_actas y las metas), abre las herramientas que existen con
contexto, y cada mecánica es una acción de negocio real con cifras reales. Antes de tocar nada lee:
1. docs/componentes/ctcx-os.md           ← este charter (guardarraíles, principio estrangulador, decisiones abiertas)
2. docs/componentes/ctcx-os/atlas.md     ← cada superficie con sus tablas, acciones y hechos, y su proyección al juego
3. docs/ALINEACION.md                    ← contratos transversales y el registro de permeación (§3)
4. docs/UNIFICACION_ALINEACION.md        ← D-002 (quién manda en qué) y las decisiones de Notion, Drive y Gmail
5. el charter del componente cuya pantalla vaya a abrir el módulo (consolas, kaffetal-regal, cherry-picked…)
Un módulo llama a las Server Actions del dueño; no reimplementa. Un hecho nuevo lo escribe la acción de negocio que lo
origina, y su línea entra en src/lib/os/hechosCatalogo.ts en la misma tanda (qa-os-hechos-check). Nada se retira sin
paridad y visto bueno del owner.
En Notion el OS escribe SOLO por la espina (emitEvent → integration_events → Make): nunca con una llave propia, un
conector ni el trabajo F1 (guardarraíl 4, propuesto). Un precio o unos kilos dichos en una reunión van a la cola del
OCP, nunca directo al contrato (guardarraíl 8, propuesto).
Al terminar: «Pendientes» de este charter al día, y una línea en ALINEACION §3 si tocaste otro componente.
Hoy: <la tarea>.
```
