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

| Consola | Dominio del que es dueña | Satélites |
|---|---|---|
| **BCP** · Base | **Mercado del café** — identidad y pasaporte del lote | Kaffetal Regal → Cherry Picked · Co-Create |
| **OCP** · Operación | **Los 5 nodos socios** — ejecución delegada | Centro de Calidad · Agente de Carga · Agente de Nacionalización · Master Roaster · Estudio de Contenido |
| **ECP** · Dirección | **Servicios y productos de apoyo** | Directorio del Café · Herramientas del Café · Coffeed · CTC Tech · Varietales |

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

**5.2 · ¿Los nodos socios pierden su landing?**
El board les pone **solo Login**. Hoy cada uno tiene "pareja" landing + acceso
(`docs/PARTNER_DOMAINS_SETUP.md`). ¿Es una decisión (los socios se consiguen por
relación comercial, no por web) o es taquigrafía del board? Si es decisión, hay 5
landings públicas que se retiran o se degradan a página de acceso.

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

**5.4 · Coffeed: ¿quién lo produce y quién lo publica?**
El board lo pone bajo **ECP**; hoy se produce dentro del **nodo socio Estudio de
Contenido** (que es OCP). No es contradicción si se separan los dos roles:
**producción = nodo socio (OCP)**, **propiedad de la superficie = ECP**. Recomendado
adoptar esa distinción como regla general de la red (quién opera ≠ quién publica),
porque volverá a aparecer con Herramientas y Directorio.

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

Las tres decisiones abiertas (§5.2 landings de socios, §5.4 Coffeed opera≠publica,
§5.5 una identidad pública) **no bloquean la Fase 1**. Se adoptan las
recomendaciones como supuesto declarado y solo se revisitan al llegar a su fase.

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
- **Quién opera ≠ quién publica** (§5.4) como regla general de la red.
- **Una identidad de plataforma** para todo lo público (§5.5), con fila de perfil
  por superficie. El Directorio ya lo promete por escrito en su paso 02.
- **El vocabulario Specialty / Black** (§5.3) redactado una vez y reutilizado
  idéntico en KR, Cherry Picked y Co-Create. Hoy cada superficie lo cuenta a su
  manera; es la clase de deriva que después cuesta caro.

Entregable: esta sección de este documento, aprobada.

---

### Fase 1 · El molde Clase B + las tres superficies de captación
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

---

### Fase 2 · CTC Home se convierte en el enrutador
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

### Fase 3 · Las dos superficies baratas *(pueden ir en paralelo)*
Ninguna toca datos; son la tanda de bajo riesgo después del movimiento grande.

- **Coffeed · Home** (Clase C) — `getCoffeedWall()` ya devuelve solo capítulos
  `published` con columnas de exhibición, y `CoffeedWall` ya está montado en KR /
  Cherry Picked / Directorio. La superficie propia es una **lectura más del mismo
  dato**: sin login, sin captación, sin tabla nueva. Aquí se aplica §5.4 por primera
  vez — la produce el nodo socio (OCP), la publica el ECP.
- **CTC Control Panel · landing + login** — es la pieza que le da sentido al board.
  La landing explica las 3 consolas y entrega al `/login` maestro que ya existe
  (password + OTP, sesión única). No toca autenticación: solo le pone cara.

---

### Fase 4 · Herramientas del Café *(Clase A — más barata de lo que este plan decía)*
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
- **Landings de los nodos socios** (§5.2) — decisión pendiente que no bloquea nada;
  si el owner confirma "solo login", es una retirada de 5 páginas, no una
  construcción.
