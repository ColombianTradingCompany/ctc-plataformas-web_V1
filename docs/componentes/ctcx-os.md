# Charter · `ctcx-os` — CTCx OS (la capa de juego sobre la plataforma, Notion, Drive y Gmail)

> **F2 publicado en la V6.19 · lo demás, BORRADOR · decide el owner.** Nació la noche del 2026-11-04 al 05 como
> trabajo de agentes en la nube y entró en `main` con la V6.18 (2026-11-05), sin código vivo. El owner decidió el 2026-11-05
> el rumbo (decisión 1: `/os` es la **quinta consola**, la última de `CONSOLE_ORDER`) y el canon de personajes («Modos de
> juego»). **La fase F2, «el esqueleto de `/os`»** (solo lectura, solo datos de la plataforma), **está construida** en la rama
> `os/f2-esqueleto` como V6.19 (el número se toma al empujar) y espera la revisión del owner y la fusión: ver «Superficies y
> rutas» y «Mapa de código». Hasta que se fusione y el owner conceda la llave `os` por SQL, **nadie ve `/os`**. Lo marcado
> «Propuesto · pendiente del sí del owner» sigue sin decidir, y las decisiones que F2 tomó por defecto están en «Decisiones
> abiertas» (14–24; la 14, la 15, la 16 y la 20 las decidió el owner el 5 nov, y su rumbo está en «Rumbo del owner (5 nov)»). El plan maestro de Code Master que se cita como «el blueprint» (por sección: §4.4, §7, F2, F4, §9.7…) es
> un archivo local, fuera del repo: una sesión en la nube no lo lee, así que lo que importa de él está escrito aquí. Se lee con
> `docs/ALINEACION.md` al lado, con el **atlas** (`docs/componentes/ctcx-os/atlas.md`: cada superficie con sus tablas,
> acciones y hechos, y su proyección al juego) y con la nota del primer módulo (`docs/componentes/ctcx-os/reuniones.md`). Es un
> componente **de capa**: hoy no posee tablas (propuestas: `os_actas` y las metas, ver «Tablas que posee»); su código propio es
> el de F2, que LEE y no escribe; abre las herramientas que ya existen, con contexto.

## Qué es

**CTCx OS** es un caparazón con forma de juego sobre la operación REAL de la casa: la plataforma (las 19 superficies y las
cuatro consolas de la casa; la OS misma es la quinta desde la V6.19), Notion (Objetivos, Hitos, Tareas, Reuniones, los directorios), Drive y Gmail. No es otra aplicación ni
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

## Rumbo del owner (5 nov)

Lo que el owner fijó el 5 de noviembre. Manda sobre lo que diga en contra el resto de este charter.

- **El OS es un juego, de verdad.** Mapas y objetos que parecen de verdad. Por eso `/os` abre en el mapa: la Hacienda es la
  portada (construido en F2, ver «Superficies y rutas»).
- **Hay dos Tailors.** El proyecto de Claude «CTCx Tailor» es el que reparte el trabajo (el triaje maestro). El Tailor del
  juego es otra cosa: un ayudante en pantalla que da consejos, sugiere el siguiente paso y enseña a usar el OS a quien llega.
  Se construye primero como texto fijo por pantalla, sin IA.
- **Cada edificio abrirá su propia escena** en fases siguientes. Conocimiento será una biblioteca. Origen será un mapa de
  productores, sus fincas y sus lotes: es el motor de mapas de la fase F7. Hoy cada edificio abre su hoja, y la hoja del hub 2
  abre el Almacén y la del hub 5 el Taller.
- **Hablar con la gente desde el juego**: Gmail, Instagram y YouTube; después WhatsApp y LINE. Siempre por la espina que ya
  existe, y con el sí de una persona antes de que salga nada. El diseño se está escribiendo en local; aquí no hay código.
- **El Modelo Económico (PVC) es solo del owner**, y vive en el edificio 3 · Comercial (decisión 14 abajo; lo solo del owner,
  en «Superficies y rutas» y en `qa-os-check` H12).
- **GVB será admin de `/os`** (decisión 16). La llave se concede después de fusionar, en la sesión del owner (Pendientes).
- **Notas finales del owner (5 nov, noche):**
  - **La regla madre: todo coherente y cohesivo.** Cada registro nace con las llaves de su contexto y alimenta un índice único de
    verdad (la regla 1, vista desde el índice). El diseño, en borrador local.
  - **La Planta de Procesamiento** (de pergamino a verde, con evaluación y empaque de verde) llega como una estructura nueva
    «en obra» en la Hacienda; vendrán más estructuras. Dónde se dibuja y qué mecánica usa lo propone un borrador local.
  - **Kaffetal Regal y Cherry Picked son la contraparte del CRM del OS**: lo que el productor y el comprador ven y hacen allí
    es la otra cara de su ficha en el juego.
  - **El resto del Ecosistema de Valor y la Red de Socios** entran también en el mapa del juego.
  - **Las interfaces y herramientas que se solapan se fusionan, se mejoran y se integran**, siempre con paridad antes de
    retirar nada. La auditoría, en borrador local.
  - **El sistema crece y se adapta** a medida que aparecen conexiones nuevas y se definen flujos nuevos.

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

| Módulo (orden propuesto el 4 nov; lo confirma la decisión 10) | Lo que abre | La pantalla vieja que reemplazaría | Acciones reales (ya existen) |
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

**F2 · publicado en la V6.19** (rumbo del owner del 2026-11-05, decisión 1). `www.ctcexport.com/os` es
la **quinta consola**: `os` en `PanelConsoleKey`, en `CONSOLES` y la **última** de `CONSOLE_ORDER` (`src/lib/panel/consoles.ts`,
de `consolas`; ir al final hace que `consolaDelModulo` y `porConsola` resuelvan y ordenen todo lo anterior exactamente igual).
Se sirve en www porque el host `panel.` reescribe toda ruta a `/control-panel/…`. Todo F2 es de **solo lectura**: cero Server
Actions, cada cifra con su fuente y su «Abrir» a la pantalla de la consola dueña.

| Ruta | Qué | Notas |
|---|---|---|
| `/os` | **Inicio = el mapa** (rumbo del owner, 5 nov): el HUD, y debajo **la Hacienda** como imagen principal —la MISMA vista y las mismas hojas que `/os/m/hacienda`, no una copia—. La hoja del hub 2 · Operación y Logística ofrece «Abrir Almacén» y la del hub 5 · Plataformas e IT «Abrir Taller», cada una según su interruptor (apagado, la hoja lo dice con las palabras de `ModuloApagado` y no enlaza). Debajo del mapa: la lista corta de los tres módulos con su interruptor (nada queda escondido), los avisos de lectura, «Copiar contexto para Tailor» y, al pie, el logo oficial (el raster `public/images/shared/ctc-logo-full.png`, por hash) | `src/app/os/(app)/page.tsx` → `InicioVista`. No es un módulo y no tiene interruptor propio. **Con el módulo Hacienda apagado, vuelven las tarjetas de antes** (logo, una tarjeta por módulo). Si TODOS los módulos están apagados, no lee el tablero (el HUD dice «Sin lectura») |
| `/os/m/hacienda` | **La Hacienda como módulo**: los diez hubs del Mapa CTC 0–9 (`src/lib/integraciones/dominios.ts`) como edificios de una hacienda isométrica; cada hub abre su hoja (el `Modal` de la casa, hoja inferior en el móvil) con sus piezas, sus fuentes, los módulos de su edificio y «Copiar contexto para Tailor» | **Se queda viva** (no redirige a `/os`): es la ruta del módulo para su enlace del rail, su interruptor, su `error.tsx` y los guardianes (`qa-os-check` H1/H2, `qa-nav-check`, `qa-entradas-check`), con el menor cambio. El dibujo es geometría pura (`haciendaArte.ts`, sin textos); bajo 760 px se oculta la capa de rótulos y la lista de los diez hubs (dos columnas en el móvil, cinco en escritorio) es el control en todo ancho |
| `/os/m/almacen` | **El Almacén**: la franja del circuito del stock (por recibir · en stock · por declarar · en catálogo · vendido, en kg), los lotes por etapa (todas, también las vacías), los despachos y los contratos por estado, y «Los grados de la casa» (los cinco sellos de `GRADOS`) | Los lotes POR GRADO llegan con el pasaporte del lote (fase posterior); F2 no los cuenta |
| `/os/m/taller` | **El Taller**: la salud del sistema — la versión, los crons de `registroCrons.ts` con su salud por latido, la cola de `integration_events` (totales y por hub) y las automatizaciones por etapa, con el rótulo **«Registro sin conciliar»** hasta que F1 concilie el registro con Make (crítica 25) | Solo la salud, que ve también GVB; el lado «Pedidos a Code» (solo el owner) será OTRO módulo (decisión 17) |
| `/os/demo/[[...vista]]` | **El modo demostración**: las MISMAS vistas con un tablero inventado («Ejemplo»), para las capturas de revisión de identidad (blueprint §7.8); su Inicio es también el mapa, y quien «mira» no es el owner, así que el Modelo Económico dice «Solo el owner» | **Solo en local**: `OS_DEMO=1` y nunca `VERCEL_ENV=production` (`src/lib/os/demo/permitido.ts`); fuera de `(app)`, sin compuerta ni base; en Vercel es un 404. `OS_DEMO` no se define en Vercel (owner) |

- **Layouts**: el RAÍZ `src/app/os/layout.tsx` (`data-theme="bcp"`, el Tailwind del panel, `noindex`; `qa-rutas-consolas` (h)); el de
  la consola `src/app/os/(app)/layout.tsx` (`requireConsoleAccess("os")` → `PanelShell` → `ProcedenciaProvider` → `data-os-juego`,
  donde valen los tokens del juego); el de cada módulo `m/<clave>/layout.tsx` (lee su interruptor y, apagado o sin lectura, pinta
  `ModuloApagado` con el motivo; nunca lanza). Hay `error.tsx` en `(app)` y en cada módulo (un fallo del tablero se queda dentro de
  `/os`), y el mapa de la portada tiene su propio límite (`SiElMapaFalla`, con un `Suspense` para que un fallo en el servidor se
  reintente en el navegador): si el mapa falla, Inicio vuelve a las tarjetas y no pierde la lista de los módulos, los avisos ni
  «Copiar contexto para Tailor» (`qa-os-check` H13). Hay `force-dynamic` en cada página. Como en este App Router la página corre EN PARALELO con su layout, cada página que lee
  datos mira también su interruptor antes de leer (`qa-os-check` H2b).
- **La llave**: `panel_users.consoles.os` (`"admin"` | `"viewer"`, `src/lib/panel/niveles.ts`). En F2 todo es `lectura`, así que los
  dos niveles ven lo mismo. **No se concede por invitación**: el formulario de Usuarios y `sanitizeConsoles` leen
  `CONSOLAS_INVITABLES` (`CONSOLE_ORDER` sin `os`, decisión 21); se concede con un `UPDATE` de `panel_users` en la sesión del owner,
  después del despliegue (decisión 16 y Pendientes). Las tres filas de `panel_users` que existen hoy no la tienen: hasta ese
  `UPDATE` nadie ve `/os`; y hasta que se conceda la de GVB (`admin`, decisión del owner), nadie más que el owner.
- **Quién mira, una vez por petición**: `identidadDeLaOs` (`src/app/os/(app)/quienMira.ts`) es `requireConsoleAccess("os")` con `cache`
  de React. La llama el layout (que redirige sin llave) y la llaman las páginas que leen el tablero, para pasarle `isOwner` a
  `leerTablero(isOwner)` (y solo esas cuatro páginas lo nombran). **El Modelo Económico es solo del owner**: sin él, el servidor no
  llama a `leerPvc` ni lee el PVC por las tareas de la casa (`cargarTareas(service, { conPvc: false })`), sus cuatro piezas
  dicen «Solo el owner» (no es un error ni «Sin datos», nunca un cero, y no deja aviso), y las tareas `pvc:*` y los hechos de las
  tablas del PVC no se cuentan en el hub 3 (la cifra lo dice con su nota). Nada del PVC —ni códigos ni conteos— viaja al cliente
  ni a la carga RSC. `qa-os-check` H12 lo vigila.
- **El interruptor por módulo**: la llave `os_modulos` de `platform_settings` (`{ version: 1, consola: {encendido, motivo},
  modulos: {<clave>: {encendido, motivo}} }`). F2 solo la LEE (`src/lib/os/interruptores.ts`): sin fila mandan los valores por
  defecto del registro (`MODULOS_OS`: los tres encendidos); si la lectura falla o el valor no tiene forma, **todos los módulos del
  OS se apagan** con su motivo (apaga el OS, nunca la red: ninguna otra superficie lee esa llave). **Quién la escribe llega en el
  PR1b** (decisión 18): `osModulosActions.ts` y su tarjeta en BCP › Manejo de Plataformas, con su fila
  `platform_setting.os_modulo_cambiado` en `hechosCatalogo.ts`; F2 no trae escritor (crítica 24: una vista previa comparte las
  llaves de producción).
- **Lo que la rodea**: `robots.txt` lleva `Disallow: /os` (el patrón de la casa; la línea ANUNCIA la ruta, y lo que la protege es
  el login y el `noindex`, no el secreto: crítica 21); la puerta pública `/control-panel` NO la enseña (`ControlPanelLanding`
  la filtra y su copia sigue diciendo «cuatro»); `/panel` la lista como las demás para quien tenga la llave; `?volver=/os…` es
  una vuelta válida de las entradas de Herramientas Internas (`VUELTAS_PERMITIDAS`).
- Sin subdominio. Solo la sesión `ctc-panel-auth`, sin mezclarla nunca con la cookie compartida ni con la de socios.
- **Por venir** (no en F2): los módulos que reemplazan pantallas (`/os/m/<clave>`, tabla del principio estrangulador), las
  herramientas en `/os/herramientas/[slug]` y el lado del Code Master (`soloOwner`). Hacienda, Almacén y Taller **no reemplazan
  ninguna pantalla**: son vistas de lectura, sin lista de paridad.

## Identidad CTCx

El owner pidió que la app tenga la identidad y el tacto de CTCx (2026-11-04). **Lo que F2 aplica** (V6.19; el visto bueno del
owner llega con la revisión de las capturas):

- **Una sola fuente**: `src/app/globals.css`, con el tema de consola (`data-theme="bcp"`, la paleta del logo), y las tres fuentes
  de `src/app/layout.tsx`: Fraunces para títulos, Instrument Sans para texto, Spline Sans Mono para etiquetas y cifras.
- **Los tokens propios del juego** van en UN archivo, `src/components/os/identidad/os-tokens.css`: los `--os-*` que nombra
  `TOKENS_DE_ARTE` (`haciendaArte.ts`) más `--os-trazo`, todos derivados con `var()` / `color-mix()` de `--crema`, `--green`, `--red`,
  `--ink`, `--navy` y `--paper`; ninguno escrito a mano. Solo valen dentro de `data-os-juego`, así que el rail y la cabecera siguen
  en el tema de la casa. `--crema` (#F5F0E2, el texto claro de las bandas) es **token de la casa desde la V6.19** (`.band h2` lo
  lee; mismos píxeles).
- **Qué dice cada color**: el morado CTCx es el chrome (el HUD va sobre `--primary`, crítica 26, para no fundirse con la
  `.topbar` móvil en `--primary-deep`); los colores y sellos de grado salen SOLO de `src/lib/grados/definicion.ts` por
  `SelloGrado.tsx`, y la Hacienda no los usa; el rojo de alerta va solo en el banderín «VENCIDAS n», que siempre lleva su palabra.
  **Cada alerta, su icono y su palabra** (PLAN §7.7): el triángulo de `IconoAlerta.tsx` (decorativo, `aria-hidden`) va delante de
  «Aviso» y de las saludes «Falló» y «Atrasada», y el banderín de las vencidas lleva el suyo; el nombre accesible es la palabra.
- **El acento de la OS en el conmutador** es el crema (`accent: "#F5F0E2"`): claro, se lee bajo el texto oscuro del conmutador.
  Donde el acento es TEXTO, ICONO o RAYA sobre blanco (el código, el glifo, la raya y el borde al pasar de la tarjeta de `/panel`;
  el código y el borde de la ficha en Usuarios; la raya de su columna en el diagrama de Documentación) la OS usa la tinta
  (`accentTexto: "var(--ink)"`), así que ninguna de las otras cuatro consolas cambia un píxel por el acento (crítica 3; el
  diagrama sí cambia para las cinco por el ancho de columna: charter `consolas`, Pendientes). Queda en crema el tinte de la caja
  del glifo en `/panel`. Aprobado por el owner el 5 nov (decisión 15).
- **El logo**: el raster oficial con hash (`public/images/shared/ctc-logo-full.png`, una vez, en Inicio: al pie de la portada en el
  mapa, o arriba en las tarjetas si la Hacienda está apagada), nunca un trazo SVG. El HUD
  dice «CTCx» en Fraunces, **sin logo**: el blueprint §7.3 pide el logo a la izquierda del HUD, pero no hay un loro oficial blanco o
  lila para la barra morada (las SVG de `reference/` son trazos de la PNG, no originales; decisión 22). Su glifo en el conmutador
  es una rejilla de 2×2 baldosas (`ConsoleGlyph`, genérico).
- **Movimiento y sonido**: sin sonido ni bucles; transiciones cortas; `useMovimientoReducido` sigue a `prefers-reduced-motion`
  (`qa-os-check` G).
- **Las reglas de la casa**: botones abajo a la derecha y acordeones cerrados; español primero y el vocabulario congelado de
  `ALINEACION.md` §1. Los botones dicen su efecto: «**Copiar contexto para Tailor**» (no «Hablar con Tailor», crítica 27), y su
  aviso sale solo cuando el portapapeles respondió; si falla, enseña el texto para copiarlo a mano.
- **Accesibilidad — F2 NO puede declarar WCAG 2.2 AA** (crítica 29). El anillo de foco de la casa (3 px de `--accent`) da ≈ 1,4:1
  sobre el papel de la consola, y los botones, enlaces y tarjetas de hub de la OS lo heredan; solo los edificios de la Hacienda
  llevan un anillo propio (discontinuo, `--primary`). El arreglo (anillo de foco con contraste, el amarillo sobre claro del tema de
  consola, el carmesí del logo) repinta TODAS las consolas y va en su propio PR con el sí del owner (decisión 20). **Hecho:** el PR #53 entra en el mismo tren que la V6.19. **Otro hueco
  conocido**: el modal de la casa (la hoja de un hub) no encierra el foco ni deja inerte el fondo; su arreglo es del modal, para
  todas las consolas (charter `consolas`, Pendientes).
- **La Hacienda es accesible por teclado**: el SVG es `role="group"` (no `img`, que ocultaría los botones), cada edificio un
  `role="button"` con Enter/Espacio, las capas decorativas `aria-hidden`; al abrir la hoja de un hub el foco entra en su título, y
  al cerrarla vuelve al edificio (o al botón de la lista) que la abrió. Los edificios reciben el foco en el orden en que se pintan,
  de atrás adelante (1, 0, 5, 6, 9, 8, 4, 2, 7, 3), no por número: **el camino ordenado con el teclado es la lista «Los diez hubs»**,
  justo debajo del dibujo, en el orden del Mapa CTC (lo dice su nota). En el dibujo, un hub sin cifra lleva la ficha punteada con
  una raya, y el texto del encabezado dice qué significa; la lista dice «Sin datos» con su palabra.
- **«Ver fuentes» es un botón de alternar**: su nombre no cambia, su estado lo dice `aria-pressed`.

## Mapa de código

- `src/lib/os/hechosCatalogo.ts` (puro) y `src/lib/os/hechos.ts` (server-only, solo lectura): **los hechos** (V6.18). Una forma
  normalizada —tipo · actor (perfil y rol, nunca un nombre) · entidad (término del juego, tabla, id) · cuándo · transición · sello
  · efectos en las barras (con la columna real de cada cifra) · ubicable— sobre `audit_log`, `integration_events` y `latidos`. No
  lee `audit_log.notes` ni el `payload` entero. F2 lo lee por `leerHechos` para contar los hechos del turno (24 h) por hub.

**F2 (V6.19) · el núcleo PURO** (`qa-os-check` lo corre sin base, con datos inventados):

- `src/lib/os/fuentes.ts` — **de dónde sale cada cifra**: `PIEZAS` y `FUENTES` (cada pieza con su `etiqueta`, su `unidad`, su
  fuente —`tabla.columna` o `archivo:<ruta>#<función>`—, su filtro y su `enlace` a la pantalla de la consola dueña;
  `cuentaCeroSiFalla` / `nuloSiFalla` dicen cuándo la función reusada convierte un fallo en 0 o en null). `consolaDelEnlace` y
  `enlaceVisible` copian la regla del rail para «Abrir»: hace falta la consola, y un enlace o grupo `ownerOnly` solo lo ve el owner
  (crítica 12; `/ecp/pvc` es `ownerOnly`).
- `src/lib/os/tablero.ts` — **el tablero**: `armarTablero` convierte las lecturas en lo que pintan las vistas. El hub de una tarea o
  de una pieza se DEDUCE del catálogo de los hechos (`ENTIDAD_DE_TAREA`, `ENTIDAD_DE_PIEZA`; el despacho por su acción
  `purchase_contract.despacho_registrado`), nunca se escribe; las tareas llegan reducidas a CONTEOS (sin texto, clave ni enlace por
  registro, crítica 13); una lectura que falla deja sus piezas en `null` («Sin datos») y un aviso, nunca un cero; un hub que no
  puede recibir tareas de la plataforma dice «Sin datos» (`sin_fuente_aun`), no 0. También `saludDeLosCrons` (la misma regla
  que el tablero de Automatizaciones, crítica 7), `resumenDelHud`, `contextoParaTailor` (solo conteos y estados) y `piezasMuertas`.
  Y el PVC solo del owner: `PVC_SOLO_OWNER` (lo que va en lugar de la lectura), `esPvcSoloOwner`, `esTareaDelPvc`, `TABLAS_DEL_PVC`
  y `esHechoDelPvc` (sacadas de las entidades `pvc_*` del catálogo de los hechos) y `hubsDelPvc`; las notas `solo_owner` y
  `sin_el_pvc` están en `fuentes.ts` y las pinta `Cifra`.
- `src/lib/os/modulos.ts` — el registro de módulos (`MODULOS_OS`: hacienda · almacén · taller, todos `lectura`, encendidos por
  defecto, cada uno con su `edificio`: la Hacienda ninguno —es el mapa—, el Almacén el hub 2 y el Taller el hub 5) y
  `parsearModulos` (la forma de `os_modulos`).
- `src/lib/os/haciendaArte.ts` — la geometría de la Hacienda (rejilla isométrica, diez edificios, suelo, río, matas, árboles, patio,
  anillo de selección): trazos SVG y nombres de tokens, **sin un solo texto** (`qa-os-check` H10). Solo la geometría de la maqueta
  local; nunca su texto ni sus datos.
- `src/lib/os/demo/{permitido,datos}.ts` — la demostración: `TABLERO_DEMO` pasa lecturas inventadas por el MISMO `armarTablero` y
  marca cada cifra `demo: true`; la identidad de la demostración es inventada y no es owner. Es el único archivo con cifras escritas
  (exención exacta de `qa-os-check` B1, que H7 sigue vigilando).

**F2 · los lectores, SOLO SERVIDOR y SOLO LECTURA** (nunca lanzan, nunca escriben):

- `src/lib/os/interruptores.ts` — `leerModulosOs` (una lectura de `os_modulos` por petición) y `moduloEncendido(clave)`.
- `src/app/os/(app)/quienMira.ts` — `identidadDeLaOs`: la compuerta de la consola una vez por petición; de ahí sale `isOwner`.
- `src/lib/os/lectura.ts` — un lector por parte del tablero, cada uno con `Lectura<T>` (valor, o código de fallo y piezas en «Sin
  datos»): `leerTareasDeLaCasa`, `leerTratos`, `leerStockDelCircuito`, `leerPvc`, `leerSalud`, `leerHechosPorHub`,
  `leerLotesPorEtapa`. **Reusa funciones de otros componentes en solo lectura** (y no las cambia): `cargarTareas`
  (`src/lib/panel/tareasCarga.ts`, `consolas`), `pendientesDelCircuito` y `cargarCircuitoDelStock` (`src/lib/stock/circuito.ts`, `consolas` · OCP),
  `edicionVigente` / `edicionProxima` (`src/lib/pvc/servicio.ts`) y `estadoDelAgente` (`src/lib/pvc/agente.ts`, de
  `herramientas-internas`), `CRONS` (`registroCrons.ts`) y las etiquetas de `src/lib/ocp/etapas.ts`. Esas funciones leen más de lo
  que el OS enseña (las tareas leen nombres; el agente del PVC lee su `pvc_cop`, sus insumos y sus salidas, crítica 8): el OS lo
  LEE en el servidor y NUNCA lo pinta. Los despachos vencidos son los de `pendientesDelCircuito().sacosVencidos`, contados desde las
  tareas `despacho:vencido:*` (crítica 6). Las cuentas no se cortan en silencio en las 1000 filas de la API (crítica 9):
  `count: "exact", head: true` por estado o etapa, o `truncado` cuando el total pasa de lo que llegó. `leerPvc` pide
  `{ isOwner: true }` por tipo y, sin el owner, devuelve `PVC_SOLO_OWNER` sin leer; `leerTareasDeLaCasa` y `leerHechosPorHub`
  reciben `{ conPvc }` y, sin él, descartan lo del PVC en el servidor antes de contar. `leerTareasDeLaCasa` se lo pasa también a
  `cargarTareas`, que entonces ni lee el estado del PVC (`propuestasPendientes`, `estadoDelAgente`) ni arma las tareas `pvc:*`.
- `src/lib/os/tableroServidor.ts` — `leerTablero(isOwner)`: corre los lectores a la vez (las tareas primero, que alimentan los
  vencidos), arma el tablero y nunca lanza; sin credencial, todo «Sin datos» con un aviso por lector. Sin el owner, `leerPvc` no se
  llama: va `PVC_SOLO_OWNER` (también si la lectura entera falla).

**F2 · las rutas y las vistas**: `src/app/os/` (ver «Superficies y rutas») y `src/components/os/`: `Procedencia.tsx` (el contexto de
quien mira y el interruptor «Ver fuentes» del HUD), `Cifra.tsx` (el ÚNICO que formatea números y horas; `RotuloLeido`,
`SaludLeida`, `Hora`; también pinta «Solo el owner»), `Hud.tsx`, `Avisos.tsx`, `CopiarContexto.tsx`, `SiElMapaFalla.tsx` (el
límite del mapa de la portada), `ModuloApagado.tsx` (y sus
palabras, `porQueEstaApagado`, que repite la hoja de un edificio), `identidad/{os-tokens.css, SelloGrado.tsx,
useMovimientoReducido.ts}`, `os.module.css` y `vistas/{Inicio,Hacienda,Almacen,Taller,Encabezado}.tsx` (Inicio pinta la Hacienda
con `portada`; con la Hacienda apagada, las tarjetas).

**F2 · fuera del OS** (con su línea en `ALINEACION.md` §3): `src/lib/panel/consoles.ts` (`os`, `accentTexto`,
`CONSOLAS_INVITABLES`), `src/components/panel/ConsoleGlyph.tsx`, `src/app/panel/{page.tsx,hub.module.css}`,
`src/app/bcp/(app)/usuarios/UsuariosClient.tsx` y `usuariosActions.ts`, `src/app/bcp/(app)/documentacion/EstructuraModal.tsx`
(columnas de 224 px para cinco consolas), `src/components/services/ControlPanelLanding.tsx` (de `consolas`);
`src/app/robots.txt/route.ts` y `src/app/globals.css` (`--crema`) (de `plataforma`); `src/lib/herramientasInternas/entrada.ts`
(de `herramientas-internas`).

- `docs/componentes/ctcx-os/atlas.md`: el atlas. `docs/componentes/ctcx-os/reuniones.md`: el primer módulo.

## Tablas que posee

**Hoy, ninguna.** Lee, en solo lectura: `audit_log`, `integration_events`, `latidos` y, para resolver actores, `profiles`,
`panel_users`, `partner_accounts` (ids y roles). **Desde F2 (V6.19)** el tablero de `/os` lee además, con el service role y
solo en el servidor: `purchase_contracts` y `contract_despachos` (conteos por estado y kilos), `stock_partidas` (solo su conteo,
`head: true`), `pvc_correcciones` (conteo de propuestas, **solo si quien mira es el owner**), `automations` (etapa, disparador, clave, dominio), `lots` (conteo por
`stage`) y la llave `os_modulos` de `platform_settings`; y, a través de funciones de sus dueños, lo que leen `cargarTareas`,
`pendientesDelCircuito`, `cargarCircuitoDelStock`, `edicionVigente` / `edicionProxima` y `estadoDelAgente` (ver «Mapa de código»). Cada módulo lee y escribe las tablas de su dueño **a través de las Server
Actions de su dueño**.

**Propuesto · pendiente del sí del owner** (el blueprint de Code Master, F4):

- **`os_actas`**: el acta durable de una reunión, de borrador a entregada. Aditiva, solo de servicio (service-role), RLS
  sin políticas más un guard trigger; DDL solo por `apply_migration` con el owner y su acta en `docs/migraciones`. Guarda
  el acta en tránsito y la URL de Notion que devuelve `reunion.espejada`. Si sus escrituras dejan `audit_log` (F4 lo
  pide), su `entity_type` entra en `hechosCatalogo.ts` en la misma tanda (regla propia 2). Qué texto guarda el acta y qué
  viaja por la espina es la decisión abierta 11.
- **Las metas (`os_metas`) y el interruptor por módulo**: claves de `platform_settings`, no tablas nuevas.

## Guardianes

- **`qa-os-hechos-check.mjs`** (offline; V6.18; 329 al 2026-11-05): todo `entity_type` de `audit_log` y todo `tipo` de
  `emitEvent` del código tiene su línea en el catálogo y al revés; cada acción con efecto existe; cada medida es una columna
  real; privacidad probada con centinelas; `hechos.ts` es server-only y no escribe. Desde la V6.19 comparte utilidades
  (`columnasDe`, `quitarComentarios`, `listarArchivos`) con `qa-os-check` por `scripts/os-qa-comun.mjs`, que es una ayuda, no
  un guardián (no se corre solo).
- **`qa-os-check.mjs`** (offline; V6.19; **659** comprobaciones al 2026-11-05, sobre 43 archivos del OS;
  `node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/qa-os-check.mjs`). Lee `src/app/os`,
  `src/components/os` y `src/lib/os` y corre sus módulos puros contra datos inventados. Grupos: **A** el OS no escribe (ni base, ni
  Storage, ni `fetch`, ni eventos, ni Notion, ni acciones de otras consolas —tampoco por `import()` dinámico, ni escribiendo con
  corchetes (`["update"]`, `[OP]` tras `.from()`)—; **ningún `"use server"`**, ni en una acción de una línea: F2 tiene cero Server
  Actions); lee solo tablas declaradas y escritas como literal (un `.from(variable)` falla), nunca `select("*")`; `stock_partidas` solo se cuenta; cada select lleva `count: "exact"` o
  acaba en `.maybeSingle()`; ninguna columna de persona, de texto libre ni de salida del PVC; y de los módulos de la plataforma que
  también escriben importa solo las funciones de lectura de una LISTA (crítica 8). **B** ninguna constante de negocio ni dato real
  (cifras con nombre de negocio, importes con la moneda delante o detrás, kilos, cargas y sacos escritos, grados redefinidos, las dos formas de `CTC-L-`, correos, UUID, ids de Notion/Make/Drive,
  coordenadas, teléfonos), con la exención exacta de `demo/datos.ts`; B9 lee una lista local de centinelas SOLO de la variable
  `OS_CENTINELAS` (crítica 23; sin ella avisa y no falla, e imprime el número del centinela, nunca el término). **C** cada pieza
  apunta a una columna o función que existe y a una pantalla que existe, y el tablero las saca todas; solo `Cifra` formatea. **D/E/F**
  solo tokens de la casa o `--os-*` derivados en `os-tokens.css` (definidos y usados, iguales a `TOKENS_DE_ARTE`) —ningún hex,
  función de color ni nombre de color de CSS, tampoco en `border`, `outline`, las sombras o un `borderColor` de React—, las tres fuentes,
  los logos por hash. **G** palabras prohibidas, sin sonido ni bucles, transiciones cortas, sin modo noche, sin restos de la maqueta
  (crítica 28). **H** registro de módulos ↔ carpetas ↔ rail, interruptor en layout Y página (H2b), aislamiento (fuera del OS nadie
  lo importa, salvo el futuro escritor a `modulos.ts`), el escritor del PR1b y su fila del catálogo llegan juntos (H5), las listas
  de consolas a la vez (H8: `CONSOLES`, `CONSOLE_ORDER`, `ConsoleGlyph` y `CONSOLAS_INVITABLES` sin la OS, con `sanitizeConsoles`
  y el formulario de invitación leyéndola: la decisión 21 tiene guardián), lo puro es puro y lo que lee la base es server-only
  (H9), el arte sin textos (H10), ningún rótulo de la Hacienda pisa a otro ni se sale del lienzo (H11, con `rotuloArte`, lo mismo
  que pinta la vista), **el Modelo Económico solo del owner** (H12: `leerPvc` solo se nombra en su archivo y en el del tablero, cada
  llamada va tras `isOwner ?` con `{ isOwner }`, su primera línea devuelve `PVC_SOLO_OWNER`, cada página pasa a `leerTablero` el
  `isOwner` de `identidadDeLaOs`, y las tareas y los hechos del PVC no se cuentan sin él) y **la portada en el mapa** (H13: Inicio
  pinta la misma Hacienda si su módulo está encendido, cada módulo se abre desde su edificio según su interruptor, y
  `/os/m/hacienda` sigue viva). **T** las reglas
  puras con datos inventados (hubs por tipo de tarea, conteos, salud, interruptor, «Abrir», HUD, contexto para Tailor, la
  demostración, y el PVC con y sin el owner: «Solo el owner», sin aviso, sin valor, la nota `sin_el_pvc` solo en su hub). Cada buscador se prueba a sí mismo con una muestra mala y una buena. **Vigila también código de fuera** (por eso
  su línea en §3): un control textual de paridad con el filtro de crons de `AutomatizacionesBoard.tsx` y un cable trampa sobre el
  bucle de `tareasCarga.ts` que crea las tareas `despacho:vencido:*`.
- Se reutilizan los que ya existen: `qa-rutas-consolas` (556; layout raíz (h) de `os`), `qa-niveles-check` (38), `qa-nav-check` (29;
  recorre `CONSOLE_ORDER` y comprueba que es igual a las claves de `CONSOLES`), `qa-entradas-check` (114; `/os` en
  `VUELTAS_PERMITIDAS`), `qa-encoding-check` y `qa-grados-check` (58).
- Por venir, con el primer módulo que reemplace una pantalla: un guardián de **paridad** (cada módulo declara la pantalla vieja y
  las acciones que cubre, y comprueba que llama a las mismas Server Actions).
- **Propuesto · pendiente del sí del owner** (el blueprint de Code Master, §9.7): **`qa-os-propuestas`** (F4) y la **paridad de
  lectura** (F3: cada cifra del OS contra su SQL). En F2 la paridad se comprobó UNA vez a mano, en local y en solo lectura (los
  conteos del tablero contra la base), sin guardián.

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

Todo. Con `/os` (decisión 1; construido en F2, V6.19), el OS es una consola más, la quinta, que escribe solo por las acciones de sus
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
   y Cherry Picked al final, como modos; la OS, la ÚLTIMA de `CONSOLE_ORDER` (aprobado). **El diseño (layout, llave,
   interruptores) está construido en F2 (V6.19)** y se aprueba al revisar el PR y sus capturas; lo que F2 decidió por defecto
   está abajo, de la 14 a la 24.
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

**Las de F2 (V6.19).** Cada una tiene un valor por defecto que ya está en el código; el owner lo confirma o lo cambia.

14. **En qué edificio vive el PVC** — **decidida (owner, 5 nov): 3 · Comercial**, donde el catálogo de los hechos pone la edición y
    las correcciones (`tablero.ts`, `ENTIDAD_DE_TAREA.pvc` y `ENTIDAD_DE_PIEZA`, sin cambio de código). **Diferencia que queda
    anotada, sin armonizar**: el registro de crons (`src/lib/integraciones/registroCrons.ts`) sigue poniendo sus dos crons
    (`/api/cron/vigilancia-pvc` y `/api/cron/agente-pvc`) en 0 · Dirección. Ese archivo NO es de la OS: es de toda la plataforma
    (lo leen el tablero de Automatizaciones, `integraciones/actions.ts` y `qa-registro-crons`, y su `dominio` es el de las filas de
    `automations` en la base), así que la OS no lo cambia. Si el owner quiere los crons también en 3, es un cambio de su dueño
    (`consolas` · Automatizaciones) con su línea en `ALINEACION.md` §3 y la fila de `automations` al día. Mientras tanto, la salud de
    esos dos crons cuenta en el edificio 0 y en el Taller (solo su salud: si corrieron, nada del Modelo).
15. **El color de la OS en el conmutador** — **aprobado por el owner el 5 nov**: el crema de la casa (#F5F0E2, `--crema`), que se lee
    bajo el texto oscuro y se distingue del lavanda, el oro, el azul y el rosa de las otras cuatro; el morado CTCx no sirve ahí (su
    texto no se lee). Sobre blanco, la tinta (`accentTexto`).
16. **El nivel de GVB en la llave `os`** — **decidida (owner, 5 nov): GVB es `admin` en `/os`.** No se concede nada desde aquí ni en
    este PR. Después de fusionar, con el sí del owner y en su sesión: la llave `os` a nivel `admin` para el usuario de panel de GVB,
    con su fila en `audit_log` en la misma sentencia (la propuesta del charter `consolas`, Pendientes), y volver a leer la fila.
    Hasta entonces nadie más que el owner ve `/os`. El lado del Code Master se protegerá con una comprobación de owner, no con el
    nivel; y el Modelo Económico ya es solo del owner aunque GVB sea `admin` (H12).
17. **El Taller partido en dos**: en F2 enseña solo la salud del sistema, y GVB la ve. **Por defecto: «Pedidos a Code / Parches»
    será OTRO módulo, solo del owner** (`soloOwner: true`, enlace `ownerOnly`).
18. **Quién apaga y enciende los módulos del OS**: cualquier admin del BCP (como los demás ajustes de plataforma) o solo el owner.
    **Por defecto: un admin del BCP**, en el PR1b (el escritor `osModulosActions.ts`, clase `emite`, con su fila en `audit_log` según
    la convención de `platform_setting`: `entity_id` = el perfil de quien actúa, el ajuste en `new_status`, el motivo en `notes`).
    Hasta el PR1b nadie lo cambia desde una pantalla: valen los valores por defecto del registro.
19. **El enlace «Hablar con Tailor»**: F2 COPIA el contexto (conteos y estados) para pegarlo en Tailor («Copiar contexto para
    Tailor»). ¿Basta, o se quiere un enlace directo al proyecto de Tailor? Ese enlace tendría que vivir fuera del repo público.
20. **Los tres arreglos de la casa que repintan todas las consolas** (un anillo de foco con contraste, el texto amarillo sobre claro
    del tema de consola, el carmesí del logo): **decidida (owner, 5 nov): un PR pequeño propio, ya** (PR #53, en el
    mismo tren que la V6.19; ver «Identidad CTCx»).
21. **La OS en la invitación de Usuarios**: hoy queda FUERA del formulario de invitación y de `sanitizeConsoles`
    (`CONSOLAS_INVITABLES`), y se concede a mano por SQL. ¿Se ofrece por invitación, y a quién? (charter `consolas`, Pendientes.)
22. **El loro de la barra morada**: las SVG de `reference/` son trazos de la PNG, no originales. ¿Puede pedirse a quien diseñó el
    logo un raster oficial blanco o lila (o el vector original)? Mientras tanto el HUD dice «CTCx» en letra, y el blueprint §7.3
    (logo a la izquierda del HUD) queda corregido así.
23. **`OS_DEMO` en las vistas previas de Vercel**: por defecto NO (decisión del owner): las capturas de la demostración son solo
    locales y se adjuntan al PR. Definirla en Preview (nunca en Production) sería un cambio de ajustes de la cuenta, del owner.
24. **El circuito del lote sale de F2** (crítica 31): el blueprint pone «el circuito del lote» entre los lectores de F2; se mueve a
    **F2b**, con el dueño del OCP (extraer la consulta de `cargarKr` en `src/app/ocp/(app)/kr/carga.ts` a un lector compartido del
    servidor, que usen `cargarKr` y la OS, con su caso de paridad). Cambia el criterio de salida de F2: la Hacienda no cuenta aún el
    hub 1 por estado del circuito.

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
- ~~**Si el owner acepta `/os`** (decisión 1): la línea «Para `consolas`» en `ALINEACION.md` §3 y la fila «Vocabulario
  congelado» de §1 al día.~~ **Hecho en F2 (V6.19)**: §1 nombra cinco consolas y tiene la fila de la OS; §3 lleva las líneas
  «Para `consolas`», «Para `plataforma`» y «Para `herramientas-internas`».
- **Cuando el owner decida 1 y 2**: el primer módulo, con su lista de paridad en la tabla de arriba y su guardián.
- **Si el owner acepta el componente**: ~~su fila en la tabla de componentes de `docs/HANDOFF.md`~~ (entró con F2, V6.19, marcada
  «F2 construido, el resto en borrador») y su grupo en la barra lateral (de Code Master; no se toca desde aquí).

**De F2 (V6.19)** — lo que queda para fusionar y lo que F2 dejó con dueño:

- **Antes de fusionar, en la sesión del owner (solo lectura)**: contar las cuentas `profiles.role = 'bcp_admin'` SIN fila en
  `panel_users`. La revisión de F2 lo contó el 2026-11-05: 3 `bcp_admin`, 0 sin fila, 0 con `os`; se vuelve a contar el día de la
  fusión.
- **Revisar los NOMBRES de las variables del entorno Preview de Vercel** antes del primer PR (solo nombres; blueprint §8): las
  vistas previas comparten llaves de producción, por eso F2 es solo lectura y el escritor va en el PR1b.
- **Fusión y despliegue** (paso de producción, con el sí del owner tras ver el PR y las capturas): la versión se toma al empujar
  (V6.19 si `main` no se movió); comprobar en vivo con `curl -L` la insignia `V6.19 · build <sha>`, que `/os` manda a `/login` a un
  anónimo, que `/os/demo` es 404 y que `robots.txt` dice `Disallow: /os`.
- **La llave `os`** (producción, sesión del owner, con su sí, DESPUÉS de fusionar y desplegar; no se concede nada antes): el `UPDATE
  panel_users` del owner y, aparte, el de **GVB a nivel `admin`** (decisión 16, del owner), cada uno con su fila en `audit_log` en la
  misma sentencia (propuesta en el charter `consolas`, Pendientes), y volver a leer las filas. Hasta el de GVB, nadie más que el
  owner ve `/os`. Luego el owner abre `/os` con su login y comprueba que abre en el mapa, que la hoja del hub 2 abre el Almacén y la
  del hub 5 el Taller, que el Modelo Económico le enseña sus cifras a él (y «Solo el owner» a GVB) y que cada «Abrir» lleva a una
  pantalla real (la OS real no se pudo conducir en un navegador: pide contraseña y código por correo; comparte las vistas con la
  demostración).
- **El PVC fuera de la OS, para `consolas`**: `cargarTareas` (`src/lib/panel/tareasCarga.ts`) tiene desde F2 la opción `conPvc`
  (por defecto `true`, así que el ECP, el OCP y la LCP no cambian). La OS la pasa con la condición del owner: para quien no es el
  owner, ya no lee el estado del PVC (`propuestasPendientes`, `estadoDelAgente`). ~~Lo que queda es de `consolas`: si el owner
  quiere el PVC solo suyo también en el Tablero de Ejecución, basta con pasar `conPvc: isOwner` en `/ecp` (decisión del owner).~~
  **Hecho en la V6.20** (el owner lo decidió el 5 nov: el Modelo Económico es solo suyo en todas las consolas): `/ecp` pasa
  `{ conPvc: identity.isOwner }`, `/ecp/pvc` entero pide la compuerta del owner y el Panel del BCP no lee las ediciones sin él
  (`ALINEACION` §3, fila del 2026-11-06; guardián `qa-pvc-owner-check`).
- **PR1b · el escritor del interruptor** (con `consolas`): `osModulosActions.ts` en el BCP (clase `emite`), su tarjeta en Manejo de
  Plataformas, la fila `platform_setting.os_modulo_cambiado` en `hechosCatalogo.ts` (convención de la crítica 15) y
  `revalidatePath("/os", "layout")`. `qa-os-check` H5 exige que lleguen juntos.
- **F2b · el circuito del lote** (con `consolas` · OCP; decisión 24): el lector compartido de la consulta de `cargarKr`, el conteo
  del hub 1 por estado del circuito y su caso de paridad en `qa-os-check`.
- **Con `consolas`**: (a) extraer el filtro de la salud de los crons de `AutomatizacionesBoard.tsx` a una función pura junto a
  `saludDeCron` en `registroCrons.ts`, y entonces retirar el control TEXTUAL de paridad de `qa-os-check` (crítica 7); (b) que
  `pendientesDelCircuito` acepte el stock ya cargado (`stockPrevio`) o que `cargarTareas` lo pase, para que el tablero cargue el
  stock UNA vez (hoy dos: crítica 5).
- **Las funciones reusadas que convierten un fallo en 0 o en null** (`cargarTareas`, `cargarCircuitoDelStock`, `edicionVigente`):
  la OS lo marca pieza a pieza (`cuentaCeroSiFalla`, `nuloSiFalla`) pero no puede distinguir un 0 real de un fallo. Arreglo en sus
  dueños, cuando se toquen.
- **El tope de 1000 filas de la API** se SUPONE el de Supabase por defecto (no se pudo leer por SQL): la franja sale con `truncado`
  si `stock_partidas` pasa de 1000 (si ese conteo falla, no se afirma el tope: la franja lleva su nota «cuenta cero si falla»).
  Solo se vigilan las partidas; las otras tablas que lee `cargarStock` tienen el mismo tope. Confirmarlo en los ajustes de la API.
- **Las cifras que se comparan con otra pantalla**: los despachos (pendientes, en camino, kilos por recibir) cuentan solo saco o
  adelanto, como el «Por recibir» de Adquisición y la franja; la cola de eventos cuenta TODOS los pendientes y fallidos, y el tablero
  de Automatizaciones solo los de sus 30 últimos eventos (su arreglo es de `consolas`, Pendientes, punto 8). «Ver fuentes» lo dice.
- **El catálogo de los hechos** sigue sin «Jugador» ni «Incumbent» (punto de arriba): F2 no lee esos términos.
- **Accesibilidad** (decisión 20, decidida): el anillo de foco de la casa se arregla en el PR #53, en el mismo tren que la V6.19;
  aun así la OS no declara WCAG 2.2 AA sin una auditoría propia. La hoja de un edificio retiene
  el foco por su cuenta (Tab y Mayús+Tab dan la vuelta dentro de la hoja, en `Hacienda.tsx`); el `Modal` compartido sigue sin
  retenerlo en las otras consolas, y su arreglo repinta todas (va con la decisión 20).
- **Las capturas de la demostración** (1280, 1024 y 375 px, solo locales) se adjuntan al PR; no viven en el repo.
- **La fila del Registro del sistema** «CTCx OS · Puesto de mando» (consola, Área 5) se crea el día de la fusión (regla 2).
- **Para las notas del PR · la llave de GVB**: el PR NO concede nada. Después de fusionar, con el sí del owner en su sesión: la llave
  `os` a nivel `admin` para el usuario de panel de GVB, con su fila en `audit_log` (decisión 16). Hasta entonces nadie más que el
  owner ve `/os`.
- **Para las notas del PR** (no son de F2, se dicen para que nadie lea un rojo o un verde falso): (a) `npm audit` da 14 avisos
  (2 bajos, 12 moderados: `@hono/node-server`, `deepmerge` vía `shadcn`, `minimatch` vía `ts-morph` y `typescript-eslint`) con el
  MISMO `package-lock.json` que `main`: son avisos nuevos sobre `main`, para el carril de `plataforma`, no se mezclan aquí. (b) En
  un checkout de Windows con `core.autocrlf=true`, `qa-stock-ctcx-check` (1 fallo), `qa-centro-calidad-check` (2) y
  `qa-ciclos-check` (2) fallan porque buscan un salto de línea LF literal en archivos que F2 no toca; en un checkout con LF pasan
  enteros (86, 313 y 146 al 2026-11-05). Se corren sobre LF antes de
  dar la compuerta por verde.

## Kick-off

```
Trabajas SOLO en el componente «CTCx OS» (clave: ctcx-os) de la plataforma CTC. Es la capa de juego sobre la
operación real: hoy no posee tablas (propuestas: os_actas y las metas), abre las herramientas que existen con
contexto, y cada mecánica es una acción de negocio real con cifras reales. Desde F2 (V6.19) es la quinta consola,
/os, de SOLO LECTURA: cero Server Actions, cada cifra con su fuente (src/lib/os/fuentes.ts) y qa-os-check en verde. Antes de tocar nada lee:
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
