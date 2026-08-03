# Análisis · Reestructura V4 — la red orquestada desde el CTC Control Panel

**2026-07-29 · análisis previo al plan.** Fuente: board de arquitectura del owner
(imagen entregada en conversación; conviene guardarla en
`reference_html-vision-board/` junto a `ctc-arquitectura-v3.html` para que no se
pierda). Este documento **no es todavía el plan de ejecución**: es la lectura de
lo que el board propone, el diff contra lo construido, y las decisiones que hay
que tomar antes de partir el trabajo en fases.

Antecedente: el board v3 (`reference_html-vision-board/ctc-arquitectura-v3.html`,
ver [[reference-vision-board-v3]] en memoria) ya estableció la tesis —
*"CTC no es dueño de ninguna máquina, es dueño del expediente"* — y las tres
capas de identidad. **El board V4 no la contradice: la extiende.** Lo nuevo es
que ahora hay un *hub con cara pública* y que cada satélite tiene un **contrato
de entrada/salida distinto** con ese hub.

---

## 1 · La tesis nueva, en una frase

> El **CTC Control Panel** deja de ser una puerta de servicio (`/login`) y pasa a
> ser el **producto raíz**: tiene landing pública y login propio, y de él cuelgan
> las tres consolas, cada una dueña de un dominio distinto de la red.

Y el corolario que el owner nombra explícitamente:

> **Cada satélite se proyecta y devuelve información de una manera distinta.**
> Coffeed es la excepción que prueba la regla: solo proyecta, no recoge nada.

Eso segundo es lo que convierte el board en arquitectura y no en organigrama: no
basta decir "el ECP es dueño del Directorio", hay que decir **qué contrato de
datos** tiene el Directorio con el hub.

---

## 2 · El reparto de dominios (lo que el board reorganiza)

**Misión por consola (refinada por el owner, 2026-07-31):**

| Consola | Misión | Satélites | Módulos internos propios |
|---|---|---|---|
| **BCP** · Base | **El negocio núcleo** — encontrar el mejor productor, el mejor producto y el mejor cliente | Kaffetal Regal → Cherry Picked · Co-Create | **Black Stock** (compras de café Black, del embudo KRA) · **CRM Co-Create** |
| **OCP** · Operación | **La rama operativa (no-admin)** — todo lo que debe pasar en el mundo real para que los flujos corran | Centro de Calidad · Agente de Carga · Agente de Nacionalización · Master Roaster · Estudio de Contenido | Leads `general` (recepción) |
| **ECP** · Dirección | **El negocio estratégico** — la capa complementaria construida alrededor del núcleo para mejorarlo o facilitarlo | Directorio del Café · Herramientas del Café · Coffeed · CTC Tech · Varietales | **Gestión de Coffeed** · **CRM Tech** · **CRM Varietales** · IT y Plataforma · **Back Office** (placeholder, admin — para después) |

Y la ecuación del board: **BCP + OCP = Orquestación Operacional**. Es decir, el
mercado y la red de nodos no son dos cosas paralelas — juntos son *la máquina que
entrega*, y lo que entregan desemboca en Cherry Picked / Co-Create. El ECP queda
al lado, no debajo: dirige y además es dueño de los productos que **sostienen**
la máquina sin ser la máquina.

Esto encaja con lo ya construido más de lo que parece:

- `/ecp/directorio` (verificación de fichas) y `/ecp/herramientas` ya viven en el
  ECP. ✅ El board solo les está dando **cara pública propia**.
- `/ocp/socios` (alta y baja de credenciales de nodo) ya vive en el OCP. ✅
- `/ocp/leads` (triage de prospectos) ya vive en el OCP — y es exactamente el
  buzón donde caerán los *project forms* de CTC Tech / Varietales / Co-Create.

---

## 3 · El contrato de E/S por satélite (la parte nueva de verdad)

Tres clases. Esta clasificación es la que debe gobernar el diseño de cada
superficie nueva, porque determina si necesita tabla propia, login, o nada.

### Clase A — Bidireccional (login propio, escribe de vuelta)
**Kaffetal Regal, Cherry Picked (Green/Roast/X), Directorio del Café,
Herramientas del Café, los 5 nodos socios.**

El usuario entra con credencial, opera, y lo que hace **modifica el expediente**
(el lote, la ficha, la reserva, la ficha de persona). Mecánica ya resuelta: cuenta
de Supabase Auth + fila de perfil por superficie + RLS/guard triggers. Los nodos
socios son el caso especial ya construido: tier `partner`, un nodo exacto,
`SECURITY DEFINER` para leer solo su tajada del pasaporte.

### Clase B — Solo captación (landing + project form, sin login)
**CTC Tech, Varietales, Co-Create.**

No hay sesión ni panel. La superficie **captura una intención** y la convierte en
algo que ya existe dentro del hub. El board lo dibuja literalmente:
`CTC Tech → KR`, `Varietales → KR`, y Co-Create colgando del Mercado.

**Esto ya está implementado, solo mal empaquetado.** Hoy los cuatro pilares de
`leads` (`general` / `tech` / `cocreate` / `varietales`) son *secciones* de CTC
Home con modales de contacto; el pilar decide el rol de la cuenta
autoprovisionada (`cocreate` → buyer/Cherry Picked, el resto → producer/KR, vía
`promoteFreshBuyerToProducer.ts`). El board no pide un mecanismo nuevo: pide
**desagregar esas secciones en superficies con subdominio propio**. El backend
(tabla `leads`, emails Resend, triage en `/ocp/leads`) se reutiliza tal cual.

### Clase C — Solo difusión (sin login, sin captación)
**Coffeed.**

El hub escribe, el mundo lee. Ya construido con esa forma exacta:
`getCoffeedWall()` devuelve **solo capítulos `published`** con columnas de
exhibición curadas (patrón `public_lot_catalog`), y los anuncios internos nunca
viajan. El board le da lo único que le falta: **una Home propia** en vez de vivir
solo empotrado como `CoffeedWall` dentro de KR / Cherry Picked / Directorio.

---

## 4 · Diff contra lo construido

### Ya existe y encaja sin tocar
- Login maestro `/login` + `/verify` + OTP, sesión única para las 3 consolas.
- Las 3 consolas paralelas con shell compartido y switcher (`src/lib/panel/consoles.ts`).
- Los 5 nodos socios: subdominio + `/acceso` + `/panel`, tier `partner_accounts`.
- Directorio del Café: landing real + subdominio + verificación en ECP.
- Coffeed: pipeline editorial completo + muro público curado.
- El motor de captación: `leads` + provisión de cuenta + emails + triage OCP.
- Las herramientas: 10 HTML en `public/tools/` ya embebidas en `/ecp/herramientas`.

### Falta construir
| Qué | Clase | Estado hoy | Trabajo real |
|---|---|---|---|
| **CTC Control Panel · landing pública** | — | `/login` es una pantalla pelada | Superficie nueva: subdominio + landing que explique las 3 consolas + entrada al login |
| **Herramientas del Café** | A | solo interno (`/ecp/herramientas`) | Publicar como producto: landing + login + qué herramienta ve quién |
| **Coffeed · Home** | C | solo empotrado | Superficie propia sobre `getCoffeedWall()` (el dato ya está curado) |
| **CTC Tech** | B | sección de CTC Home + pilar `tech` | Landing propia (material en `reference_ctc-tech/`, 5 familias) + form → `leads` |
| **Varietales** | B | pilar `varietales`, sin sección propia | Landing propia + form → `leads` |
| **Co-Create** | B | pilar `cocreate` | Landing propia (material en `reference_concept-pins/`: white label, wholesale, pop-up, retail, subscribers app, fulfillment) + form |

---

## 5 · Decisiones que bloquean el plan (para resolver en conversación)

Estas cinco no se pueden asumir: cambian el alcance de forma material.

**5.1 · ¿Dónde queda CTC Home? — RESUELTO (owner, 2026-07-29)**
**CTC Home es el ENRUTADOR que cubre todo.** No aparece en el board porque no es
un satélite: es la capa de encima. El board dibuja la orquestación; CTC Home es la
puerta pública desde la que se llega a cualquier cosa, incluido el CTC Control
Panel.

Consecuencia directa: CTC Home **cede sus secciones de servicios**
(Tech / Co-Create / Varietales) a las superficies nuevas y se queda con la ficha
de ruta hacia cada una. Lo que hoy es contenido rico dentro de `ServicesSection`
(las 5 tecnologías con sus modales ⓘ) **se muda**, no se borra. `EcosystemSection`
—hoy 2 tarjetas, KR y Cherry Picked— es la semilla del índice del enrutador y
crece hasta cubrir las ~9 rutas. El camino de vuelta ya existe y no hay que
inventarlo: la primera entrada de `QuickNav` ("casa matriz") ya apunta a
`ctcexport.com` desde todas las superficies.

Lo que **no** cede: el pilar `general` ("Escríbenos"), la historia, el manifiesto
y la identidad corporativa. El enrutador sigue siendo un sitio, no un menú.

**5.2 · ¿Los nodos socios pierden su landing? — RESUELTO (owner, 2026-08-03)**
**La landing SE QUEDA**: es el lugar donde cada socio entra sus credenciales — el
"solo Login" del board era taquigrafía, no una orden de retirada. Sin cambios por
ahora; cada página evolucionará cuando se trabaje la funcionalidad de ese perfil,
no antes. (Contexto original: hoy cada nodo tiene "pareja" landing + acceso,
`docs/PARTNER_DOMAINS_SETUP.md`.)

**5.3 · Specialty vs. Black — RESUELTO: NO es un cambio de modelo (owner, 2026-07-29)**
**Todo sigue igual.** La bifurcación del board es una **taxonomía de la oferta**, no
una regla de enrutamiento: *Specialty* y *Black* son las **dos clases de café que
componen el catálogo de Kaffetal Regal*, y **ambas son ofertables a los dos
outlets**. No hay producto que se mueva de superficie.

Por lo tanto: **Cherry Picked conserva sus 3 subpáginas** (Green / Roast / X) y su
pestaña Black tal como está. Catálogo, MOQs y precios no se tocan. Esto saca del
paquete el ítem más caro que el board parecía pedir.

Matiz que sí conviene fijar (Fase 0): **Co-Create es un *outlet* en términos de
negocio pero una superficie de *captación* en términos web** — el board le da
landing + project form, sin login ni catálogo. La transacción no ocurre ahí: el
form deposita el prospecto en la identidad de comprador (que es literalmente lo
que hace hoy el pilar `cocreate` → rol buyer), y el proyecto lo opera CTC con el
tostador. Las dos cosas son ciertas a la vez y hay que decirlas así en el copy
para que nadie espere un carrito en Co-Create.

**5.4 · Coffeed — RESUELTO en contra de la recomendación (owner, 2026-07-31)**
**El Estudio de Contenido NO alojará Coffeed. Coffeed se gestiona únicamente en
el ECP.** La regla "quién opera ≠ quién publica" que este documento había
recomendado queda **descartada** para este caso: gestión y publicación viven
las dos en la consola de dirección.

Consecuencia de migración (trabajo real, no solo copy): el `CoffeedStudio`
completo — pipeline editorial de 7 etapas, hoy en
`/socios/estudio-contenido/panel/coffeed` con gate `estudioGate()`/`requirePartner`
— **se muda al ECP** (p. ej. `/ecp/coffeed`), y sus Server Actions cambian de
gate de partner a gate de consola interna (`requireActiveAdmin`). Las 13 tablas
`coffeed_*` no se tocan (ya son service-role-only, indiferentes a qué gate las
invoca). El nodo Estudio de Contenido queda como credencial "solo login" para
sus otras funciones de red; su panel pierde el módulo.

**5.5 · ¿Una identidad para todo lo público?**
Directorio ya promete en su paso 02 que es *la misma cuenta* que KR / Cherry
Picked. Si Herramientas del Café añade su propio login, hay que confirmar la
regla: **una sola cuenta de plataforma para todas las superficies públicas**, con
una fila de perfil por superficie. Lo contrario (un login por producto) multiplica
soporte y rompe la promesa que ya está escrita en el Directorio.

---

## 6 · El plan por fases

Con §5.1 y §5.3 resueltos, el paquete quedó **más chico de lo que el board
aparentaba**: no hay migración de catálogo, no hay cambio de precios, y el motor de
captación ya existe. Lo que queda es mayormente **contenido y superficies nuevas
sobre mecánica probada**.

Las tres decisiones que estaban abiertas al arrancar quedaron resueltas después:
§5.2 landings de socios (se quedan, 2026-08-03), §5.4 Coffeed opera≠publica
(descartada: todo en el ECP, 2026-07-31) y §5.5 una identidad pública (la matriz
de membresías, 2026-08-02). Ninguna bloqueó la Fase 1.

### Peaje común de toda superficie nueva
Se paga igual en cada una, y conviene hacerlo de memoria:
1. Entrada en `SUBDOMAIN_ROUTES` de `src/proxy.ts` (y recordar que el matcher
   excluye `images`/`docs`/`tools` — un asset estático nunca se proxea).
2. DNS en Hostinger (CNAME al target del proyecto) + dominio en Vercel — patrón
   paso a paso en `docs/PARTNER_DOMAINS_SETUP.md`.
3. `LegalFooter` compartido (NIT + insignia de versión) al cierre.
4. `QuickNav` con la primera entrada a la casa matriz.
5. Subir el dígito menor de `APP_VERSION` (`src/lib/version.ts`) **en el mismo
   commit** que despliega la tanda.

---

### Fase 0 · Congelar las reglas de la red *(sin código)*
Una sola pasada de escritura para que ninguna superficie posterior improvise:

- **El contrato de E/S por clase** (§3) como regla de diseño: si es Clase B no
  lleva login ni tabla propia — deposita en `leads` y punto.
- **El CRM vive en la consola dueña del dominio** (owner, 2026-07-31): cada
  superficie de captación alimenta un kanban simple en SU consola — Co-Create →
  BCP, CTC Tech → ECP, Varietales → ECP; el pilar `general` ("Escríbenos") se
  queda en el OCP como recepción de la red. El kanban da seguimiento y construye
  el contexto local de ese cliente. (Esto reparte lo que hoy hace `/ocp/leads`
  con sus 4 kanbans por pilar — la tabla `leads` sigue siendo una sola.)
- **Una identidad de plataforma** para todo lo público (§5.5), con fila de perfil
  por superficie. El Directorio ya lo promete por escrito en su paso 02.
- **Navegación cruzada entre las plataformas bidireccionales** (owner,
  2026-07-31): como comparten cuenta (mismo Google login, cookie ya compartida
  con `Domain=.ctcexport.com`), moverse entre KR / Cherry Picked / Directorio /
  Herramientas debe ser fácil y visible. La sesión ya viaja; lo que falta es el
  **afordance de UI** — extender `QuickNav` (que ya lleva la entrada "casa
  matriz" en todas las superficies) a un conmutador de red que muestre las
  superficies donde tu cuenta ya tiene perfil.
- **El vocabulario Specialty / Black** (§5.3) redactado una vez y reutilizado
  idéntico en KR, Cherry Picked y Co-Create. Hoy cada superficie lo cuenta a su
  manera; es la clase de deriva que después cuesta caro.

**CONGELADO 2026-07-31** — las cuatro reglas de arriba + el vocabulario canónico
de abajo quedan en vigor. Fase 1 arrancada sobre ellas.

#### Vocabulario canónico Specialty / Black *(fuente única — las superficies lo traducen fiel, no lo reinterpretan)*

> **El catálogo de Kaffetal Regal se compone de dos clases de café.**
> **Specialty** son los lotes con nombre propio: microlotes graduados en la Arena
> (Red, Blue, Gold y Tyrian), pagados por lo que hay en la taza.
> **Black** es el café base de la temporada: limpio, dulce y constante, en
> volumen (lotes de asociación o de finca, 2,5–4 toneladas), negociado
> directamente con CTC a través del Black Stock.
> **Ambas clases nacen del mismo embudo** (la Arena de Kaffetal Regal) **y ambas
> se ofrecen a los dos outlets**: Cherry Picked (Green · Roast · X) y Co-Create.
> Ninguna clase pertenece a un outlet; el outlet decide qué clase necesita.

Matices que el canon fija y las superficies no pueden contradecir:
- "Black" es una **clase de oferta**, no un insulto de calidad: es el grado de
  entrada del sistema CTC (Black < Red < Blue < Gold < Tyrian) Y a la vez el
  producto de volumen que sostiene la operación diaria de un tostador.
- La pestaña Black de Cherry Picked Green vende el **inventario ya adquirido**
  del Black Stock (on spot, Ámsterdam). La negociación de compra de ese
  inventario es del BCP, invisible al comprador.
- Co-Create puede coordinar una compra Black **para un proyecto específico**
  (vía CRM Co-Create ↔ Black Stock), pero eso se narra como servicio del
  proyecto, nunca como "carrito".

Entregable: esta sección de este documento, aprobada. ✔

---

### Fase 1 · El molde Clase B + las tres superficies de captación — ✔ CONSTRUIDA 2026-07-31
*(V2.28. Rutas /ctc-tech /co-create /varietales + CRMs repartidos. Pendiente del
owner: DNS de los 3 subdominios en Hostinger+Vercel, y el material de Varietales.)*
**CTC Tech, Varietales, Co-Create.** Las tres juntas y en este orden dentro de la
fase, porque comparten un único molde: landing seccionada + *project form* →
`leads` con su pilar → provisión de cuenta → triage en `/ocp/leads`.

Backend: **casi cero trabajo nuevo — con una salvedad verificada en código
(2026-07-29).** `src/lib/leads/actions.ts` ya valida los 4 pilares con sus campos
(`tech`, `cocreate`, `varietales`), ya crea la cuenta con el rol correcto
(`cocreate` → buyer; el resto → producer vía `promoteFreshBuyerToProducer.ts`) y
ya manda el email de bienvenida por Resend. Las Server Actions funcionan igual
desde cualquier subdominio (misma app), y la cookie de sesión ya viaja con
`Domain=.ctcexport.com` (el proxy la escribe así), o sea que un subdominio nuevo
hereda el compartir-sesión gratis.

**La salvedad es el botón "Continuar con Google".** `ContactModal` lanza el OAuth
con `redirectTo: window.location.origin + "/auth/callback"` — en un subdominio
nuevo eso apunta a una ruta que no existe (el proxy la reescribiría a
`/ctc-tech/auth/callback`) y a una URL que Supabase Auth rechaza si no está en su
allowlist de redirects. El patrón ya establecido lo confirma: KR, Cherry Picked y
Directorio tienen **cada uno su propio `auth/callback`** + entrada en la
allowlist. Además el flujo de reanudación aterriza en `/?lead=resume` — relativo
a la raíz.

Dos maneras de pagarlo, a elegir al arrancar la fase:
- **(a) Barata y recomendada para el primer corte:** las superficies Clase B se
  lanzan **sin botón de Google** — solo el camino de cuenta-provisionada-con-
  contraseña-temporal, que no tiene round-trip de OAuth y es de verdad cero
  backend. Google se añade después si los leads lo piden.
- **(b) Completa:** un `auth/callback` por superficie (copiando el patrón de
  Directorio) + 3 entradas en la allowlist de Supabase + reanudación por
  superficie. Es mecánica conocida, pero son ~3 rutas y configuración, no cero.

- **CTC Tech** — el contenido ya existe y está bueno: las 5 tecnologías con sus
  modales ⓘ viven hoy dentro de `ServicesSection` de CTC Home, y hay material
  crudo por familia en `reference_ctc-tech/` (`_ozono-uvc`, `_fermentacion`,
  `_seleccion-optica`, `_cromatografias`, `_instrumentacion`). Es una **mudanza con
  ampliación**, no una redacción desde cero. Es la primera de las tres por eso.
- **Co-Create** — material en `reference_concept-pins/` (white label, wholesale,
  pop-up, retail B&M, subscribers app, fulfillment partner, online shop): parece
  exactamente el catálogo de conceptos que la landing necesita. El copy debe dejar
  claro que aquí se propone un proyecto, no se compra (§5.3).
- **Varietales** — **la única con hueco de contenido.** Del pilar solo se deduce la
  forma del form (finca / ubicación / varietal / cantidad → rol producer), o sea un
  servicio hacia el productor. Falta el material fuente para la landing; se pide al
  owner al empezar la fase, y si no llega, esta superficie se separa y las otras dos
  no la esperan.

**El otro lado de la fase: los CRMs en sus consolas (owner, 2026-07-31).** El
form es la mitad; la otra mitad es dónde aterriza. Cada captación alimenta un
**kanban simple en la consola dueña del dominio** — seguimiento + contexto local
del cliente: **CRM Co-Create → BCP**, **CRM Tech → ECP**, **CRM Varietales →
ECP**; `general` se queda en `/ocp/leads` como recepción. El material de
construcción ya existe: los componentes del kanban de `/ocp/leads` (columnas por
status, popup de lead con provisión de cuenta / conexiones / hilo de email /
composer de respuesta) se reutilizan filtrando por pilar — es mover y filtrar,
no diseñar de cero. La tabla `leads` sigue siendo una; cambia qué consola ve qué
pilar.

---

### Vía paralela · Black Stock — ✔ CONSTRUIDA 2026-07-31
*(V2.32. /bcp/black-stock: pipeline kanban [nueva → en conversación → acuerdo
cerca] con seguimiento de kg objetivo + decisión comprar/liberar, e inventario
adquirido con la cadena contrato → releases → publicación en la pestaña Black de
Green. `lead_id` sembrado en black_negotiations para el enlace Co-Create —
columna sin UI, como se decidió. La cola salió de /bcp/contratos, que ahora solo
señala cuántas esperan.)*
**Nuevo alcance (owner, 2026-07-31).** Módulo del BCP que gestiona **las compras
de café grado Black**: las potenciales (pipeline) y las ya adquiridas
(inventario). Nace **del mismo embudo de la KRA** — no es un canal nuevo de
entrada: cuando una jornada gradúa un lote como Black, hoy ya se crea una fila en
`black_negotiations` que se decide suelta en `/bcp/contratos`
(`decideBlackNegotiation`). Black Stock es **convertir esa fila huérfana en un
módulo con dos caras**:

1. **Pipeline de compra** — las negociaciones Black abiertas (lo que hoy es
   `black_negotiations`, con estados de seguimiento).
2. **Inventario adquirido** — lo comprado, que es literalmente lo que alimenta la
   pestaña Black (spot, siempre disponible) de Cherry Picked Green.

**Enlace futuro con el CRM Co-Create** (owner: "shall link at some point"): un
cliente del kanban Co-Create podrá coordinarse con una compra específica del
Black Stock — comprar Black *para* ese proyecto. Se diseña el módulo con ese
enlace en mente (una FK opcional `lead_id` en la negociación basta como semilla),
pero **no se construye el enlace en el primer corte**.

Va como vía paralela porque no depende de ninguna fase (es maquinaria interna
BCP, cero subdominios) y ninguna fase depende de él, salvo el enlace con el CRM
Co-Create — que exige Fase 1 hecha.

### Fase 2 · CTC Home se convierte en el enrutador — ✔ CONSTRUIDA 2026-07-31
*(V2.30. ServicesSection = 4 fichas de ruta; EcosystemSection cierra con el
índice de la red: 7 destinos vivos + Coffeed/Herramientas "Pronto" + acceso al
Control Panel. La copy vive en src/components/services/servicesCopy.tsx.)*
**Va después de la Fase 1 a propósito.** Si se vacía primero, CTC Home anuncia
servicios que no tienen destino; si se hace después, el contenido se muda una sola
vez y nunca vive duplicado en dos sitios.

- `ServicesSection` cede Tech / Co-Create / Varietales y queda con `general`
  ("Escríbenos").
- `EcosystemSection` crece de 2 tarjetas al **índice completo de la red** (~9
  destinos: KR, Cherry Picked ×3, Co-Create, Directorio, Herramientas, Coffeed,
  CTC Tech, Varietales, CTC Control Panel).
- La identidad corporativa —hero, historia, manifiesto, pie— no se toca: el
  enrutador sigue siendo un sitio, no un menú.

---

### Fase 3 · Las dos superficies baratas — ✔ CONSTRUIDA 2026-07-31
*(V2.31. /coffeed = Home Clase C sobre el muro curado, subdominio `coffeed`;
/control-panel = landing pública de las 3 consolas → /login, subdominio
`panel`. Índice de CTC Home actualizado: solo Herramientas queda "Pronto".
Pendiente del owner: DNS de `coffeed` y `panel`.)*
Ninguna toca datos; son la tanda de bajo riesgo después del movimiento grande.

- **Coffeed · Home** (Clase C) — `getCoffeedWall()` ya devuelve solo capítulos
  `published` con columnas de exhibición, y `CoffeedWall` ya está montado en KR /
  Cherry Picked / Directorio. La superficie propia es una **lectura más del mismo
  dato**: sin login, sin captación, sin tabla nueva. **Más la migración de §5.4**:
  el `CoffeedStudio` se muda del panel del socio Estudio de Contenido al ECP
  (`/ecp/coffeed`), cambiando el gate de partner por `requireActiveAdmin` — las
  13 tablas `coffeed_*` no se tocan.
- **CTC Control Panel · landing + login** — es la pieza que le da sentido al board.
  La landing explica las 3 consolas y entrega al `/login` maestro que ya existe
  (password + OTP, sesión única). No toca autenticación: solo le pone cara.

---

### Fase 4 · Herramientas del Café — ✔ CONSTRUIDA 2026-08-01
*(V2.33. /herramientas, subdominio `herramientas`. Decisión del tier anónimo:
la superficie es el ToolSurface `web` — Default = visitante anónimo, Plus =
cualquier cuenta de la red con sesión (la cookie compartida la reconoce sola,
sin login propio). Disponibilidad ganó la columna "Herramientas (web)". El
índice de CTC Home quedó SIN "Pronto": las 9 puertas viven. Pendiente del
owner: DNS de `herramientas`.)*
**Corrección tras verificar el código (2026-07-29): la matriz de permisos YA
EXISTE.** `platform_settings.tools_config` (service-role-only) reparte las 10
herramientas por superficie con niveles **Default/Plus** (Plus = Pasaporte del
Club para productores, escalón pintón/maduro para compradores — `isPlusFor` en
`src/lib/tools/toolAccess.ts`), se administra desde `/ecp/herramientas`
(`ToolsAdmin`), y cada superficie recibe su lista **ya filtrada por server
action** — nada se resuelve en el cliente.

El trabajo real de la fase se reduce a: la landing pública, registrar la
superficie nueva como `ToolSurface` en `src/lib/tools/catalog.ts`, y **una sola
decisión de producto**: qué ve el visitante anónimo (¿un tier "visitante" en la
misma config, o la landing solo muestra el catálogo y las herramientas exigen
cuenta?). La identidad es la única de plataforma (§5.5) — sin login nuevo.

**Caveat que hay que decir en voz alta:** los HTML viven en `public/tools/` y el
matcher del proxy los excluye — son **estáticos y públicos por definición**.
El gating actual es *curaduría* (qué se lista y se embebe para quién), no
*secreto*: quien tenga la URL directa puede bajar el HTML. Para calculadoras es
aceptable y es el estado actual; si alguna herramienta futura fuera de verdad
privada, tendría que servirse por route handler autenticado, no desde `public/`.

---

### Fuera del plan
- **Specialty / Black** — resuelto como vocabulario en Fase 0. Sin fase propia.
- **Landings de los nodos socios** (§5.2) — RESUELTO 2026-08-03: se quedan como
  puerta de credenciales; evolucionan cuando se trabaje cada perfil. Nada que
  retirar.
