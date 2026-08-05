# Integraciones · Notion, Google y Make

Plan, no implementación. Escrito el 2026-08-05 después de inspeccionar los cuatro
sistemas con acceso real, no de oídas.

---

## 0. Qué hay hoy, comprobado

| Sistema | Estado | Lo que se vio |
|---|---|---|
| **Notion** | conectado · CTC Main | Workspace desarrollado: 8 hubs, bases reales (Tareas Administrativas, Conceptos Fundamentales, Papers CTC, Hilos de I+D, Recursos de GTM, Documentación CTC Tech, Referencias de Información) |
| **Gmail** | conectado | 469 en bandeja, y una taxonomía de etiquetas que YA es el esqueleto del negocio |
| **Drive** | conectado | DOCUMENTOS LEGALES CTCX, ESTADOS FINANCIEROS CTCX (compartida con la CFO), Carpetas Auxiliares |
| **Make** | Pro activo · eu2 | 750.000 ops/mes, intervalo 1 min, 250 MB por archivo, data stores, BYO-LLM-key. Cero escenarios (limpio) |

### El activo que ya existe y no habíamos visto

Las etiquetas de Gmail y los hubs de Notion son **la misma taxonomía**:

```
0. ADMIN Y ESTRATEGIA        ↔ Administración y Estrategia
1. ORIGEN Y SUMINISTRO       ↔ (cadena: fincas, productores, Arena)
2. TRÁNSITO E IMPORTACIÓN    ↔ (logística: FEDEX · DHL · CHAMPION)
3. TOSTADORES E INVENTARIO   ↔ (Master Roaster, catálogo)
4. VENTAS Y MARKETING        ↔ Go To Market
5. IT                        ↔ Herramientas / CTC Tech
6. INVESTIGACIÓN Y DESARROLLO ↔ I+D
```

Eso no se inventa: es el vocabulario con el que ya se opera. **Debe ser el enum
compartido** de toda la integración — el campo por el que se enruta un correo, se
etiqueta un evento, se clasifica un escenario de Make y se archiva una página de
Notion. Una sola lista, en `src/lib/integraciones/dominios.ts`.

---

## 1. La decisión que gobierna todo lo demás

> «Quiero que cierta información crítica sea redundante y se sincronice sin
> costuras entre Notion y los sistemas CTC.»

La redundancia es el objetivo correcto. La **sincronización bidireccional del
mismo campo** es la forma clásica de perder datos: dos sistemas que ambos pueden
escribir acaban discrepando, y sin transacciones compartidas no hay forma de
saber cuál tenía razón.

La regla propuesta: **cada dominio tiene UN dueño**, y la copia viaja en una sola
dirección.

### Zona A · Postgres manda (Notion LEE, nunca escribe)

Lotes, fincas, productores, Arena, contratos, cotizaciones, catálogo, membresías,
anclas de mercado.

Por qué: estos datos ya están protegidos por triggers guardianes, RLS y
`audit_log`. Un lote no cambia de `stage` porque alguien edite una casilla en
Notion — la máquina de estados existe justo para impedirlo. Notion no puede
honrar esas reglas y no debe intentarlo.

### Zona B · Notion manda (la plataforma LEE)

Doctrina (Conceptos Fundamentales), playbooks, papers, hilos de I+D, memoria de
reuniones, recursos de GTM, estilo de comunicación, tareas administrativas.

Por qué: es prosa que evoluciona, con bloques, archivos y contexto. Postgres es
malo en eso y Notion es excelente.

### Zona C · La frontera — aquí vive la redundancia que se pide

El patrón es **espejo, no sincronización**: la plataforma empuja una página por
registro a una base de Notion, con una propiedad `ctc_id` estable. Notion añade
al lado sus propios campos narrativos (notas de la visita, fotos, contexto
comercial) — esos campos son de Notion y pueden volver por un canal **estrecho y
explícito**, campo por campo, nunca «el registro entero».

Candidatos naturales para el espejo, por orden de utilidad:

1. **Cotizaciones** — el comercial quiere anotar la conversación al lado del número.
2. **Productores / fincas** — la ficha técnica vive en la plataforma; la relación humana, en Notion.
3. **Lotes galardonados** — el pasaporte es de la plataforma; la historia que se cuenta, de Notion.

### ⚠️ Un conflicto que ya existe

**«Grados de Calidad CTC»** está definido en los dos sitios. Notion fija los
umbrales SCA (BLACK 80+, RED 84+, BLUE 86+, GOLD 88+, TYRIAN 91+); la plataforma
los asigna en la Jornada de Arena y los escribe en `lots.grade`.

Hoy coinciden. En cuanto uno se mueva y el otro no, habrá dos verdades y ninguna
forma de saber cuál rige. **Decisión pendiente del owner**: el canónico debería
ser la plataforma (es quien los otorga) y Notion debería mostrar el espejo. Lo
mismo aplica a la jerarquía de Papagayo Beans y al pitch de CaaS, duplicados
entre Notion y `servicesCopy.tsx`.

---

## 2. La espina de integración (se construye una vez)

Tres piezas, y todo lo demás se cuelga de ahí.

### 2.1 Un solo lugar que emite

Tabla `integration_events` (service-role-only, como todo lo interno):

```
id · dominio (el enum compartido) · tipo ('cotizacion.emitida', 'lote.galardonado'…)
payload jsonb · estado (pendiente|enviado|fallido) · intentos · error
created_at · dispatched_at
```

Las Server Actions **no llaman webhooks**: insertan una fila. Un despachador la
envía. Razón: si Make está caído, un webhook disperso dentro de una action
revienta la operación del usuario; una fila pendiente se reintenta sola. Es el
mismo criterio por el que el correo del llamado de Terratalento nunca bloquea el
cambio de estado.

### 2.2 Una sola puerta de entrada

`/api/integraciones/[canal]/route.ts`, con secreto por canal — el patrón que ya
funciona en `/api/cron/market-anchors`: `Authorization: Bearer`, **503 si el
secreto no está configurado**, nunca una URL abierta que escriba en la base.

### 2.3 Make es el bus, no el cerebro

Make enruta, traduce y habla con APIs ajenas. **Ninguna regla de negocio vive
ahí.** Si una decisión importa, va en un trigger de Postgres o en una Server
Action, donde se puede probar y versionar. Un escenario de Make que decide algo
importante es un sistema invisible.

---

## 3. El registro en ECP · IT y Plataforma

Módulo nuevo `/ecp/automatizaciones`. Una fila por escenario:

| Campo | Para qué |
|---|---|
| Nombre y `scenarioId` de Make | enlazar con el real |
| **Propósito** (una frase) | por qué existe |
| Dominio | el enum compartido |
| Disparador | webhook · calendario · watch |
| Sistemas que toca | Notion · Gmail · Drive · IG · WhatsApp · plataforma |
| **Criticidad** | si se cae, ¿se entera alguien? ¿pasa algo? |
| Ciclo de vida | propuesta → piloto → activa → deprecada |
| Última corrida · errores · ops consumidas | se refresca del API de Make |

Las tres últimas columnas se leen del API (`scenarios_list`, `executions_list`),
no se teclean. Esto es lo que evita el destino habitual de las automatizaciones:
veinte escenarios que nadie recuerda para qué son y que nadie se atreve a apagar.

---

## 4. Fases

Cada una entrega algo que funciona por sí solo.

### F0 · Decidir y registrar (sin automatizar nada)
- Fijar el enum de dominios compartido.
- Resolver el conflicto de Grados de Calidad y los duplicados de doctrina.
- Construir `/ecp/automatizaciones` vacío pero funcional.
- Renombrar el equipo de Make (sigue siendo «My Team»).

### F1 · La espina
`integration_events` + despachador + `/api/integraciones/[canal]` + secretos.
**Prueba de vida**: un escenario que va y vuelve — la plataforma emite un evento
de prueba, Make lo recibe y llama de vuelta a nuestra ruta, que escribe una fila.
Nada de valor de negocio: sirve para probar el cableado y los secretos.

### F2 · El espejo de Notion (un solo dominio)
Empezar por **cotizaciones**. Una base en Notion con `ctc_id`; la plataforma
empuja al emitir. El comercial anota al lado. Un solo campo vuelve.
Si esto se sostiene un mes, se replica a productores y lotes.

### F3 · Google
- **Calendar**: jornadas de Arena y Jornadas de Recolecta como eventos.
- **Gmail**: clasificar entrante con la taxonomía que ya existe, y depositar en
  el Buzón del ECP lo que toque. Ojo: el Buzón ya se llena por IMAP — hay que
  decidir si Make sustituye ese camino o convive con él, no ambos a ciegas.

### F4 · Redes (Coffeed)
Publicar en IG/YT lo que el ECP da por bueno. El muro ya modela `embed` como
tipo de entrega: el enlace vuelve y se guarda. Aquí Make gana de verdad — el
OAuth y los rate limits de Meta son su problema, no nuestro.

### F5 · WhatsApp
**Advertencia de esfuerzo**: WhatsApp Business API exige verificación de Meta
Business y aprobación de plantillas. Son semanas de trámite, no una tarde. No
planificar nada que dependa de esto hasta tener la cuenta aprobada.

---

## 5. Riesgos que conviene tener escritos

- **Límite de Notion**: ~3 peticiones/segundo y sin transacciones. Sirve para
  espejar; no sirve para nada síncrono ni crítico. Un fallo de Notion **jamás**
  puede bloquear una escritura de la plataforma.
- **Presupuesto de operaciones**: 750.000/mes es mucho, pero una sincronización
  bidireccional charlatana lo quema igual. El registro con «ops consumidas» es
  también el control de gasto.
- **Subprocesadores y GDPR**: Make está en la UE (eu2), lo cual ayuda. Notion y
  Google son estadounidenses. La política de privacidad —que sigue sin
  escribirse, ver el TODO de GDPR— tendrá que declarar a **Resend, Notion,
  Google y Make**. Cuantos más sistemas toquen datos de productores y
  compradores, más urgente es ese documento.
- **Bidireccionalidad**: si en algún momento se acepta que un campo se escriba
  en los dos lados, hay que nombrar un ganador por adelantado y anotar el
  conflicto. «Se sincroniza solo» sin esa regla es cómo se pierden datos.

---

## 6. Lo primero que yo haría

F0 completo y F1 hasta la prueba de vida. Son pequeños, no dependen de
aprobaciones de terceros, y dejan el terreno listo para que cada integración
posterior sea «un escenario más» y no «otro sistema».
