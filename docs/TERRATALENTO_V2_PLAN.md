# Plan · Terratalento V2 — tableros, Google login e información contractual

**2026-08-02 · pedido del owner**, sobre el V1 construido el mismo día (V2.35–V2.36).
El módulo funciona de punta a punta pero es **crudo en los tres frentes**; este plan
dice exactamente qué le falta a cada uno, qué se reutiliza y qué decisiones necesito
antes de construir.

---

## 1 · De dónde partimos (el diagnóstico honesto del V1)

| Frente | Qué hay hoy | Por qué se siente crudo |
|---|---|---|
| **Superficie** (recolector) | Landing + acceso email/contraseña + panel con perfil y lista de jornadas | **Sin Google** (el resto de la red sí lo tiene); las jornadas son una lista plana; el recolector no ve su propio proceso ni a qué se está comprometiendo |
| **KR** (la finca) | Módulo del hub: publicar por finca + lista con conteos | Lista plana sin estado visual; el formulario reduce TODO el trato a **dos campos de texto libre** (`pago`, `condiciones`) |
| **ECP** (el match) | Popup por jornada con roster y botones de estado | Es una **lista**, no un tablero: no se ve el embudo, no hay filtros de emparejamiento, y no queda constancia de lo acordado |

La raíz común de lo contractual: en la base, todo el trato son dos `text` sueltos
(`terratalento_jornadas.pago` y `.condiciones`). Nada está estructurado, nada se
congela, y nadie acepta nada.

---

## 2 · Las tres mejoras, traducidas

### 2.1 · Kanban — un tablero por frente, cada uno con SU embudo
No es el mismo tablero tres veces: cada actor mira un proceso distinto.

- **ECP · dos niveles.** Arriba, tablero de **jornadas** por estado (Abierta ·
  En gestión · Cerrada/Cancelada) con medidor de llenado (confirmados/cupos).
  Dentro de cada jornada, las **postulaciones** como kanban
  (Postulado → Llamado → Confirmado → Descartado) — que es literalmente el
  trabajo de emparejar. Más **filtros de match**: municipio, años de
  experiencia, disponibilidad.
- **KR · tablero de mis jornadas** por estado, con el medidor de cupos en la
  tarjeta. La finca ve de un vistazo qué está abierto y qué tan lleno va.
- **Superficie · "Mis postulaciones"** por estado — el recolector que se postuló
  a cuatro jornadas necesita ver su propio embudo, no una lista mezclada con
  las jornadas abiertas.

**Costo real, medido:** el kit de kanban ya existe en
`src/app/bcp/(app)/shared.module.css` (`.board`, `.column`, `.columnHead`,
`.columnCount`, `.columnList`, `.miniCard`, `.leadCardBtn`) — el **ECP es casi
gratis**. **KR y la superficie NO tienen board CSS** (KR trabaja con
`acard`/`alist`), así que ahí hay que escribir una hoja pequeña propia; es el
único trabajo de estilo nuevo del paquete.

### 2.2 · Google login — barato, con una trampa conocida
El callback del Directorio (`src/app/directorio/auth/callback/route.ts`) son
**20 líneas**: `exchangeCodeForSession(code)` y redirect. Se clona tal cual a
`src/app/terratalento/auth/callback/route.ts` y se añade el botón «Continuar con
Google» al acceso.

**El detalle que hay que hacer bien** (y que ya nos costó una vez en las
superficies Clase B): el `redirectTo` debe apuntar a
`${window.location.origin}/terratalento/auth/callback` — con el prefijo de ruta,
igual que el Directorio. Funciona en los dos mundos porque `proxy.ts` **no
reescribe** cuando la ruta ya empieza por la base (`!pathname.startsWith(base)`),
así que en el subdominio sirve la ruta directa y en dev también.

**Acción del owner, imprescindible:** añadir la URL a **Supabase → Authentication
→ URL Configuration → Redirect URLs**. Sin eso Google devuelve un error y el
botón parece roto aunque el código esté bien.

### 2.3 · Información contractual — de dos textos a un acuerdo con memoria
Tres capas, de menos a más comprometida:

**(a) Términos estructurados de la jornada.** El formulario de KR pasa de
`pago` + `condiciones` a campos reales:

- **Pago**: modalidad (`por_kilo` · `jornal` · `mixto`), valor, y unidad.
- **Forma y frecuencia de pago**: efectivo/Nequi/transferencia · diario/semanal/al final.
  *(En la práctica esto es lo que más pregunta un recolector, y hoy no existe.)*
- **Alojamiento** (sí/no + detalle), **alimentación** (sí/no + cuántas comidas),
  **transporte** (sí/no + desde dónde).
- **Horario** y **duración estimada**.
- **Requisitos**: herramienta propia, experiencia mínima, documentos.

`pago`/`condiciones` se conservan como notas libres — no se borra nada.

**(b) Aceptación del recolector.** Al postularse ve los términos y marca que los
entiende; se sella `terminos_aceptados_at` en su postulación. Sin marcar, no hay
postulación.

**(c) La constancia, con los términos CONGELADOS.** Al confirmar el cupo, la
postulación guarda `terminos_snapshot` (jsonb) — una foto de lo acordado *ese
día*. Si la finca luego edita la jornada, **lo acordado no se reescribe**. Es el
patrón que el repo ya usa dos veces: `arena_inscriptions.amount_cop` congela el
precio de lista, y el DDS congela el expediente Art. 12.

Con el snapshot, emitir una **constancia imprimible** (finca, recolector, fechas,
términos, fecha de acuerdo) es un módulo puro de HTML, calcado de
`src/components/kaffetal-regal/ficha/shipmentInstructionsPrint.ts`.

⚠️ **Se llama constancia de acuerdo, NO contrato laboral** — ver §5.2.

---

## 3 · El esquema (una sola migración)

```
terratalento_jornadas
  + pago_modalidad text CHECK (por_kilo|jornal|mixto)
  + pago_valor numeric,  + pago_unidad text
  + pago_forma text,     + pago_frecuencia text
  + alojamiento bool + alojamiento_detalle text
  + alimentacion bool + alimentacion_detalle text
  + transporte bool  + transporte_detalle text
  + horario text, + duracion_estimada_dias smallint
  + requisitos text

terratalento_postulaciones
  + terminos_aceptados_at timestamptz
  + terminos_snapshot jsonb        -- congelado al confirmar
  + acuerdo_emitido_at timestamptz

terratalento_recolectores
  + contacto_emergencia_nombre / _celular text
  + eps text                       -- ⚠ dato sensible, ver §5.3
  + medio_pago text                -- Nequi / cuenta / efectivo
```

Las tres siguen siendo **service-role-only**; no cambia el modelo de acceso.

---

## 4 · Frente por frente

### 4.1 · Superficie del recolector
1. Botón **Continuar con Google** + ruta callback (clon del Directorio).
2. **Mis postulaciones** como kanban por estado, separado de las jornadas abiertas.
3. Cada jornada abierta muestra los **términos estructurados** (pago, alojamiento,
   alimentación, transporte, horario, requisitos) en vez de un párrafo suelto.
4. **Aceptar términos** al postularse (checkbox + sello).
5. Al confirmarse: banda con **mi constancia** (ver e imprimir).
6. Perfil: contacto de emergencia y medio de pago (§5.3 decide si EPS entra).

### 4.2 · KR (la finca)
1. Formulario de publicación con los **campos contractuales** agrupados
   (Pago · Qué incluye · Horario y requisitos), en vez de dos textos.
2. **Tablero** de mis jornadas por estado, con medidor de cupos.
3. **Roster de confirmados** en la tarjeta — *sujeto a §5.1*.
4. Reimprimir la constancia de cada confirmado.

### 4.3 · ECP (el match)
1. **Tablero de jornadas** por estado + KPIs (ya existen).
2. Dentro de cada jornada, **kanban de postulaciones** con las acciones actuales.
3. **Filtros de emparejamiento**: municipio, experiencia, solo disponibles.
4. **Constancia**: emitir/reemitir, con `acuerdo_emitido_at` visible.
5. El correo del llamado (V2.36) pasa a **incluir los términos** desde el snapshot.

---

## 5 · Decisiones del owner (bloquean partes del plan)

### 5.1 · ¿La finca ve QUIÉN va a llegar? — **RESUELTO (owner, 2026-08-02)**
**Sí, solo los confirmados.** La finca ve **nombre y celular únicamente de quienes
CTC ya confirmó**; postulados y descartados siguen invisibles. La regla original
("el productor ve solo conteos") se afina, no se abandona: lo que protegía era el
**control de la selección**, y eso sigue siendo de CTC — lo que se abre es lo
mínimo para que la jornada sea operable sin trabajo manual en cada evento.

Implicación de implementación: `misJornadasRecolecta()` gana un roster de
confirmados (nombre + celular, nada más — ni cédula, ni notas, ni experiencia), y
la tarjeta del módulo KR lo muestra solo cuando `estado='confirmado'`.

### 5.2 · ¿Constancia o contrato? — **RESUELTO (owner, 2026-08-02)**
**Constancia de acuerdo.** Un imprimible que deja por escrito lo pactado (finca,
recolector, fechas, pago, qué incluye, fecha del acuerdo) y **dice explícitamente
que CTC conecta a las partes** — no afirma relación laboral ni la sustituye.

Regla dura para quien lo construya: el documento **no puede** contener cláusulas
que obliguen (prestaciones, ARL, terminación, exclusividad) ni llamarse
"contrato" en ninguna parte. Si más adelante CTC quiere una figura laboral real,
esa redacción la aporta un abogado y aquí solo se monta.

### 5.3 · ¿Cuánto dato sensible pedimos? — **por defecto, sin consultar**
EPS/afiliación a salud y contacto de emergencia son útiles para una jornada real,
pero **EPS es dato sensible** bajo la Ley 1581. Además sigue pendiente el punto ya
anotado en el proyecto: **la plataforma todavía no tiene política de privacidad**.
Mi recomendación: **contacto de emergencia y medio de pago sí; EPS solo cuando
exista la política** y con aviso explícito (el Directorio ya tiene el precedente
del aviso Ley 1581).

### 5.4 · ¿Pago con valor numérico o texto? — **por defecto, sin consultar**
Estructurar `pago_valor` como número permite ordenar y comparar jornadas — bueno
para el recolector. Si prefiere no publicar cifras exactas en la superficie
pública, se guarda estructurado y se muestra en rango. **Por defecto: numérico y
visible.**

---

## 6 · Orden de trabajo propuesto

1. **Google login** — independiente, media hora, gana confianza de inmediato.
   *(Requiere su acción en Supabase.)*
2. **Migración + términos estructurados** — desbloquea todo lo contractual.
   Incluye el formulario nuevo de KR y la vista de términos en la superficie.
3. **Los tres tableros** — ECP primero (kit gratis), luego KR y la superficie
   (hoja de estilos nueva).
4. **Aceptación + snapshot + constancia** — la capa con memoria, y el correo del
   llamado enriquecido con los términos.

Peaje de siempre: `tsc`/`eslint` limpios, `APP_VERSION` en el mismo commit,
entrada en la bitácora de arquitectura, y verificación en vivo con cuentas QA
desechables (borradas después) — el ECP se verifica por SQL, que la 2FA no se
puede automatizar.
