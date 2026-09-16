# Secretaría CTC · el espejo entre la plataforma, Notion y Google (plan y escaneo, 2026-09-12)

> Charter del componente: `docs/componentes/secretaria.md`. Este documento es el **escaneo** que lo
> fundamenta (qué hay hoy en Notion, en Google, en Make y en la base de la plataforma), la
> **doctrina** del espejo, la **tabla de correspondencias** y las fases. La doctrina de zonas viene de
> `docs/INTEGRACIONES_PLAN.md` §1 y aquí se completa con lo que el owner pidió el 2026-09-12: *«todo
> lo que se pueda gestionar desde las plataformas internas tiene su espacio allí, y Notion refleja
> esos datos —sin limitarse a ellos— para que el equipo use Notion como interfaz principal»*.

## 0 · Lo que se pidió, en una frase por pieza

1. Un componente («Secretaría») capaz de **leer la plataforma y sus componentes** para tener contexto,
   y de **usar los conectores** (Notion, Drive, Gmail, Calendar/Meet; Contacts cuando exista) para
   mover datos en ambos sentidos.
2. **Productores**: la lista de Notion refleja los del OCP sin limitarse a ellos, con una propiedad
   que diga «viene del OCP». Lo mismo para **fincas**, **lotes** y lo que aplique.
3. **Directorio de Contactos Personales** (Notion) ↔ **Google Contacts**, ida y vuelta.
4. Meta: el equipo trabaja en Notion; la plataforma sigue siendo la fuente de lo que gestiona.

## 1 · Escaneo (comprobado con los conectores el 2026-09-12)

### 1.1 Notion — «CTC Main's Space», cinco teamspaces (Ejecución · Knowhow · Admin · Operacion · GTM)

La lógica del sistema, tal y como la explican las reuniones GVG & GVB (jun–jul 2026) y la bitácora
«Consolidación GVG & GVB — Puntos abiertos y decisiones» (09.09.2026, mantenida por «Betty»):

- **Objetivos y Tareas es el centro**: toda reunión empieza y termina ahí. Dos bases: *Objetivos
  Estratégicos* (TEMATICA: IT DEV · Contenido · EVENTO · Desarrollo · Administrativo · Operacion ·
  Ventas; Blocking/Blocked by; `Drive Temporal`) y *Tareas Administrativas* (Task Theme: ADMIN ·
  BACKSTAGE · OPERATION · SALES · STRATEGY; Importancia; Responsable). El objetivo «Lista de
  Productores» (Not started, 13–23 jul) apunta a la Lista de Proveedores.
- **Notion es el sistema de control documental**; Google Docs solo cuando hace falta formato de
  impresión (se pega la URL). Drive: `A. Docs Temp` para objetivos activos, `D. Carpetas Auxiliares
  Permanentes` para lo que trasciende (una carpeta AUX por directorio: Proveedores, Clientes,
  Partners), `B. Banco Audiovisual`, `C. Contabilidad`, `E. Videollamadas`, `Z. Archive`.
- **El sistema de gestión se alinea al ciclo PHVA** sin reestructurar Notion: se añaden variables de
  clasificación a cada ítem (decisión 14.07).
- Las **transcripciones de Notion Calendar** nacen en la raíz y se mueven a mano a Reuniones Generales.
- Un **agente de Notion** agotó los tokens del mes en una corrida (11.07) y quedó restringido a tablas
  internas — precedente directo para el presupuesto de la Secretaría.

Bases que tocan a la plataforma (filas contadas hoy):

| Base (data source) | Filas | Propiedades que importan | Relaciones |
|---|---|---|---|
| 🌿 **Lista de Proveedores** (`384e…72057c6f`) | **44** | Estatus (Nuevo Contacto · Descubriendo CTC · Alineados · Alineados-RFQ Abierto · RFQ Vencido · Abandonado), **KR Lista A/B/C** (3 en A), Supplier Type, NIT, correo, Supplier Folder/File (Drive) | Fincas, Contactos Personales, Compras, Reuniones, Objetivos |
| 🌿 **Lista de Fincas** (`384e…70428fba`) | **10** | Status (No Identificada · Revision de Info · Identificada), Municipio, Departamento (3 opciones), Área ha, MASL, Coordenadas, EUDR Geolocation File, Variedades | Proveedor (1), Fichas Técnicas |
| 📋 **Fichas Técnicas de Café** (`384e…52353963`) | **11** (todas 2026_1, pre-plataforma) | Availability (Mencionada · Requerimientos · Revision · Disponible para RFQ · Descontinuada), SCA, Variedad, Beneficio, Tipo de Lote, kg, precios pre-acordados, Ficha oficial (file), Datasheet Folder | Finca, **Grado CTC**, Catálogo, Inventario |
| 🥁 **Grados de Calidad CTC** (`38ae…20a51107`, dentro de Conceptos Fundamentales) | 5 | Min/Max SCA: **Black 80–81.99 · Red 82–83.99 · Blue 84–85.99 · Gold 86–87.99 · Tyrian 88–100** | Fichas |
| **Cotizaciones CTC** (`d605…e189b13`, Recursos de Contenido) | **0** | `ctc_id`, Estado, Total, Vigencia, **Nota comercial** (el único campo que vuelve) | — (el espejo F2, ya cableado) |
| 🦊 **Directorio de Clientes** → *Clientes Potenciales* (`384e…bb591ae9`) | **62** (57 Nuevos · 3 Primarios · 1 Secundarios · 1 Obsoleto) | Customer Type (16), HQ City/Country, NIT, Customer Folder/File | Contactos, Reuniones, Seguimiento de Ventas (Lead Board → Venta Firmada) |
| 🤝 **Directorio de Partners** (`384e…7f75dca3`) | **88** | Partner Type (12: Government, Logistics, Q-Grader, Technology Supplier…), Relevancia (Strategic · Key · General · Service · Collaboration · Supplies), Partner Folder | Contactos, Reuniones, Compras de Insumos, Proceso |
| 📒 **Directorio de Contactos Personales** (`384e…9f3430f2`) | **123** (58 con correo, 66 con teléfono) | Nombre, Role, Contact Email, Contact Telepone, Key Contact Facts, Notes, Supplier Profile Pic, `Ref Partner ID`, rollup «Ultima fecha de Contacto» | Cliente, Proveedor (dos relaciones duplicadas), Partner, Reuniones |
| **Reuniones Generales** (`382e…28e87ceb`) | **39** (17 concluidas · 15 open points · 7 programadas) | Tipo (interna · estratégica · externa), Fecha, `URL` (Meet), Personal CTC | Clientes, Partners, Proveedores, Contactos |
| 🧱 Inmuebles y Personal → *Personal* (`388e…0662cb9a`) | ~3 | CTC Job, correo, Carpeta de Drive | Reuniones |
| **Plataformas Web CTC** (`3a4e…f90dc1c9`, IT / Plataformas Web) | **22** | solo título + fecha | — (una fila por superficie/componente: las 5 de Red de Socios, Ecosistema de Valor, CommaaS, Terratalento, «General System Improvements - Claude Code», «NOTAS DE RETROALIMENTACIÓN GENERAL») |
| 📌 Compra, Inventario y Produccion → *Compras e Inventario Entrante*, *Compras de Insumos*, Inventario, Procesamiento, Empacado | — | Estado de Compra (Bajo Consideración → Recibido), RFQ, Factura, kg | Proveedor, Partner, Fichas |

Otras páginas relevantes: «Checklist de Proceso de Creación - Plataformas Web» (las reglas UI/UX que
ALINEACION §1 ya cita), «Directorio especialistas de cafe» (Banco de Ideas; la contraparte del
componente `directorio`), «Muestras para Evaluacion de Lotes» (Conceptos Fundamentales, editada
2026-09-12).

### 1.2 Google

- **Gmail** (809 en bandeja): las etiquetas `0. ADMIN Y ESTRATEGIA` … `6.INVESTIGACION Y DESARROLLO` son
  exactamente `DOMINIOS` (`src/lib/integraciones/dominios.ts`) y las pone el escenario de Make
  «Gmail · Clasificar por dominio» (2.881 corridas, 1 error). Subetiquetas: `/FACTURAS`, `/FEDEX`,
  `/DHL`, `/CHAMPION LOGISTICA`, `/Cotizaciones JIACUI`, `5.IT/GAppScripts` (1.123 mensajes de
  scripts). El Buzón del ECP sigue leyendo por IMAP (`mailbox_messages`).
- **Calendar**: `ctcexportmain@gmail.com`, `GVB` (America/Bogota), `GVG` (Europe/Berlin), `Pico&Placa`,
  y **«CTC · Operación»** — descrito en su propia descripción como *«Jornadas de Arena y de Recolecta,
  publicadas por la plataforma CTC. Los eventos los crea y los borra un escenario de Make»*.
- **Drive**: la estructura de §1.1. Las carpetas AUX de cada directorio espejan las bases de Notion
  (Proveedores · Clientes · Partners); las páginas de Notion guardan la URL en `Supplier/Customer/
  Partner Folder`.
- **Contacts**: **no existe conector** en Claude Code ni en el registro MCP (los resultados son
  Apollo, Lusha, Brevo…). Make tiene módulos de Google Contacts, pero la cuenta de CTC **no tiene esa
  conexión creada** (solo Google, Gmail, Notion Public, Canva, ClickUp, OpenAI).
- **Meet**: vive como `URL` en Reuniones Generales; las transcripciones las hace Notion Calendar.

### 1.3 Make (org 3400730 · team «Colombian Trading Company Core» 1569723 · eu2)

| Escenario | Estado | Qué hace |
|---|---|---|
| **9621729 · CTC · Eventos de la plataforma** | activo, **0 ejecuciones** | webhook → router por `tipo`: cotización emitida → página en Cotizaciones CTC; jornada creada → evento en «CTC · Operación»; cerrada → borra. Conexiones Notion Public + Google. |
| **9621737 · Notion · Nota comercial → CTC** | activo, 2.880 corridas, 2 errores | vigila Cotizaciones CTC y devuelve `Nota comercial` a `/api/integraciones/make`. |
| **9622256 · Gmail · Clasificar por dominio** | activo, 2.881 corridas | Gemini clasifica y etiqueta. |
| 9637873/9637876 HLM, 9651685 Wasnt Me | «Local Toys GV» | ajenos a CTC. |

Los tres primeros están registrados en `automations` (ECP · Automatizaciones) tal cual.

### 1.4 La plataforma (Supabase `sjznkzvefqfcysczllli`)

| Contraparte | Filas hoy | Notas |
|---|---|---|
| `profiles(role=producer)` + `producer_profiles` | **25** (20 reales + 5 `prueba-*` de la flota QA) | Muchas cuentas de prueba/humo entre las «reales» («Leirbag Zeuqsav», «Community as a Service Commaas», «CTC Redes», «CienSoles Studio»…). Solo 7 con finca o lote. |
| `fincas` | **7** (3 `approved`: La Ceiba, La camelia, Palmas; 4 `pending_review`, entre ellas «Aaa», «kbj») | EUDR completo en la fila. |
| `lots` | **13** (12 borrador, 1 apto) · `lot_fichas` (V5.23) · `lot_evaluations` | Ningún galardonado aún. |
| `quotes` | 4, todas `borrador`, sin `notion_page_id` | Coherente con las 0 filas de Notion: el espejo dispara al **emitir**. |
| `leads` | 15 (cocreate 5 · tech 5 · varietales 4 · general 1) · `buyer_profiles` 2 | Clientes potenciales de la plataforma. |
| `partner_accounts` | 2 (`estudio-contenido` activa · `centro-calidad` suspendida), ambas «CTC Interno» | Los cinco nodos de la Red de Socios. |
| `panel_users` | 3 (owner admin×3 · gvg · gvb viewers) | El equipo. |
| `directorio_profiles` | 4 verificados | Directorio del Café. |
| `transcripts` | 6 | OCP · Transcripciones. |
| `platform_surfaces` | 19 | ECP · Manejo de Plataformas. |
| `integration_events` | 22 (pruebas F2 de agosto) | La espina funciona; nadie la usa en producción todavía. |
| `automations` | 4 | El registro de Make. |

### 1.5 Hallazgos que cambian el plan

1. **Los grados ya coinciden en lo estructurado.** La base «Grados de Calidad CTC» de Notion dice lo
   mismo que `definicion.ts` (80·82·84·86·88, dos decimales, el límite es del grado de arriba). Lo que
   está **desactualizado es la prosa** de la página (Black 80+ · Red 84+ · Blue 85+ · Gold 87+ ·
   Tyrian 89+) y la nota de `INTEGRACIONES_PLAN.md` §1 (80/84/86/88/91). Primera tarea de la Secretaría:
   reescribir esa prosa desde la base. El conflicto que sigue abierto es el del **PVC** (ALINEACION §1).
2. **Cero enlaces hoy entre Notion y la plataforma** fuera de cotizaciones: ninguna proveedora, finca
   o ficha de Notion lleva `ctc_id`. Coincidencias probables por nombre (a confirmar por el owner):
   «Doña Hortencia» ↔ productor «Hortencia PALMAS»; «Hacienda Calapo» ↔ la cuenta «Finca calapo»;
   «La Fortaleza / Wilmer R» y «La Pradera» tienen fichas y fincas en Notion pero **no cuenta** en KR;
   «La Ceiba» está en la plataforma (aprobada) y en Notion solo como página de Inmuebles, no en la
   Lista de Fincas.
3. **Dos contraseñas en claro** en títulos de páginas de Objetivos y Tareas (las páginas «Finca calapo…» y
   «finca hortencia palmas…»). Son cuentas de KR. ⚠️ **Las credenciales nunca se copian en este archivo**: el repositorio es
   público. Hay que sacarlas de ahí y **rotarlas** (decisión del owner: la
   Secretaría no toca credenciales).
4. **La lista de Plataformas Web CTC ya está partida como los componentes** (incluye los cinco nodos,
   Ecosistema de Valor, CommaaS, Terratalento). Es el lugar natural para reflejar versión viva y charter.
5. **Google Contacts no tiene camino directo**: ni conector en Claude ni conexión en Make. El único
   bus posible es Make con una conexión nueva (owner) — o Google Apps Script, que ya se usa
   (`5.IT/GAppScripts`).
6. Las bases de Notion tienen **dos relaciones duplicadas** Contactos ↔ Proveedores («Lista de
   Proveedores» y «Lista de Proveedores 1») y un data source vacío «New data source» en Proveedores:
   higiene previa al espejo.

## 2 · Doctrina del espejo (lo que va a ALINEACION §1 como contrato)

1. **La plataforma es la fuente de lo que gestiona** (Zona A del plan de integraciones): productores,
   fincas, lotes, fichas, evaluaciones, grados, cotizaciones, contratos, catálogo, membresías, leads,
   credenciales de socio y de equipo, superficies. Notion **refleja** eso y **puede tener más filas**
   (prospectos, contactos, orgs sin cuenta) — nunca al revés: un prospecto de Notion entra en la
   plataforma solo cuando se registra por la puerta que le toca (KR, CP, captación).
2. **Tres propiedades en toda base espejada**, con el patrón que ya usa Cotizaciones CTC:
   `ctc_id` (texto, «la llave estable del espejo — no editar»), **`CTC`** (select: `OCP` · `ECP` ·
   `BCP` · `CP` · vacío = solo Notion) y `Enlace CTC` (url a la consola). Los campos que la
   plataforma manda llevan en su descripción «Lo manda la plataforma. Cambiarlo aquí no cambia nada allí».
3. **Espejo, no sincronización.** La plataforma empuja; Notion añade campos narrativos propios; de
   Notion vuelve **solo lo que tenga manejador con nombre** en `src/lib/integraciones/aplicar.ts`
   (hoy: `cotizacion.nota`). Nunca «el registro entero».
4. **Conciliar es humano.** El agente casa por `ctc_id`; si no hay, por correo; si no, por nombre
   normalizado — y en los dos últimos casos **propone y el owner confirma** antes de escribir el
   `ctc_id`. Nunca fusiona ni borra páginas.
5. **Google Contacts ↔ Notion por campos con dueño**: Google manda en nombre · teléfonos · correos ·
   empresa; Notion manda en Role · Key Contact Facts · notas · relaciones. Cada lado guarda la llave
   del otro (`Google resourceName` en Notion; `notion:<page_id>` en las notas del contacto). Un cambio
   en un campo del otro dueño no se propaga: se **reporta**.
6. **Drive es el archivo de Notion, Storage es el de la plataforma.** El espejo lleva enlaces, no
   copias. Excepción a decidir: el certificado EUDR (PDF) a la carpeta AUX del proveedor.
7. **Lo continuo va por la espina** (`integration_events` → Make → Notion, con `notion_espejos` como
   tabla de llaves); **lo puntual lo hace el agente** (conciliaciones, migraciones, auditorías, la
   prosa de Notion) y lo deja escrito en la bitácora de este documento (§5).
8. **Presupuesto**: el agente lee con SQL sobre data sources (barato) y escribe página a página; nunca
   recorre un teamspace entero «para ver». Las corridas grandes (>100 páginas) se anuncian antes.

## 3 · Tabla de correspondencias

| # | Notion | Plataforma | Google | Dirección | Hoy | Fase |
|---|---|---|---|---|---|---|
| 1 | Lista de Proveedores (44) | `profiles`+`producer_profiles` (20 reales) | Drive «Directorio de Proveedores (AUX)» | plataforma → Notion (alta, nombre, correo, departamento, KR estado); Notion superconjunto | 0 enlaces; 4 coincidencias probables | **F0** conciliar · **F1** evento `productor.registrado` |
| 2 | Lista de Fincas (10) | `fincas` (solo `approved`) | Drive (EUDR file) | plataforma → Notion (nombre, municipio, ha, MASL, estado EUDR/aprobación); `Status` de Notion es de Notion | 0 coincidencias | F0 · F1 `finca.aprobada` |
| 3 | Fichas Técnicas de Café (11) | `lots` galardonados/publicados + `lot_fichas` + `lot_evaluations` | — | plataforma → Notion (grado, puntaje, variedad, beneficio, kg, enlace a la ficha oficial); Notion guarda RFQ/precios pre-acordados | sin solape (Notion = cosecha 2026_1 previa) | F1 `lote.galardonado` |
| 4 | Grados de Calidad CTC (5) | `src/lib/grados/definicion.ts` | — | plataforma → Notion (ya iguales); reescribir la prosa | prosa vieja | **F0** |
| 5 | Cotizaciones CTC (0) | `quotes` (4 borradores) | — | ida (emitir) y vuelta estrecha (`Nota comercial`) | cableado, sin uso real | vivo |
| 6 | Clientes Potenciales (62) + Seguimiento de Ventas | `leads` (15) + `buyer_profiles` (2) | Drive «Directorio de Clientes (AUX)» | plataforma → Notion (lead/comprador creado, `CTC`=ECP/CP); el CRM narrativo es de Notion; `leads.status` y `Status` de Notion son propiedades distintas | 0 enlaces | F1 `lead.creado`, `comprador.registrado` |
| 7 | Directorio de Partners (88) | `partner_accounts` (2) | Drive «Directorio de Partners (AUX)» | Notion manda (Zona B); la plataforma aporta `Nodo CTC` + estado de credencial a las orgs que sean nodo | 0 enlaces | F1 (`socio.credencial`) |
| 8 | Directorio de Contactos Personales (123) | — (las `profiles` son cuentas, no contactos) | **Google Contacts** | bidireccional por campos con dueño (§2.5), vía Make | sin bus | **F2** |
| 9 | Personal (Inmuebles y Personal) | `panel_users` (3) | Drive carpeta por persona | plataforma → Notion (consolas, estado) | — | F1 (opcional) |
| 10 | Reuniones Generales (39) | `transcripts` (6, OCP) | Calendar (4 calendarios) + Meet URL | Notion manda; la Secretaría crea la página desde el evento y enlaza la transcripción (`Enlace CTC`) | manual | F3 |
| 11 | Objetivos y Tareas | «Pendientes» de los charters + ALINEACION §3b | Drive Temporal | bidireccional **a demanda**: pendiente con dueño → tarea con `Componente` y enlace al charter; tarea cerrada en Notion **no** cierra el pendiente (lo cierra la sesión del componente) | manual | F3 |
| 12 | Plataformas Web CTC (22) | `platform_surfaces` (19) + `docs/componentes/*.md` + `APP_VERSION` | — | plataforma → Notion (versión viva, charter, subdominio, grupo de la barra lateral) | solo títulos | F3 |
| 13 | Etiquetas de Gmail 0–6 | `DOMINIOS` · Buzón ECP (IMAP) | Gmail | Make etiqueta; la plataforma lee | vivo | vivo |
| 14 | — | `terratalento_jornadas`, jornadas de Arena | Calendar «CTC · Operación» | plataforma → Calendar | cableado, 0 ejecuciones | vivo |
| 15 | Drive A/B/C/D/E/Z | Storage de la plataforma | Drive | enlaces, no copias (§2.6) | — | — |

## 4 · Fases

- **F0 · El agente, sin código (esta semana).** En Notion: añadir `ctc_id` · `CTC` · `Enlace CTC` a
  las bases 1, 2, 3 y 6; limpiar la relación duplicada y el data source vacío de Proveedores;
  proponer al owner las coincidencias de §1.5.2 y escribir solo las confirmadas; reescribir la prosa
  de «Grados de Calidad CTC» desde la base; señalar (no tocar) las dos páginas con contraseñas.
  Cada corrida deja una entrada en §5.
- **F1 · La espina (dueño: `consolas`, una versión).** Tabla `notion_espejos` (entidad · entidad_id ·
  notion_page_id · notion_url · synced_at; service-role-only, patrón de la casa) en vez de columnas
  en tablas guardadas; eventos nuevos `productor.registrado` · `finca.aprobada` · `lote.galardonado` ·
  `lead.creado` · `comprador.registrado` · `socio.credencial`; manejador entrante genérico
  `<entidad>.espejada` que escribe en `notion_espejos`; ramas nuevas en el escenario 9621729 (una base
  por tipo) o un escenario por base; `scripts/espejo-reporte.mjs` (solo lectura: filas de la plataforma
  sin espejo, páginas con `ctc_id` huérfano) como guardián del componente. Excluye `prueba-*` y fincas
  no aprobadas por regla.
- **F2 · Contacts ↔ Notion (dueño: Secretaría + owner en Make).** Conexión Google Contacts en Make;
  dos escenarios (watch Contacts → Notion; watch Notion → Contacts) con data store de llaves y la
  regla de campos con dueño; corrida inicial de conciliación por correo/teléfono propuesta por el
  agente.
- **F3 · Notion como interfaz del equipo.** Plataformas Web CTC con versión/charter; Reuniones con
  transcripción enlazada; Objetivos y Tareas con los pendientes de los charters (propiedad
  `Componente`, enlace al charter).

## 5 · Decisiones del owner (bloquean)

1. **Google Contacts**: crear la conexión en Make (o preferir Apps Script). ¿Confirmas la regla de
   campos con dueño de §2.5?
2. **Coincidencias de §1.5.2**: ¿Doña Hortencia = Hortencia PALMAS? ¿Hacienda Calapo = «Finca calapo»?
   ¿La Pradera y La Fortaleza deben tener cuenta en KR (y quién las crea)?
3. **Las dos contraseñas en claro** en Objetivos y Tareas: sacarlas y rotarlas.
4. **Certificado EUDR a Drive**: ¿sí (carpeta AUX del proveedor) o solo enlace?
5. **Lotes**: el espejo arranca en `galardonado` (recomendado) o ya en `apto`.
6. **Datos de humo en producción** (cuentas y fincas de prueba fuera de la flota `prueba-*`): ¿se
   limpian antes de conciliar? Recomendado: sí, desde el BCP, con lista previa.

## 6 · Bitácora de conciliaciones (la escribe cada sesión de la Secretaría)

| Fecha | Base | Qué se hizo | Páginas tocadas | Pendiente que dejó |
|---|---|---|---|---|
| 2026-09-12 | — | Escaneo inicial (este documento). Ninguna escritura en Notion. | 0 | F0 completa |
