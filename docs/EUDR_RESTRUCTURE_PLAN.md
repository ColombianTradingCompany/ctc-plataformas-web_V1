# Plan · Reestructura EUDR + Certificados — Parcela / Credencial / Aporte / Claim

**2026-07-29 · aprobado en conversación con el owner.** Fuente: dos notas técnicas del
28-07-2026 (deep research del owner): *¿Finca o Lote?* y *Los cuatro arquetipos de lote*
(`Downloads/ctc-finca-vs-lote-simple-en-es.html`, `Downloads/ctc-arquetipos-de-lote-especialidad.html`).
Meta declarada: **un proceso simple, accionable para CTC y abordable para el productor,
que cumpla EUDR y reporte los certificados correctamente.** Fecha dura: la aplicación
del EUDR es el **30-12-2026** y no se ha movido.

---

## 1 · Las dos anclas (los documentos, en una frase cada uno)

1. **¿Finca o Lote?** — Un certificado es una **credencial de la finca** (emisor,
   alcance, número, *vigencia*). El lote solo porta **afirmaciones (claims) derivadas**:
   un claim vale si **cada gramo** del lote viene de una finca con certificado vigente
   **en la ventana de cosecha** (no hoy) y la custodia preserva identidad. Tres cosas sí
   son del lote: **premios**, documentos por embarque, y la **DDS EUDR** (que no es un
   certificado: no la emite nadie, no vence, y su artefacto es una referencia + código
   de verificación generados al presentar).
2. **Arquetipos** — El tipo de lote (Single Estate · Single Origin · Regional Blend ·
   Multiorigin) es un **hecho calculable sobre el conjunto de fincas**; nunca se
   pregunta. El átomo probatorio del Art. 9 es la **parcela** (área continua dentro de
   una propiedad): ≤4 ha basta un punto, >4 ha exige polígono, 6 decimales, WGS84, y
   **un polígono no puede cubrir varias parcelas**. Secuencia de valor: parcelas →
   derivación del arquetipo → cobertura fraccionaria → blends (diferido).

## 2 · Lo que ya tenemos a favor (no rehacer)

- **Visa / Sello (V17-V18) queda INTACTO.** La debida diligencia vive solo en la finca
  y el Sello del lote es herencia pura — es exactamente la dirección de los documentos.
  El cuestionario de riesgo en la finca (V18) es el insumo del Art. 10 y no se toca.
- **El lote ya se liga a N fincas**: `lots.finca_id` + `additional_estate_ids[]`
  (`resolveSourceFincas`). Falta el **peso por finca** y la **ventana de cosecha**.
- **`certRegistry.ts` (2026-07-20)** ya cataloga los registros públicos de verificación
  por esquema — se convierte en el catálogo del nuevo modelo.
- **Blank slate**: 13 fincas en `pending_review` con EUDR en blanco, 1 lote. Las
  migraciones son triviales y nadie repite trabajo.

## 3 · Los cuatro defectos que se corrigen

1. `origin_category` es un **radio que elige el productor** (PaneA2) → el arquetipo se
   digita, no se deriva. Deja desprotegida la prima de Single Estate.
2. Los certificados viven en el **lote** (`ficha_certificaciones[]`, panes A3/A4) como
   **casillas binarias sin número ni vigencia** → la casilla solo es honesta en Single
   Estate y "miente en silencio" desde Single Origin.
3. **No existe el nivel Parcela**: la finca tiene un punto/polígono único. Una finca con
   tres cafetales separados son **tres parcelas** en la DDS.
4. **No hay ventana de cosecha ni prueba temporal** (cosecha ⊆ vigencia), y **no hay
   snapshot** al presentar la DDS (Art. 12 exige 5 años de registro congelado).

## 4 · Decisiones tomadas (owner, 2026-07-29)

| Decisión | Resolución |
|---|---|
| Dónde viven los certificados en "Editar Finca" | **4.ª pestaña propia** "Certificaciones" — opcional; no tener certificados NO bloquea la Visa |
| Cadena de custodia | **Constante del proceso CTC** (`identity_preserved`): CTC acopia y trilla sin mezclar con café ajeno; documentada en código, no preguntada |
| Ventana de cosecha | **La declara el productor** en la Ficha, junto al origen del lote; BCP puede corregirla en la EVA |

## 5 · Modelo de datos objetivo

### Tablas nuevas

- **`finca_parcelas`** — `id, finca_id (FK CASCADE), nombre, area_ha,
  geom_point (lat/lng), geom_polygon (GeoJSON), requires_polygon GENERATED (area_ha > 4)`.
  RLS patrón `fincas` (el dueño edita las suyas); las columnas de evaluación CTC que
  surjan van con guard. **Migración**: sembrar la parcela 1 de cada finca desde su
  punto/polígono actual ("Mi finca es un solo cafetal" es el caso común y el default).
- **`finca_certificates`** — `id, finca_id, scheme (key del catálogo), cert_number,
  valid_from, valid_to, holder_note, support_asset_id, support_filename,
  verified_by_ctc (guard: solo CTC), verified_at, created_at`. Sin `valid_from/to` el
  certificado queda "declarado" y **no alimenta claims** (fail closed).
- **`lot_contributions`** — `lot_id, finca_id, weight_kg`. UNIQUE (lot_id, finca_id).
  **Migración**: una fila por `finca_id` + cada `additional_estate_ids`; `weight_kg`
  NULL = "sin pesar" (bloquea claims fraccionarios, no bloquea el Sello).

### Columnas nuevas en `lots`

- `harvest_from date, harvest_to date` — la ventana de cosecha (prueba temporal).
- `dds_reference text, dds_verification_code text, dds_filed_at timestamptz,
  dds_snapshot jsonb` — el snapshot congela: parcelas aportantes (geo incluida), claims
  derivados con cobertura, arquetipo, y el **nivel de riesgo país fechado** (hoy
  Colombia = estándar; si el benchmarking cambia, el lote archivado se explica solo).
  **Nunca se recalcula retroactivamente.**

### Legacy (lectura, sin migración destructiva — patrón V17)

`lots.ficha_certificaciones`, `lots.cert_verifications`, `origin_category`,
`additional_estate_ids` quedan como datos históricos; la UI nueva no los escribe.

### Catálogo y derivación

- **`certRegistry.ts` se extiende** por entrada: `level: "finca" | "org" | "lote" | "none"`
  y `validate: "number" | "upload" | "both"`. Según la nota: BPA (ICA) y DO/DOR/IGP se
  validan **por número contra registro** (los enlaces ya están); IWCA pasa a
  `level:"none"` (asociación, no certificado → narrativa); Premios & Rankings quedan
  `level:"lote"` (se quedan en la Ficha).
- **`src/lib/lotComposition.ts`** (pura, sin clientes — patrón `eudr.ts`/`reportData.ts`,
  testeable con `--experimental-strip-types`):
  - `deriveArchetype(contribs)` → conteos |F|,|M|,|D|,|R|,|C| según la regla del doc.
    Región cafetera vía constante TS mínima `MUNICIPIO_REGION` (el Eje Cafetero cruza
    departamentos); se completa cuando existan blends reales.
  - `deriveClaims(certs, contribs, harvestWindow)` → por esquema:
    `{ coveragePct, kgCubiertos, fincasBloqueantes: [{finca, motivo}], claim: boolean }`.
    `claim = true` **solo** con cobertura 100 %, vigencia sobre la ventana de cosecha, y
    custodia IP (constante CTC). Cobertura binaria en Single Estate (no se muestra "%").
- QA script `scripts/qa-claims-check.mjs` con los casos del doc: cert vencido a mitad
  de cosecha, finca bloqueante nombrada, lote 100 % declarable EUDR con **cero**
  certificados (combinación válida y común), Single Estate binario.

## 6 · UX — quedándonos en los paneles existentes

**Regla de oro:** el productor solo declara **hechos de su mundo** — dónde están sus
cafetales, qué papeles tiene y hasta cuándo, de qué fincas sale este café y cuándo se
recolectó. Todo lo demás (arquetipo, cobertura, claims, riesgo) se **muestra calculado,
de solo lectura**. Si alguien discute el arquetipo calculado, lo que está mal es el
conjunto de fincas — ese es el error útil.

### Editar Finca (`FincaModal`, productor) — 3 → 4 pestañas

- **Tab 2 · Ubicación y respaldo** — el mapa pasa a editar **parcelas**: lista
  "Cafetales de la finca" (default: 1, sembrada del punto actual; "+ Agregar cafetal").
  Parcela ≤4 ha = pin; >4 ha = el editor de polígono existente, por parcela. La banda
  explica en lenguaje del productor: *"¿Su café crece en varios cafetales separados?
  Márquelos por separado — la UE los cuenta uno a uno."* El documento de tenencia y su
  tipo (selector recién arreglado) no cambian.
- **Tab 3 · Cuestionario EUDR** — intacto.
- **Tab 4 · Certificaciones** (nueva; contenido que hoy vive en A3/A4 del lote) — por
  esquema: "La tengo" → nº de certificado + vigencia (desde/hasta) + PDF opcional.
  Microcopy clave: *"No tener certificados no le impide exportar — el EUDR no los
  exige."* BPA/DO/IGP piden solo el número.

### Ficha del lote ("Cuéntenos todo sobre este café")

- **A2** — muere el radio `origin_category`. En su lugar: **"¿De qué fincas sale este
  café?"** (selector de sus fincas + kg por finca; 1 finca preseleccionada = camino
  corto Single Estate) y **"¿Cuándo se recolectó?"** (dos fechas). Chip **calculado** de
  arquetipo, solo lectura, con ⓘ que explica la regla.
- **A3/A4** — dejan de ser formularios de certificados. Pasan a: **panel derivado de
  solo lectura** (*"Rainforest Alliance · 80 % del peso · bloquea Finca Buenavista —
  vence 01/2026"*; en Single Estate sin porcentajes: heredado o no) + lo que sí es del
  lote: **Premios & Rankings** y soportes por embarque. `stripUnprovenCerts` se retira:
  la prueba ahora vive en la finca con vigencia.
- **A5 · Visa y Sello** — igual que hoy (herencia de Visas sobre el conjunto de
  aportes); gana la lectura de la prueba temporal.

### BCP (contrapartes en paralelo)

- **`FincaEudrEditor`**: 5.ª sub-pestaña "Certificaciones" — ver lo declarado,
  contrastar contra el registro público (enlaces de `certRegistry`) y marcar
  `verified_by_ctc`. El panel de geolocalización muestra las **parcelas**; el KML/
  GeoJSON de `earthKml.ts` pasa a listar parcela por parcela.
- **`approveFinca()` (la Visa)**: la compuerta de geolocalización pasa de "punto/
  polígono de la finca" a "**todas las parcelas localizadas** (y polígono donde >4 ha)".
  Lo demás de la Visa no cambia.
- **EVA checklist**: el bloque "Certificados A3/A4" se convierte en "**Claims
  derivados**" (solo verificación, nada que digitar). El bloque EUDR sigue siendo el
  Sello heredado.
- **Nueva acción de lote "Registrar DDS"** (post-embarque): CTC pega la referencia y el
  código de verificación del Information System y el sistema congela `dds_snapshot`.
  Nota: la DDS es por **consignación** y puede cubrir varios embarques; a la escala
  actual lote ≈ consignación — si algún día se agrupan, se agrupa el registro, no el
  modelo.

### Impresos

- **Visa de la Finca (dossier)**: + tabla de certificados con número y vigencia,
  + anexo de parcelas (geometrías).
- **Sello del Lote**: claims **solo al 100 %**; una cobertura parcial se imprime como
  cobertura (dato), nunca como sello (afirmación). Incluye referencia DDS cuando existe.

## 7 · Qué NO se hace ahora (secuencia del doc de arquetipos)

- Tabla completa municipio→región cafetera (constante TS mínima ahora; completa cuando
  haya blends reales).
- Recetas estructuradas de blend, pools con "declaración en exceso", split de lotes por
  cobertura — **diferido** hasta que los arquetipos 3-4 tengan volumen.
- Integración API con el Information System de la UE — no ahora; cuando se haga, contra
  la **especificación nueva** (Reglamento de Ejecución (UE) 2026/1565), no la anterior.
- Café soluble (entra al Anexo I el 30-12-2027) — no aplica al negocio actual.

## 8 · Fases

Cada fase termina con: `tsc` + `eslint` limpios, verificación e2e con cuenta QA de
productor (patrón `create-qa-producer.mjs` → navegar → SQL → `delete-qa-user.mjs`),
entrada en `Log_Documentacion_Interactiva_V19.txt`, y commit propio.

- **F1 · La finca como titular** — migración `finca_parcelas` + `finca_certificates`
  (+ siembra parcela 1 y RLS/guards), catálogo extendido, FincaModal tabs 2 y 4,
  `FincaEudrEditor` (parcelas + certificados), `fincaEudrStatus`/`approveFinca` por
  parcelas, dossier de Visa.
- **F2 · El lote como composición** — migración `lot_contributions` + ventana de
  cosecha, `lotComposition.ts` + QA script, Ficha A2 (origen + fechas + chip) y A3/A4
  (panel derivado + premios), EVA "Claims derivados", Sello imprimible.
- **F3 · DDS y snapshot** — columnas `dds_*`, acción BCP "Registrar DDS", congelado del
  snapshot, referencia en el Sello.
- **F4 (diferida)** — blends: región cafetera completa, recetas ponderadas con país y
  riesgo fechado, split de lotes.

## 9 · Riesgos conocidos

- **El polígono por parcela reusa el editor actual** — verificar que el editor de mapa
  soporte N geometrías en la misma vista sin reescribirlo (si no, editar una parcela a
  la vez con la lista al lado).
- **`resolveSourceFincas` tiene consumidores** (PaneA5, FichaView, certificacion-lote,
  BCP) — F2 los migra todos a `lot_contributions` en el mismo cambio para no tener dos
  fuentes de verdad ni un solo día.
- **La prueba temporal necesita fechas de certificado** — los certificados "declarados"
  sin vigencia no alimentan claims; el panel derivado lo dice explícitamente para que
  el productor entienda por qué su sello no aparece.
