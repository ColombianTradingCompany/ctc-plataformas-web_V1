# Registro de versiones · CTC Web Platform

El informe **estándar** de qué trajo cada versión de la plataforma — la vista de consulta rápida,
paralela a la narrativa de `docs/architecture/Log_Documentacion_Interactiva_V*.txt` (que existe para
compilar el mapa interactivo, no para buscar «¿qué trajo la V4.42?»).

**El contrato** (2026-08-19, y lo vigila `scripts/qa-changelog-check.mjs`):

- **Una entrada por `APP_VERSION`**, escrita **en el mismo commit que sube la versión** — la misma
  disciplina que ya rige el bump de `src/lib/version.ts`. El guardián falla si la versión de la
  insignia no tiene entrada aquí.
- Formato de cabecera: `## [VN.N] — AAAA-MM-DD (commit sha)`. El sha se sella en cuanto existe
  (`pendiente` solo puede decirlo la entrada de arriba).
- Cada viñeta empieza por su categoría: **Hito** · **Añadido** · **Cambiado** · **Corregido** ·
  **Retirado** · **Seguridad** · **Datos** · **Docs**.
- Al cerrar un Version Wrap, el ciclo queda estampado con el snapshot del mapa que lo compiló.
- La historia anterior a la V4.27 no se reconstruyó: vive en los logs sellados de
  `docs/architecture/` y en el historial de git. Este archivo empieza donde empieza el ciclo V5.

---

## [V5.90] — 2026-09-25 (commit pendiente)

- **Cambiado**: **«CTCx Selection · Compras» pasa a llamarse «Adquisición de Stock Café (Selection/Sample Kits)»** (owner, 2026-09-25;
  misma ruta `/ocp/compras`): CTCx adquiere con la misma herramienta el stock de la oferta y el de los kits para compradores. Cada compra
  en firme dice **a qué stock va** (`compras.destino`: CTCx Selection · Sample Kits; se elige al registrar y se cambia por fila mientras no
  tenga kilos en kits). «Oferta desde CTCx Selection» solo cuenta lo destinado a Selection.
- **Añadido**: **«Stock de Sample Kits»** (`/ocp/sample-kits`, en OCP · Catálogo): el café adquirido que NO va a la oferta, gestionado en
  kits — **Sample Kit (CP)** 8 lotes × 250 g de verde (solo donde hay un Master Roaster o partner CaaS; ≈ 65 € · US$65), **Plus** 5 lotes
  × 2 kg de verde (FOB US$120–170), **Max** 4 lotes × 6 kg de CPS (FOB US$280–400). Un kit se arma lote a lote con compras destinadas a
  Sample Kits (lo disponible se DERIVA: comprado − asignado a kits no anulados), sale **enviado** completo con su guía (si nació de un pedido
  de la tienda, el pedido pasa a enviado) o se **anula** con motivo; nada se borra. La conversión CPS → verde es la de la nota del owner
  (125 kg de CPS ≈ 90 kg de verde). Regla pura en `src/lib/compras/sampleKits.ts`.
- **Datos**: migración `adquisicion_stock_sample_kits` (acta en `docs/migraciones/`): `compras.destino`, `sample_kits` (SK-AAAA-NNN),
  `sample_kit_items`, guards `guard_sample_kit_item` (componentes solo con el kit armado) y `guard_sample_kit_stock` (lo asignado nunca
  supera lo comprado). RLS, cero políticas.
- **Docs**: `qa-compras-check` 73 → 95 (§11: los números de los kits se leen de la fila 8 del §5 del plan). El one-pager de la fórmula CVA
  para el Q-Grader queda en `docs/CVA_one-pager_para_el_Q-Grader.pdf`.

## [V5.89] — 2026-09-25 (commit 2d0c8e2)

- **Añadido**: **las bodegas de muestras** (owner, 2026-09-25; decisión 1 del brief → opción C): `bodegas_muestras` con responsable,
  dirección, capacidad en muestras de 1 kg y estado, y las cuatro sedes de arranque (Planta de Empaque Santillana 400 · Oficina CCB
  100 · CIR Bucaramanga y Manuel Specialty Roasters pendientes). La ocupación se deriva de las muestras con saldo. Pestaña «Bodegas»
  en `/ocp/muestras`; la bodega se elige al recibir la muestra y al ubicarla.
- **Cambiado**: **la partición real de los 2 kg**, tal como la dibujó el owner: 2 × 250 g «Evaluación Inicial Q-Grader», 2 × 250 g
  «Contramuestras de Reserva CPS» y 1 kg «Muestra de Evaluación CTCx» que se **trilla** por completo (~750 g de verde: 400 g de
  tostado para ensayos piloto + 250 g de verde al vacío). `trillarMuestraCtcx` anota la salida del kilo y crea las dos muestras
  derivadas; los kilos 500/500/1000 del folio 7 no cambian. Los 2 kg son de uso exclusivo de CTCx: las muestras para compradores
  (Sample Kits) salen de Adquisición de Stock.
- **Datos**: migración `bodegas_muestras` (acta en `docs/migraciones/`): la tabla y sus cuatro filas, `muestras.bodega_id`,
  `muestras.origen_muestra_id`, tipos `verde_vacio` · `tostado_ensayo`, motivo `trilla_verde`. Las cinco cuentas `prueba-*` se
  eliminaron a pedido del owner (las pruebas se harán con Asistencia a Proveedores y Proveedor Desacoplado).
- **Docs**: `qa-muestras-check` 67 → 85 (las bodegas, las cuatro sedes, el kilo CTCx contra los números del diagrama).

## [V5.88] — 2026-09-25 (commit fff34d8)

- **Añadido**: **la revisión de almacenaje a los 90 días** (2.ª tanda de Gestión de Muestras; owner, 2026-09-16: «a más de 90 días
  de la catación no se recata, se hace revisión de almacenaje con 1 kg»). Se DERIVA de la fecha de la evaluación que rige el grado y
  de la última revisión anotada — sin campo aparte (`src/lib/muestras/almacenaje.ts`, puro; el kilo es la porción de testeo del
  folio 7) — y sale como tarea `muestra` del Tablero de Ejecución y como pestaña de `/ocp/muestras`; anotarla es una salida más
  de la muestra de testeo con su resultado. Un lote cuyo último contrato ya cerró no se revisa.
- **Añadido**: **las muestras para comprador**: los pedidos de pack (`sample_pack_orders`) se arman con salidas «a un comprador»
  ligadas al pedido (`agregarMuestraAlPedido`, borrador) y se marcan **enviados** con guía (`marcarPedidoEnviado`, emite); el
  pedido pasa por pedido → en preparación → enviado. Qué lotes y cuántos gramos van los decide CTC (decisiones 4 y 5 del brief:
  del owner).
- **Datos**: migración `muestras_pedidos_envio` (acta en `docs/migraciones/`): `sample_pack_status` + `preparado` · `enviado`;
  `sample_pack_orders.preparado_at/enviado_at/enviado_por/guia/notas_ctc`; `muestra_movimientos.pedido_id`. Ninguna columna para
  la alerta de los 90 días.
- **Docs**: `qa-muestras-check` 41 → 67 (la regla de los 90 días leída de `ALINEACION` §3; la tarea derivada; los pedidos).
  La columna «laboratorio» del brief no vuelve: el Centro de Calidad la sustituyó (fase 4).

## [V5.87] — 2026-09-25 (commit 8a5e25a)

- **Añadido**: **las mezclas de CTCx Selection** (2.ª tanda del brief de Compras): `/ocp/compras/mezclas` arma una mezcla como
  borrador, componente a componente, con compras en firme del mismo grado, y la **cierra** cuando cumple la regla del owner —
  **Black** blend de 3 a 4 orígenes y/o variedades, **Red** una sola variedad y 3 a 4 orígenes, **una carga (125 kg de CPS) por
  productor**, ni de dos ni de cinco—. La regla se LEE de `src/lib/pvc/lectura.ts` (`src/lib/compras/mezclas.ts`, puro) y la base la
  repite al cerrar (`guard_mezcla_cerrada`); los componentes se congelan fuera del borrador; una mezcla no se borra, se anula con motivo.
- **Añadido**: **lo disponible descuenta lo asignado a mezclas** (comprado − en mezclas − vendido, derivado) en «Oferta desde CTCx
  Selection» y en Compras; la **ubicación física** de cada compra (`compras.ubicacion`, texto libre hasta que el owner fije los sitios).
- **Cambiado**: Compras enseña «En mezcla» y «Ubicación» por compra y habla en kg de CPS (la conversión a verde es del Modelo de
  Producción: aquí no se inventa un factor).
- **Datos**: migración `mezclas_ctcx_selection` (acta en `docs/migraciones/`): `mezclas` (código `MZ-AAAA-NNN`), `mezcla_componentes`,
  `compras.ubicacion`, guards `guard_mezcla_cerrada` y `guard_mezcla_componente`; RLS y cero políticas.
- **Docs**: `qa-compras-check` 51 → 73 (§10: la regla desde `lectura.ts` y el PVC plan, la base con las mismas cifras, lo asignado
  descuenta, nada se borra). Queda con el owner la decisión 4 del brief (¿una mezcla es un lote nuevo con código público y ficha?).

## [V5.86] — 2026-09-25 (commit c1ba77e)

- **Añadido**: **los recordatorios de mora** (fila «Recordatorios» del §4 del `PLAN_CIRCUITO_DEL_LOTE.md`; decisión 6: visible,
  nunca automática). El cron semanal `/api/cron/recordatorios` corre ahora dos barridos, y solo dos: las certificaciones con
  evidencia pedida (V5.78) y el **pedido del mes sin envío mientras esté en mora** — el primero al entrar en recargo, luego cada
  semana, como mucho 4 por mes (el mismo tope de las certificaciones). Cada recordatorio deja rastro en `audit_log`
  (`mora_recordatorio_enviado`), una nota en el feed del productor y un correo por el remitente único. **Nada cambia de estado**:
  la ruptura sigue siendo del owner. Regla pura en `src/lib/trato/mora.ts`; el OCP enseña cuántos recordatorios van por mes.
- **Datos**: migración `mora_recordatorios` (acta en `docs/migraciones/`): `contract_months.recordatorios_mora`,
  `ultimo_recordatorio_mora_at`.
- **Docs**: `qa-trato-check` 90 → 106 (§7: la regla desde el §4 y el §7 del plan; el barrido no toca estados).

## [V5.85] — 2026-09-24 (commit 85e5014)

- **Hito**: **la fase 8 del `PLAN_CIRCUITO_DEL_LOTE.md` — CTCx Selection y Compras** (folio 8, paso 19; decisión 7; respuesta 7
  del 23-sep). Con ella **la Etapa 1 queda ejecutada en código** (fases 0–8, V5.76–V5.85); las fases 6–8 no se condujeron en
  navegador (exigen las cuentas `prueba-*`). Código de `cherry-picked` y `kaffetal-regal` tocado con el «continúa» del owner
  (`ALINEACION` §3).
- **Añadido**: **`compras`** — el registro de cada compra en firme de CTCx (lote, grado, kg, COP/kg con su edición del PVC, pagada,
  recibida, origen). Nace sola al **pagar el mes** de un contrato de compra en firme (oferta `directa` · `black`;
  `registrarPagoDelMes`) o a mano en `/ocp/compras` (`registrarCompraManual`, con nota). Lo disponible no se guarda: se deriva
  (`src/lib/compras/reglas.ts`).
- **Añadido**: **«Oferta desde CTCx Selection» = la disponibilidad de lo comprado** (decisión 7): por lote, lo comprado, lo pagado,
  su listado en Cherry Picked, lo disponible y «Pasar al Catálogo Activo»; `publishLot` admite un contrato cumplido.
- **Añadido**: **el perfil único de CTCx Selection** (nombre, lema, descripción e imagen; `platform_settings.ctcx_selection_perfil`,
  vista pública `public_ctcx_selection_perfil`) y la **imagen por lote** (`ctcx_selection_lotes`, bucket público `ctcx-selection`,
  subida firmada desde el navegador). La cinta, la tienda, el portal y la ficha enseñan el perfil en vez de la finca; la cinta y
  el portal pintan la imagen.
- **Cambiado**: `public_lot_catalog.ctc_selection` sale de `compras` (cualquier grado menos Tyrian) y la vista gana
  `ctcx_imagen_path`; un **Black** recibe oferta de temporada/directa/excepción como los demás grados; el circuito gana el lateral
  **«CTCx Selection»** (OCP y KR con la misma regla, `esCompraEnFirme`).
- **Retirado**: el CRM de `black_negotiations` (kanban Black Stock · Selección, `decideBlackNegotiation`, `ctcSelectionActions`, la
  negociación que nacía en el veredicto): tabla dormida, sin lector ni escritor; la pestaña «Selección» dejó su talón 308.
- **Datos**: migración `compras_ctcx_selection` (acta en `docs/migraciones/`): `compras`, `ctcx_selection_lotes`, bucket
  `ctcx-selection` (lectura anónima), `public_lot_catalog` v2, `public_ctcx_selection_perfil`, semilla del perfil.
- **Docs**: `qa-compras-check` (51, nuevo — desde el brief, el paso 19 y la decisión 7); `qa-circuito` 56 → 60; `qa-ofertas` y
  `qa-sneak-peek` al rótulo nuevo; `qa-rutas-consolas` 512 (56 rutas mudadas).

## [V5.84] — 2026-09-24 (commit 6be424e)

- **Hito**: **la fase 7 del `PLAN_CIRCUITO_DEL_LOTE.md` — el trato mes a mes** (folio 8, pasos 16–18; decisión 6 del owner:
  «nunca automática; se hace visible de manera automática»). Código de `kaffetal-regal` tocado desde la sesión `consolas` con el
  «continúa» del owner y línea en `ALINEACION` §3. **No se condujo en navegador**: exige las cuentas `prueba-*`.
- **Añadido**: **`contract_months`** — el trato vive mes a mes: CTCx **pide** la cantidad del mes (`pedirDelMes`), registra el
  **envío** (`registrarEnvioDelMes`, que se espeja en `contract_releases` al 100 % para que el stock del catálogo siga leyendo lo
  mismo) y el **pago** (`registrarPagoDelMes`, solo sobre lo enviado); con los meses enviados y pagados el trato queda `completed`
  solo. `/ocp/contratos` gana «Renovados» y «Ruptura».
- **Añadido**: **lo derivado se deriva** (`src/lib/trato/mesAMes.ts`, puro): la mora de cada mes (2 semanas sin cargo · 2 con
  5 % · después **ruptura potencial**), el mes en curso, el tramo libre de retiro, el past crop y si toca renovar. El OCP
  (`/ocp/contratos/[id]`, la tabla de `/ocp/kr`) y el productor («Mi trato», la barra del lote) la leen con la MISMA función;
  nada se persiste; el circuito gana las laterales **«en mora»** y **«ruptura»**.
- **Añadido**: **el retiro del productor** (`previsualizarRetiro` → `retirarDelTrato`, `src/lib/trato/producerActions.ts`): ve
  la cuenta antes de confirmar — lo que cabe en el tramo libre acumulado sale sin costo, el resto paga el 4 % del precio de cada
  carga (`retiro()` reproduce el §12.9: $1.040.000 · $780.000 · $520.000).
- **Añadido**: **la ruptura contractual la declara el owner** (`declararRuptura`, con motivo): `status: ruptura` y la cuenta del
  productor **congelada** (`producer_profiles.estado_cuenta`, Identidad — decisión 6); `descongelarCuenta` también es del owner.
  Una cuenta congelada no acepta ofertas, no retira y no recibe ofertas nuevas.
- **Añadido**: **la renovación** (`ofrecerRenovacion`): a los 90 días de la firma, sobre un trato cumplido, emite la oferta nueva
  al PVC vigente (`renewal_of_contract_id`; el contrato viejo queda `renovado`); **past crop** también desde `lots.harvest_to` +
  9 meses (−10 %).
- **Retirado**: la escalera `RELEASE_STAIRCASE` 50/75/100 y `recordContractRelease`; `signContract` ya no siembra liberaciones.
- **Datos**: migración `trato_mes_a_mes` (acta en `docs/migraciones/`): `contract_months` (RLS select-own), `contract_status` +
  `ruptura` · `renovado`, `purchase_contracts.ruptura_at/ruptura_motivo/renovado_at/renewal_offer_id`,
  `lot_offers.renewal_of_contract_id`, `producer_profiles.estado_cuenta/_at/_motivo` con guard trigger (un JWT no la cambia).
- **Docs**: `qa-trato-check` 54 → 90 (§6: mora, retiro, renovación, past crop, decisión 6 — desde el plan);
  `qa-circuito` 45 → 56 (`en_mora`/`ruptura`, TOTAL sobre `enMora`, los dos lectores de la mora derivada).

## [V5.83] — 2026-09-24 (commit ef64fcb)

- **Hito**: **la fase 6 del `PLAN_CIRCUITO_DEL_LOTE.md` — aceptar con claridad** (folio 8, pasos 14–16). Código de
  `kaffetal-regal` tocado desde la sesión `consolas` con el «continúa» del owner y línea en `ALINEACION` §3. **No se condujo en
  navegador**: exige las cuentas `prueba-*`.
- **Añadido**: **la calculadora del trato** (`src/lib/trato/simulador.ts`, puro): con la cantidad que el productor piensa
  comprometer y el precio anclado dice qué compra CTC de inmediato (una carga), qué pediría y pagaría cada mes, qué puede
  retirar sin costo al cerrar cada mes (25 % · 25 %) y cuánto costaría retirar todo (4 % por carga sobre el tramo libre).
  Reproduce el ejemplo del §12.9 del PVC plan; `qa-trato-check` lo exige.
- **Cambiado**: **el productor acepta CON declaración**: en «Ofertas de Temporada» ve el anclaje (PVC, %, mínimo, máximo,
  compra inicial, vencimiento, términos), usa la calculadora, declara los kg (≥ mínimo del grado, ≤ máximo de una directa) por
  trimestre o por 30 días, marca las condiciones de retiro, mora y ruptura y acepta. `respondToOffer` lo exige para toda oferta
  con términos (temporada · directa · excepción); Black y subasta se aceptan como antes. Una directa vencida queda `expirada`.
- **Cambiado**: **el contrato nace LLENO**: precio de la oferta, cantidad declarada, referencia del PVC, términos, declaración,
  compra inicial y anclaje quedan en `purchase_contracts` al aceptar; **`signContract` solo firma** (y se niega si un contrato
  nació vacío). «Contratos de Temporada» es **«Mi trato»**: lo declarado, el precio, lo que CTC compra hoy, los tramos y los
  términos. El copy del Kaffetal Club salió de la pestaña.
- **Datos**: migración `aceptacion_con_declaracion` (acta en `docs/migraciones/`): `lot_offers.locked_kg/declaracion/
  terms_accepted_at`; `purchase_contracts.offer_id/terms_version/declaracion/compra_inicial_kg/pvc_edition_id/modificador_pct`.
- **Docs**: `qa-trato-check` 35 → 54 (la calculadora contra el §12.9; la declaración; el contrato lleno; la firma que no teclea).

## [V5.82] — 2026-09-24 (commit 2e35ddf)

- **Hito**: **la fase 5 del `PLAN_CIRCUITO_DEL_LOTE.md` — confirmar y ofertar** (folio 8 del owner, pasos 12–14 y 19; respuestas
  1–3). El PVC **gobierna por primera vez un precio real**: código de `herramientas-internas` (`src/lib/pvc/`) tocado desde la sesión
  `consolas` con línea en `ALINEACION` §3.
- **Añadido**: **`pvcParaGrado(grado, fecha?, {modificadorPct})`** — LA puerta al precio (`src/lib/pvc/servicio.ts` sobre
  `precio.ts`, puro): edición vigente en la fecha → banda del grado (minúscula → mayúscula por `definicion.ts`) → COP/kg y COP/carga
  × (1 ± %). Tyrian no tiene precio de oferta (se subasta). `RANGOS` del motor se **deriva de `definicion.ts`** (conflicto n.º 1
  cerrado); nadie lee el `rango` de una edición publicada.
- **Cambiado**: **la oferta se ancla, no se teclea** (`/ocp/ofertas`): CTCx decide «no ofertar» con motivo (paso 13) o emite un
  **Lote de Temporada** (PVC × banda, mínimo del grado, CTC compra una carga de inmediato, términos versionados; past crop −10 %),
  una **directa** de CTCx Selection (PVC − 8 %, ventana de 30 días, máximo) o una **excepción** con precio a mano y motivo
  obligatorio. La oferta guarda `pvc_edition_id`, `pvc_cop_kg`, `modificador_pct`, `terms_version`, `min_kg`, `max_kg`,
  `ventana_dias`, `expira_at`, `compra_inicial_kg` y, por fin, `reference_price_*`. Black conserva el precio negociado; Tyrian, el
  mejor postor.
- **Cambiado**: **el rechazo bajo Black es gratis** (reporte de mejoras, sin cashback) y nace la **re-evaluación** (`reevaluar`):
  CTCx la acuerda con su razón, la solicitud vuelve a empezar a tarifa plena sin subvención (factura y muestra nuevas), y si el lote
  **sube de grado** se le reembolsa el 80 % (`cashback_*` cambia de sentido). «Lotes en Evaluación» enseña «No superaron» y
  «Reembolsos pendientes».
- **Añadido**: `terminos.ts` completo — compra inicial (1 carga), tramos libres 25/25, penalidad 4 %, mora 2+2 semanas/5 %,
  renovación 90 días, past crop 9 meses/−10 %, directa −8 %/30 días, declaraciones — y **el circuito gana «no superó» y «sin
  oferta»** (laterales).
- **Datos**: migración `ofertas_ancladas` (acta en `docs/migraciones/`): `lot_offers.kind` con `directa` y `excepcion` + nueve
  columnas del anclaje; `arena_inscriptions` con la decisión comercial y la re-evaluación.
- **Docs**: guardianes nuevos **`qa-pvc-precio`** (52 — reproduce la escalera publicada grado por grado desde `paridad.json`,
  `RANGOS` = `definicion.ts`, las ancladas no teclean precio) y **`qa-trato-check`** (35 — cada cifra de `terminos.ts` contra el
  §0/§6 del plan; rechazo gratis; re-evaluación; «sin oferta»); `qa-circuito` 41 → 45.

## [V5.81] — 2026-09-24 (commit ebb5861)

- **Hito**: **la fase 4 del `PLAN_CIRCUITO_DEL_LOTE.md` — Centro de Calidad · Evaluación de Lotes** (folio 7 del owner, paso 11;
  respuesta 5). Código de `socios` tocado desde la sesión `consolas` con el «continúa con la fase 4» del owner; línea en `ALINEACION` §3.
- **Añadido**: **el módulo del socio** `/socios/centro-calidad/panel/evaluacion`: los Baches de Evaluación en manos de esa
  credencial, cada lote **anónimo (solo su código)**, la planilla (SCA **o CVA**, factor, mallas, **rueda de sabores**) y **«dar de
  alta»** lote a lote → `lot_evaluations` pendiente. El Q-Grader puede anular su alta mientras CTCx no decida.
- **Añadido**: **la credencial activa módulos** (`partner_accounts.modulos`: Evaluación de Lotes · Procesamiento de Lotes),
  conmutados por el owner en `/bcp/socios/[nodo]`; el panel del socio enseña el módulo o dice que no está activo.
- **Cambiado**: **registrar ≠ confirmar**: en «Lotes en Evaluación» CTCx ve el alta del Centro y la **confirma** (galardona con el
  grado derivado del puntaje / no supera; la fila pasa a `accepted` y rige el grado) o la **devuelve** con motivo; registrar a
  mano queda plegado como recurso. Al enviar un bache, el **Q-Grader es el contacto de la credencial elegida** — deja de teclearse.
- **Cambiado**: **la planilla distingue SCA y CVA en la información** (folio 11): escala como dato, siete secciones afectivas 1–9
  con la fórmula del SCA (`computeCva`), y la **rueda** con UNA taxonomía (`src/lib/catacion/rueda.ts`, ES/EN, solo ids en la
  base). Defectos del Café y el Coffee Varieties Map se enlazan desde la planilla, no se embeben.
- **Cambiado**: **el circuito gana «evaluado»** (alta del Centro pendiente, entre «en evaluación» y «pendiente de oferta»); la tabla
  del OCP lo alimenta; la barra del productor conoce el orden (y queda con dueño KR alimentar el dato).
- **Datos**: migración `centro_calidad_evaluacion` (acta en `docs/migraciones/`): `partner_accounts.modulos` (la credencial interna
  queda con Evaluación activa), `lot_evaluations.batch_id/escala/rueda/uid_anonimo`.
- **Docs**: guardián nuevo `qa-centro-calidad-check` (65 — anonimato, módulo por credencial, registrar ≠ confirmar, CVA 58–100,
  rueda única); `qa-circuito` 38 → 41; `qa-solicitud-evaluacion` re-apuntado al Q-Grader por credencial.

## [V5.80] — 2026-09-24 (commit bf2a0a5)

- **Hito**: **la fase 3 del `PLAN_CIRCUITO_DEL_LOTE.md` — solicitud, factura, muestra y Baches de Evaluación** (folio 7 del
  owner, pasos 7–10). El lado de Kaffetal Regal se ejecutó desde la sesión `consolas` con el sí del owner y línea en `ALINEACION` §3.
- **Añadido**: **«Solicitudes de Evaluación»** (`/ocp/solicitudes`, primera entrada de OCP · Catálogo): la solicitud del productor
  con su **nota de descuento**; CTCx **decide la subvención** (una campaña del 30–70 %, o ninguna; emite y canjea el código KRX-
  a nombre del productor), **corrobora y emite la factura de cobro** (`FE-AAAA-NNNNN` de una secuencia de la base; documento
  imprimible con la tarifa, la subvención, el total y el carril), **confirma el pago SOBRE la factura** (sin ella no hay qué
  conciliar; la única puerta sin factura es «CTCx asume el costo») y **recibe la muestra** con los kilos reales.
- **Añadido**: **la tarifa vive en `src/lib/trato/terminos.ts`** ($200.000, respuesta 2 del owner), con los mínimos por grado de
  la respuesta 1 (Black/Red 6 cargas · Blue 3 · Gold 200 kg), la muestra de 2 kg y la regla **contra entrega** (el flete lo paga
  CTC al recibir). `ARENA_FEE_COP`/`EVALUATION_FEE_COP` son ahora ese mismo número.
- **Añadido**: **Gestión de Muestras, 1.ª tanda** (`/ocp/muestras` deja de decir que no existe): tablas `muestras` y
  `muestra_movimientos`; el recibo crea las filas con la **partición del folio 7 (500 g evaluación · 500 g contramuestra · 1 kg
  testeo)** Y la marca que lee el circuito, en una sola acción (`src/lib/muestras/recibo.ts`; si una falla, no queda la otra);
  la lista «qué hay y dónde» con el **saldo derivado** (recibido − Σ salidas, nunca guardado), ubicar y anotar salidas
  (`borrador`, en la lista blanca), y la pestaña **Pedidos de muestra** que por fin enseña `sample_pack_orders`.
- **Cambiado**: **los baches son «Baches de Evaluación»** que van al **Centro de Calidad**: `abierto` (se arma en «Lotes a Evaluar»
  con los pagados y recibidos, ≤30) → `en_centro` («Enviar al Centro de Calidad», con el Q-Grader que firmará —se teclea hasta
  la fase 4—; la muestra de evaluación de cada lote deja su salida `a_centro`; nota a cada productor) → `cerrado` (solo cuando
  cae el último veredicto). El veredicto exige el bache `en_centro` y lo registra CTCx en «Lotes en Evaluación» hasta que el
  socio tenga su módulo. **Retirado** el kanban de sondeo con laboratorio externo, prueba de envío y «solicitud formal».
- **Cambiado**: **el circuito derivado gana «solicitada»** (`estadoDelCircuito` v2): *solicitada* (pidió; falta factura, pago o
  muestra) → *a evaluar* (pagado y recibido, sin bache) → *en evaluación* (en un bache en el Centro). La tabla del OCP y la barra
  del lote del productor lo leen de la misma función. El rail de OCP · Catálogo queda en el orden de la respuesta 7 (las dos
  «Ofertas» son el staging; Catálogo Activo al final).
- **Cambiado**: **Kaffetal Regal**: al solicitar, el productor puede **pedir un descuento por nota**; ve **«Solicitud recibida —
  CTC la corrobora y emite su factura»** y luego **la factura con su total** (la misma plantilla que el OCP); las instrucciones de
  pago aparecen solo con factura emitida; el envío dice **contra entrega**; «en fila» y «en bache» hablan del Bache de Evaluación
  y del Centro de Calidad, no de un laboratorio.
- **Datos**: migración `solicitudes_muestras_baches` (acta en `docs/migraciones/`): cinco columnas en `arena_inscriptions`,
  `next_factura_ref()` (SECURITY DEFINER, solo service role), el CHECK de `sondeo_batches.status` con los tres estados nuevos +
  `centro_calidad_account_id` y `cerrado_at`, y las dos tablas de muestras (RLS, cero políticas).
- **Docs**: guardianes nuevos `qa-solicitud-evaluacion-check` (78 — la tarifa, los mínimos, la partición y «contra entrega» se
  leen DEL PLAN; el pago sobre la factura; los tres estados del bache; el rail de la respuesta 7) y `qa-muestras-check` (41 — los
  cinco puntos del brief); `qa-circuito-check` 31 → 38 (el estado nuevo, `enBache`, la barra del productor).

## [V5.79] — 2026-09-24 (commit ef8f87b)

- **Hito**: **la fase 2 del `PLAN_CIRCUITO_DEL_LOTE.md` cierra por el lado de Kaffetal Regal** — código de `kaffetal-regal`
  tocado desde la sesión `consolas` con el sí del owner («hazlo tú desde esta sesión», 2026-09-24) y línea en `ALINEACION` §3.
- **Cambiado**: **A5 (EUDR) es el ÚLTIMO paso del intake y B4 (fotos) va antes** (folio 7 del owner): el orden es
  **FT · FT2 · FOTO · EUDR → VISA** en la Ficha (`FichaView`: panes, compuertas y botones), su navegación (`FichaNav`), la barra
  del lote (`LotKanbanStepper`) y la etiqueta del OCP (`PASOS_DE_LA_FICHA`). La finca completa su Pasaporte mientras el productor
  termina el lote; la Visa se hereda al final.
- **Añadido**: **el dossier del lote en español e inglés** (`/kaffetal-regal/dossier/[id]?lang=es|en`, `LotDossierDoc`): UN documento
  imprimible con la identidad y trazabilidad, el Pasaporte de la(s) finca(s) y la Visa del lote (con la DDS), la caracterización
  (la ficha oficial ★ y la evaluación que rige el grado) y las certificaciones **corroboradas**. Solo afirma lo que la plataforma
  tiene. Enlazado desde «Lotes Galardonados» (ES y EN); es la «Ficha descargable» de la respuesta 5 (Imprimir / PDF).
- **Añadido**: **el productor ve el estado de cada certificación** en su finca («CTC pidió el respaldo · recordatorio n de 4»,
  «corroborado por CTC», «retirada del Pasaporte por CTC», con la nota de CTC), y el **Pasaporte impreso deja fuera las retiradas**.
- **Datos**: el único borrador que iba por `intake_step = 3` (EUDR hecho, fotos pendientes) pasa a `2` para que el orden nuevo
  lo lea bien (las fotos son lo que le falta; el EUDR ya cargado se confirma en un clic).
- **Docs**: `qa-registro-check` (67) vigila también el lado de KR: el orden en las tres piezas, el estado visible y el dossier.

## [V5.78] — 2026-09-24 (commit a5a7f1c)

- **Hito**: **fase 2 del `PLAN_CIRCUITO_DEL_LOTE.md` — el registro** (lado OCP; lo de Kaffetal Regal queda con dueño en su charter).
- **Añadido**: **las certificaciones de la finca tienen estado** (folio 7 del owner): `declarada` → **evidencia pedida** (CTC
  pide el respaldo con una nota: correo + feed) → `corroborada` (contrastada, exige vigencia) — o **retirada del Pasaporte** si
  nunca se respaldó; el registro queda. **Recordatorio semanal** al productor, **máximo cuatro**, y a la quinta semana se retira
  sola: cron nuevo `/api/cron/recordatorios` (lunes 12:00 UTC, `vercel.json`), regla PURA en `src/lib/registro/reglas.ts`,
  servidor en `src/lib/registro/certificados.ts`. En el panel de certificaciones del OCP: Corroborar · Pedir evidencia… ·
  Retirar… · Reabrir, con el estado y el conteo de recordatorios a la vista.
- **Añadido**: **el chequeo contra bases EUDR oficiales** en la finca (manual por ahora, como pidió el owner): un cuadro de
  texto y adjuntos en «Análisis y Evidencia» del editor de asistencia (`fincas.eudr_chequeo_notas`, `eudr_chequeo_files`, solo CTC).
- **Cambiado**: **la transcripción de FT2 se hace en la vista completa del lote** (`/ocp/kr?lote=`): el set de Fichas Técnicas
  (soportes adjuntos, escáner con IA opt-in, compilar del reporte, la oficial ★) se monta allí; `/ocp/fichas` queda como índice.
  Y nace la **transcripción a mano en el formato de la Datasheet** (`crearFichaManual`, fuente «Compilada por CTC» que estaba
  reservada sin escritor): los mismos campos y rangos del escáner; lo que el documento no muestra se deja vacío.
- **Datos**: migración `registro_chequeo_y_certificados` (acta en `docs/migraciones/`): `finca_certificates.status` +
  `nota_ctc` + `evidencia_pedida_at` + `recordatorios` + `ultimo_recordatorio_at` + `retirada_at` (backfill: las verificadas
  → corroborada; guard: solo CTC mueve el estado, un INSERT nace «declarada», editar una corroborada la devuelve a «declarada»);
  `fincas.eudr_chequeo_*` protegidas por `guard_finca_protected_columns`.
- **Docs**: guardián nuevo `qa-registro-check` (50: la regla desde el folio, rastro en cada movimiento, remitente único, cron
  con secreto, el OCP como único escritor). **Lo que la fase 2 deja a `kaffetal-regal`**: A5 como último paso del intake, el
  dossier ES/EN por lote, la Ficha descargable, y enseñarle al productor el estado de cada certificación (hoy lo sabe por su feed).

## [V5.77] — 2026-09-24 (commit 1c80795)

- **Hito**: **fase 1 del `PLAN_CIRCUITO_DEL_LOTE.md` — retiros y mudanzas**, con la nota del owner sobre la Arena.
- **Cambiado**: **la Kaffetal Regal Arena se rehace como sesiones de segunda apreciación** (BCP · Ecosistema de Valor). Una sesión es
  un NOMBRE (sin temporada ni fecha); se llena con cafés **galardonados**; a cada uno se le hace una apreciación más con la planilla
  B2 · B3 (`LabEvalEditor`), que se **adjunta al lote** como `lot_evaluations` (`bcp_arena`, aceptada); y **el Grado lo rige UNA
  sola evaluación** (`lot_evaluations.rige_grado`, por defecto la inicial del Q-Grader), que se elige en la sesión y es lo único que
  reescribe `lots.grade` fuera del veredicto. `officialAverages` deja de promediar: devuelve la que rige (mismo nombre y forma,
  para que ofertas, subastas y la Ficha del productor no cambien).
- **Retirado**: la jornada en vivo de la Arena (runner, jueces, descartes, ganador, registro de tazas, sesión a ciegas
  `revealSessionIdentities`, `jornada.ts`, `qa-jornada-check`), la **vitrina** (`showcaseGate`, `inviteLotToArena`,
  `assignLotToSession` y sus botones) y los KPI/tareas «en fila para Arena». Las fases `arena · sesion · competido` quedan en el
  CHECK sin escritor; `arena_scores` dormida.
- **Retirado**: **el Kaffetal Club como membresía** — el galardón ya no la reparte (`grantClubMembershipOnce`), **firmar un
  contrato y publicar al catálogo ya no la exigen**, `revokeClubMembership`, `clubEmails.ts` (sin importadores) y la insignia
  «Kaffetal Club ✓» del OCP. `producer_profiles.club_member_since` queda dormida.
- **Añadido**: **«Campañas de Subvención»** en OCP · Manejo de Stock Físico (`/ocp/subvenciones`, `+ campanas/[id]`): las
  campañas de descuento del Club, con el nombre que el owner pidió, la tarifa plana de **$200.000** a la vista y la subvención
  acotada al **30–70 %**. `/bcp/club` y `/ocp/club` → 308 (`rutasMovidas`, `/ocp/club` reapuntada, sin cadena).
- **Cambiado**: los **reclamos de oficialización** del productor (FT2 con soportes, `producer_claim` pendientes) se revisan en la
  **vista completa del lote** (`/ocp/kr?lote=`), no en la Arena; `reviewEvaluationClaim` es del OCP y devuelve resultado. El Panel
  del OCP cambia sus dos KPI de Arena por «Solicitudes de evaluación por resolver» y «Reclamos por revisar».
- **Datos**: migración `arena_apreciaciones` — `arena_sessions.name` (temporada y fecha ahora opcionales); `lot_evaluations.rige_grado`
  con índice único parcial por lote y backfill (la más antigua del Q-Grader, si no la más antigua aceptada). Acta en
  `docs/migraciones/2026-09-24_arena_apreciaciones.sql`.
- **Docs**: los diez atributos SCA tienen UNA fuente (`ATRIBUTOS_SCA`, `src/lib/fichas/tipos.ts`; `SCA_KEYS` se fue con la
  jornada). `qa-evaluaciones` (51) reescrita: sin Club, y la Arena como apreciación que no toca el circuito. Lo que la fase 1
  DEJA para después: temporadas siguen en `/bcp/arena/temporadas`; `src/lib/arena/` no se renombra todavía; el cashback del 80 %
  y `RELEASE_STAIRCASE` salen en la fase 5; el copy de KR sobre Arena y Club es de `kaffetal-regal`.

## [V5.76] — 2026-09-24 (commit 4f3490c)

- **Hito**: **fase 0 del `PLAN_CIRCUITO_DEL_LOTE.md`** (el owner contestó las ocho decisiones y concedió el borrado) y las cuatro
  indicaciones del owner al ver por fin `/ocp/kr`.
- **Cambiado**: **«Productores, Fincas y Lotes» según el owner** — (1) se retira «Nuevo lote (en nombre del productor)» y su acción
  `createLot` (eso se hace con la sesión asistida); (2) la tabla nace **agrupada por productor**; (3) el mapa pinta los pines del
  **elemento** principal (fincas o lotes), no los dos a la vez; (4) filtro principal **«Ver lotes / Ver fincas»**: con fincas, una fila
  por finca con cuántos lotes tiene, y el filtro de **Pasaporte** (con · sin · o la etapa: sin Pasaporte, en trámite, en revisión por
  CTCx, aprobado sin remitir, vigente, rechazado — las etapas de `fincaEudrStatus`, no una lista a mano). `?elemento=` y
  `?pasaporte=` en la URL; el KPI «Fincas pendientes» del Panel del OCP abre `?elemento=fincas&pasaporte=en_revision`
  (cierra el pendiente (g) del charter).
- **Datos**: **borrado el juego de prueba** que el owner pidió retirar: el contrato `8618ecda` con sus 3 liberaciones, la oferta
  aceptada, el listado publicado y el lote `f5187234` («Gesha 72h Ferm», Gold) con sus evaluaciones, aportes y snapshots.
  `audit_log` se conserva; dos notas del productor quedan sin `lot_id`. ⚠️ El archivo del video queda huérfano en el bucket
  `kaffetal-media` (Supabase no deja borrar `storage.objects` por SQL): se retira por la Storage API.
- **Docs**: las ocho decisiones del owner escritas en el plan (§6) y lo que cambian en él: la Arena **se queda** en el BCP (se
  rehace como sesiones de segunda apreciación), «Ofertas CP Aceptadas» y «Oferta desde CTCx Selection» son el **staging** del
  Catálogo Activo, la subasta Tyrian sigue (MOQ 100 kg CPS), mínimos 6 · 3 · 200 kg, tarifa $200.000 con subvención 30–70 %.

## [V5.75] — 2026-09-23 (commit f4f7c66)

- **Hito**: **nacen «Asistencia a Proveedores» y «Proveedor Desacoplado»** en OCP · Kaffetal Regal — la primera tanda del brief
  `consolas-rutas-del-proveedor.md` (los tres diagramas del owner: Estándar · CTCx Selection · Desacoplado), autorizada por el
  owner el 2026-09-23 sobre el contrato de Identidad: **sí a la sesión asistida, sí a la cuenta sin buzón**.
- **Añadido**: **la sesión asistida** (`src/lib/asistencia/actions.ts`): «Entrar como el productor» genera un enlace de sesión
  (`auth.admin.generateLink`, sin correo) y lo canjea en la cookie COMPARTIDA, así que Kaffetal Regal se abre en otra pestaña
  como ese productor y toda su interfaz (finca, parcelas, mapa EUDR, la Ficha, fotos) sirve tal cual; las subidas caen en su
  carpeta y los guard triggers aplican como a él. La consola sigue en `ctc-panel-auth`. **Solo para cuentas de productor**, y
  siempre con rastro: `audit_log` + una nota en su feed. «Cerrar sesión asistida» limpia SOLO este navegador (`scope: local`).
  El botón vive en `/ocp/asistencia` (lista de productores) y en la vista completa del productor (`/ocp/kr?productor=`).
- **Añadido**: **Proveedor Desacoplado** (`/ocp/desacoplado`): CTCx crea una cuenta de productor con correo-etiqueta sin
  buzón (`desacoplado-<slug>@ctcexport.com`, el precedente de `delivery_email`), contraseña que nadie ve y
  `producer_profiles.gestion = desacoplado`; la carga con la sesión asistida; y la **entrega** asignándole el correo real de
  alguien (una identidad, una cuenta) + el enlace de contraseña por el flujo de «Recuperar acceso». Mientras es desacoplado,
  **ningún correo sale hacia él** (el remitente compartido filtra la etiqueta) y `/ocp/kr` lo rotula.
- **Añadido**: **«CTCx asume el costo»** de una evaluación (`asumirEvaluacion`, junto a «Confirmar pago» en Lotes a Evaluar):
  la inscripción queda `exento` con la razón escrita, sin fingir un código de campaña al 100 %.
- **Datos**: migración `producer_profiles_gestion_desacoplado` — `gestion` (`desacoplado` · `entregado`), `gestion_desde`,
  `entregado_at`; `guard_producer_protected_columns` las protege al insertar y al actualizar. Acta en
  `docs/migraciones/2026-09-23_producer_profiles_gestion_desacoplado.sql`.
- **Corregido**: `createLot` devolvía `throw` en dos rechazos alcanzables (tumbaba la tabla): ahora `{ ok: false, error }`.
- **Docs**: guardián nuevo `qa-asistencia-check` (57); `qa-rutas-consolas` (500) declara el módulo; charter y §3.

## [V5.74] — 2026-09-23 (commit 5ef97d6)

- **Cambiado**: **el OCP dice el vocabulario EUDR asentado en la V5.65** (`src/lib/eudr.ts`): la columna «EVA» de `/ocp/kr` es
  **«Visa»** (el veredicto documental del lote), la columna «Visa EUDR» de la finca es **«Pasaporte EUDR»**, el badge «Veredicto
  EVA» es **«Veredicto de Visa»**, «Esperando EVA» es «Esperando Visa», el editor de asistencia dice «Pasaporte EUDR de la finca»
  y los mensajes de `markLotApto` · `registerLotDds` · `setEvaChecklistItem` hablan de la Visa del lote y del Pasaporte de la
  finca (ya no de «Sello»). Cierra la divergencia declarada en `ALINEACION` §3 el 2026-09-20 — primera tanda del brief
  `consolas-simplificar-ocp-al-circuito.md`. **Ninguna regla cambió**; los identificadores (`EvaReviewCard`, `EVA_CHECKLIST_ITEMS`,
  `lots.eva_checklist`) se quedan con nota en el archivo hasta la tanda de bandejas.
- **Corregido**: `fichasActions.ts` decía «muestra de 205 g» en la instrucción del escáner de Fichas; es **250 g**, el único
  valor con el que cuadra el rango 150–245 y la aritmética del repo (`computeFactor`, `fa_start`).
- **Docs**: `qa-evaluaciones-check` (53) vigila ahora las DOS caras del vocabulario: la del productor (V5.65) y la del OCP.

## [V5.73] — 2026-09-23 (commit aa681e4)

- **Hito**: **cierra el primer ciclo del Cotizador Courier · FedEx** (V5.68 → V5.73, un día): brief aprobado, cálculo con el acuerdo
  confidencial, combustible automático, correcciones del primer recorrido, borrar, y ahora el enlace con el CRM.
- **Añadido**: **enlace con LCP · CRM CP CaaS**. Cada cotización courier puede pertenecer a UN item CaaS (una tarjeta del CRM =
  un lead del pilar `cocreate`); un item puede tener varias. En la tarjeta del CRM, la sección «Cotizaciones courier · FedEx»
  enseña las suyas (total, destino, peso real y cobrado, servicio, envío, nota) con «Abrir», y el botón «Nueva cotización courier
  para este item». El cotizador lee `?lead=` (banner «Cotizando para el item CaaS…», con «Ver en el CRM» y «Quitar vínculo»; lo
  que se guarde queda en la tarjeta) y `?abrir=` (abre una guardada). La lista de guardadas gana la columna «Item CaaS», con
  enlace a la tarjeta.
- **Añadido**: **editar la nota** de una cotización guardada (en la misma fila, Guardar/Cancelar). Acción
  `editarNotaCotizacionCourier`, clase `borrador` (entra en la lista blanca de `BCP_USER_ADMIN_PLAN.md`). Lo cotizado sigue
  congelado por el guard trigger.
- **Datos**: `courier_cotizaciones.lead_id` → `leads(id)` `on delete set null` (si el lead se borra, el acta se queda sin vínculo).
- **Cambiado** (código ajeno, `consolas`): `LeadsBoard.tsx` lee `courier_cotizaciones` solo para el pilar `cocreate`. Línea en
  `ALINEACION` §3.

## [V5.72] — 2026-09-23 (commit 8f6e969)

- **Añadido**: botón **Borrar** en «Cotizaciones guardadas» del Cotizador Courier, junto a «Abrir», con confirmación que nombra
  la cotización (fecha, destino, peso y total). Acción `borrarCotizacionCourier` (clase `emite`: borrar nunca es borrador). Si
  la cotización borrada estaba abierta, se cierra. El guard trigger sigue impidiendo REESCRIBIR un acta; retirarla, no.

## [V5.71] — 2026-09-23 (commit 7fab5b6)

- **Añadido**: botón **Borrar** en el recargo de combustible del Cotizador Courier: la lista «Semanas anotadas» (cerrada por
  defecto, bajo la gráfica) enseña cada semana con su origen y su fuente, y se borra con confirmación. Acción
  `borrarCombustible` (clase `emite`: borrar nunca es borrador). Una semana automática borrada la vuelve a anotar el cron
  si la EIA aún la trae; el mensaje lo dice.
- **Datos**: borrado, a petición del owner, el 40 % anotado a mano del 16 al 30 de septiembre (era una prueba y pisaba
  la semana del 21 al 27).

## [V5.70] — 2026-09-23 (commit c49ec33)

> **Wrap V46** (2026-09-23): ciclo compilado en `Documentacion_Interactiva_V46.0(35ebddd).html` — 42 nodos (+2: la LCP, el Courier) · 155 fichas (+7: `lcp`, `tablerodeejecucion`, `tablaunica`, `circuitodellote`, `courier`, `espejoamano`, `derivadonosepersiste`) · 62 trazas (+3) · 105 wires (+10) · 38 CTX (+2) · 421 ANN (+32 y una ampliada, con 22 repuntadas). Doce asientos de cuatro sesiones: el overhaul de las consolas hasta donde se pudo.

- **Corregido**: el Cotizador Courier ya no deja un envío futuro sin combustible. Si la semana del envío aún no está
  publicada, usa la última conocida y lo marca **provisional** (antes: «INCOMPLETO» y combustible US$ 0,00). Solo falta
  de verdad si no hay ninguna semana anotada antes de la fecha.
- **Corregido**: la frontera paquete/carga ya no usa el peso VOLUMÉTRICO: una pieza es carga (Freight) si pesa más de 68 kg
  reales, mide más de 274 cm de largo o más de 330 cm de largo + contorno (la regla de FedEx), y el aviso dice cuál. El
  volumétrico solo decide lo que se cobra (una caja de 70×70×70 sigue siendo carga, ahora por sus 350 cm de largo + contorno).
- **Corregido**: los mensajes de «Actualizar ahora», «Anotar» y «Guardar» salen junto al botón que los dispara (antes solo
  dentro de la tarjeta de resultados, invisibles si no había cotización); «Actualizar ahora» dice qué semanas anotó y por qué
  omitió las demás.
- **Añadido**: **gráfica del recargo de combustible** semana a semana (automático vs a mano, con su fuente al pasar el cursor)
  y los enlaces a la tabla de FedEx y a la serie de la EIA.
- **Añadido**: las **cotizaciones guardadas se abren de nuevo**: el resultado tal como quedó ese día (congelado) y sus datos de
  vuelta en el formulario, con «Recotizar con tarifas de hoy». La lista enseña el peso REAL y el cobrado, la fecha del envío, el
  país y el nombre del servicio (antes solo el peso cobrado y el código `IEF:carga`).
- **Cambiado**: el tablero tiene su propio diseño (`courier.module.css`): `shared.module.css .card` es una fila flex con
  `space-between` y repartía el formulario a las esquinas. Las piezas van en una rejilla con los rótulos encima de su casilla y
  el volumétrico de cada pieza calculado al escribir.
- **Añadido**: `qa-courier-check` 44 → 51.

## [V5.69] — 2026-09-23 (commit b33ed67)

- **Añadido**: **el recargo de combustible del Cotizador Courier se anota solo**, con un cron semanal
  (`/api/cron/courier-combustible`, jueves 13:30 UTC). fedex.com no responde a un servidor (Akamai), así que el % se
  **deriva como lo deriva FedEx**: precio semanal del queroseno de aviación USGC de la EIA (serie EER_EPJK_PF4_RGC_DPG) →
  tabla de escalones de FedEx → rige el lunes 10 días después del viernes de la semana EIA. Comprobado contra las 11 semanas
  que publicaba fedex.com el 2026-09-23. **Nunca pisa lo anotado a mano.** Botón «Actualizar ahora» en la pantalla, y cada
  semana del historial dice si fue automática o a mano.
- **Datos**: tabla `courier_combustible_escalas` (la de FedEx vigente desde 2026-05-11, 125 escalones);
  `courier_recargos` gana `automatico`, `indice_usd`, `indice_semana`. Sembradas las semanas del 7 y 14 de septiembre.
- **Añadido**: `qa-courier-check` 37 → 44 (el desfase y la tabla contra el historial publicado por FedEx; el lector de la EIA).

## [V5.68] — 2026-09-23 (commit 113f56b)

- **Añadido**: **Cotizador Courier · FedEx** en `/ecp/cotizador-courier` («ECP · Modelo Logístico»): el costo para CTCx de un
  envío de café (verde o tostado, < 100 kg). Tarifa de lista de la guía pública de FedEx Colombia 2026 − descuentos del acuerdo
  firmado el 2026-09-22 (zona y banda de peso + descuento adquirido en gracia/escalón + bonificación por automatización) → cargo
  mínimo → + combustible de la semana sobre la neta. Compara International Priority Express · Priority · Economy (y la caja
  FedEx 10/25 kg, el Pak y el Freight cuando aplican), con el desglose línea a línea y la fuente de cada cifra; guarda la
  cotización como acta congelada. Brief aprobado por el owner el mismo día (`briefs/herramientas-internas-cotizador-courier.md`).
- **Datos**: ocho tablas `courier_*` (acuerdos, descuentos, descuento adquirido, bonificaciones, tarifas base, zonas, recargos,
  cotizaciones), RLS + cero políticas; `guard_courier_cotizacion_inmutable`. Cargadas con `scripts/seed-courier.mjs` desde una
  carpeta FUERA del repo: 1.350 tarifas de exportación, 85 zonas, el acuerdo, y el combustible de la semana 21–27 sep (41 %).
- **Seguridad**: el acuerdo es **confidencial** (cláusula 6) y el repo es público: ninguna cifra, número de acuerdo ni de cuenta
  entra al repo; el cálculo corre en el servidor y el navegador solo recibe el desglose de su envío.
- **Añadido**: guardián `qa-courier-check` (37): el cálculo contra un acuerdo FICTICIO y la fuga cero por hash.
  `qa-rutas-consolas` declara el módulo; `guardarCotizacionCourier` entra en la lista blanca de borradores (`qa-niveles`).

## [V5.67] — 2026-09-22 (commit 3c94c4b)

- **Retirado**: **el «Reporte de proceso de café» (`mermas-detallada`) sale de la web** por decisión del owner: se borra
  `public/tools/mermas-detallada/mermas-detallada.html`, archivada desde el 2026-08-15 y servida hasta hoy con `noindex`
  (archivar no retira). Sus dos URLs —la plana y la de carpeta— **no dan 404**: van con 308 a su sucesora, la Calculadora de
  mermas · Detallada (`mermas-ctc`), porque pueden estar enlazadas desde fuera. La fila de `tools` y su versión se quedan,
  archivadas, como registro (sin trabajos, permisos ni solicitudes); la fuente original del owner sigue en
  `reference/html_tools/mermas-detallada/`.
- **Cambiado**: `src/lib/tools/carpetas.ts` gana `HERRAMIENTAS_BORRADAS` (id, archivo y sucesora), de donde salen esas 308;
  `qa-tools-carpetas` (165) exige que una borrada no vuelva a tener carpeta y que su sucesora esté viva, y
  `qa-tools-seo-espejo` (86) exige lo contrario que a una archivada: que el archivo **ya no esté**.

## [V5.66] — 2026-09-21 (commit 3467576)

- **Hito**: **Herramientas del Café: una carpeta por herramienta, y el recuento para abrir una conversación por cada una**
  (owner, 2026-09-21). Los 16 HTML sueltos de `public/tools/` pasan a `public/tools/<id>/` —la carpeta se llama como el
  `tools.id` de la base, no como el archivo, así que los ids cruzados de mermas dejan de confundir—. La lista vive en UNA
  fuente, `src/lib/tools/carpetas.ts`, y de ella salen las **16 redirecciones 308** de `next.config.ts`: toda URL plana de
  antes (`/tools/agtron-dial.html`) sigue abriendo, incluidos enlaces impresos y resultados de Google.
- **Docs**: **el recuento** en `docs/componentes/herramientas-cafe/README.md` —15 herramientas en la base (13 vivas, una
  `noindex` a propósito, una archivada) + una candidata sin alta (Atlas cafetero)— con una **ficha por herramienta** en
  `herramientas-cafe/<id>/README.md` (estado, dónde vive, dónde se reutiliza, qué queda abierto y la línea «Hoy:» de su
  conversación) y el **mapa de interfaces**: qué otra parte de la plataforma usa ya cada herramienta y cuál la va a usar
  (la Rueda del Café en el Centro de Calidad). Lo que destapó: la Rueda vive en dos versiones y el Sneak Peek dibuja con
  la vieja; `mermas-ctc` y `cogs-verde` tienen **copias** en `public/ocp-apps/` para los cotizadores (CoGS ya en V19
  contra la V18 pública); dos fichas del café verde; cuatro herramientas solo en inglés.
- **Añadido**: `scripts/qa-tools-carpetas.mjs` (166): carpeta ↔ lista ↔ disco ↔ 308, nada suelto en la raíz, ninguna
  carpeta llamada como lo compartido (`assets`, `h`), y **nadie en el código vuelve a escribir una ruta plana** (funcionaría
  por la 308 y nadie lo notaría).
- **Cambiado**: `qa-tools-seo-check` recorre las carpetas (257); `qa-taller-check`, `qa-tools-puente-conformance`,
  `build-tool-shots`, `qa-cromatografia-check`, `cromatografia-recorrido`, `build-ruedas-mock` y `qa-sneak-peek-check`
  apuntan a las rutas nuevas; el cotizador de empaque (`AppFrame.tsx`, `herramientas-internas`) embebe la nueva URL sin salto.
- **Datos**: `tool_versions.src_publico` reapuntado a `/tools/<id>/<archivo>.html` en las 16 versiones del repo, **con esta
  versión ya desplegada** (antes la base habría señalado archivos que aún no existían).
- **Docs**: las fuentes del owner quedan en `reference/html_tools/<id>/` (fuera de git); las nuevas sin id, en `_candidatas/`.

## [V5.65] — 2026-09-20 (commit 0ba60b1)

- **Hito**: **el vocabulario EUDR queda asentado, una palabra por objeto en toda la red** (owner, 2026-09-20). **PASAPORTE** es de la
  **FINCA** —su debida diligencia—; **VISA** es del **LOTE**, se hereda del Pasaporte y es el **primer entregable de CTCx, y gratis**:
  la documentación EUDR no necesita al Q-Grader, así que la Visa llega **antes** de la evaluación. Y **EVA** deja de ser ambigua para
  siempre: es **«Evaluación de Muestras en Origen»** —mandar las muestras al Q-Grader y recibir granulometría y perfil sensorial, que
  dan el Punto y la Tríada y de ahí el Grado. Hasta hoy la finca tenía «Visa», el lote «Sello» y el OCP llamaba «EVA» al veredicto
  documental: tres nombres para dos cosas y una palabra prestada. La definición vive escrita en la cabecera de `src/lib/eudr.ts` y la
  vigila `qa-evaluaciones` por las dos caras (que la barra lo diga, y que las pantallas del productor **no** vuelvan a decir «Sello»).
- **Hito**: **el mapa EUDR se rehízo con el flujo que dibujó el owner**, y lo primero que arregla es que **todos los cafetales sean la
  misma cosa**: hasta ayer la Parcela 1 era un mapa suelto con el área y la altura de la FINCA lejos, arriba, y las 2..N eran tarjetas
  con otro formulario — dos piezas para el mismo objeto. Ahora las dos montan **un solo `CafetalEditor`**.
- **Cambiado**: **la pregunta «¿el área del cultivo es mayor a 4 ha?» se DECLARA antes de tocar el mapa**, y es por cafetal. Antes la
  exigencia de polígono se **deducía** de un área que el productor todavía no había medido, así que el mapa **cambiaba de modo debajo
  de sus manos** mientras escribía. Ahora contesta primero —que es el orden en que lo sabe— y el mapa abre ya en su modo. La respuesta
  se guarda en `finca_parcelas.requires_polygon`, una columna que existía desde F1 y que **nadie escribía**; `null` sigue significando
  «sin contestar» y se resuelve por área, así que ninguna parcela vieja necesita migración.
- **Añadido**: **cada cafetal tiene su propia altura** (`finca_parcelas.altitude_masl`, migración `parcelas_altura_y_declaracion_area`),
  con su «Traer del mapa ⛰», y su propia área con «Calcular del polígono 📐». El área y la altura de `fincas` se quedan donde estaban
  —las leen el dossier, el KML y el OCP— pero bajan debajo de los cafetales y se rotulan como lo que son: **los totales de la finca**.
- **Añadido**: el **nombre de cada cafetal se edita con un lápiz** junto al título (objetivo táctil de 44 px, no un glifo de 12), y el
  bloque enseña su resumen «(3,5 ha · 1.354 msnm)» en cuanto existe. En modo punto, los **puntos de geo-referencia van escritos**: es
  lo que viaja al expediente, y verlos es lo que deja comprobar que el pin cayó donde el productor cree.
- **Cambiado**: **B1 pide un proceso por VARIEDAD, no uno por lote** (owner). Un mismo lote puede llevar la Typica lavada y la Gesha en
  honey; con un solo proceso, el productor tenía que elegir cuál de sus dos verdades escribía. `VarietyRow` gana `base` y `special`
  con **default seguro**: `seedProcesos()` siembra cada variedad con el proceso que el lote ya tenía, así que ningún datasheet
  anterior pierde nada ni obliga a reescribir.
- **Retirado**: **el selector de «Especie» de B1** (owner: «es redundante, se consulta desde la variedad»). Dejó de ser un campo y pasó
  a ser lo que siempre fue: una consecuencia — `especieDelLote()` la deriva de las variedades y dice «Mezcla» cuando no son todas de
  la misma especie. `species`, `base_processing` y `special_processing` **se siguen escribiendo** como proyección de la variedad
  dominante, porque los leen el OCP, el catálogo público, la ficha pública y el runner de Arena — código de otros componentes, que no
  se toca desde aquí. Una fuente, varias copias de lectura; no dos verdades.
- **Cambiado**: **la declaración final de la Ficha habla solo de la Ficha** (owner): «Declaro que la información es veraz y entregada
  en buena fe para identificar este lote con la mejor información disponible». Lo de la muestra de 2 kg marcada con el código del lote
  **sale de aquí** y se dirá donde se confirme la muestra: cerrar el expediente y comprometerse a despachar café son dos actos
  distintos, y juntarlos hacía que el productor firmara el segundo sin haberlo decidido.
- **Docs**: `qa-evaluaciones` pasa de 46 a **50** comprobaciones — vigila el reparto de nombres por las dos caras y se probó haciéndolo
  morder (devolver «Sello EUDR» a `PerfilTab` lo pone rojo). ⚠️ **El OCP todavía dice «EVA» y «Visa EUDR»** en su tabla y en
  `EvaReviewCard`: **pendiente con dueño `consolas`**, con su brief de simplificación (`briefs/consolas-simplificar-ocp-al-circuito.md`).

## [V5.64] — 2026-09-20 (commit fcc8bed)

- **Hito**: **la barra del lote se redibuja en DOS líneas** (owner, 2026-09-20), y con ella se reparten de nuevo dos nombres que
  llevaban meses significando cosas distintas en cada superficie. Arriba el **expediente** — `FT · FT2 · EUDR · FOTO → VISA` —,
  donde **VISA** es el veredicto documental de CTCx (el chip que hasta hoy se llamaba EVA en esta barra). Abajo el **tramo
  comercial** — `MUE → EVA → GRADO → CONT` —, donde **EVA** pasa a ser lo que siempre significó fuera de aquí: la **evaluación**
  con el Q-Grader (perfil sensorial + granulometría). `GAL` y `ARE` dejan de existir: el galardón es `GRADO` y la vitrina ya no
  es un paso de esta barra. Los chips de la línea comercial son **botones**: llevan a «Evaluaciones» o a «Contratos», que es la
  pregunta que el productor tenía que resolver saltando entre pestañas.
- **Hito**: **fase 5 del overhaul de consolas, ejecutada en el lado del productor**: el paso 4 del intake deja de ser «Video» y
  pasa a **«Fotos y video»** — **2 fotos del lote obligatorias, video opcional**. Hasta hoy el video se exigía **solo en el
  cliente**: la regla era a la vez más dura de cumplir y más fácil de saltarse.
- **Seguridad**: la regla de las fotos se exige **en el servidor**. Kaffetal Regal escribe directo contra Supabase con el JWT del
  productor (RLS + guard triggers, sin Server Action de por medio), así que «servidor» aquí es un **guard trigger**: nace
  `guard_lot_fotos_intake` sobre `lots` (migración `lots_fotos_obligatorias`), el tercero de la tabla, que rechaza el paso a
  `ficha_completa` sin las dos fotos. Solo muerde en la **transición**: un lote ya cerrado no se re-valida — no se le cambian las
  reglas a algo que ya entregó. `EXECUTE` revocado a `public`/`anon`/`authenticated`, como los demás triggers de la casa.
- **Cambiado**: **B3 · Caracterización Física pide UN número, no tres.** El factor de rendimiento y la almendra total son la
  misma medida dicha de dos maneras, así que el productor reporta **uno de los dos** y el otro se **deriva** y se le muestra
  (`almendraDesdeFactor` / `factorDesdeAlmendra`: **factor × almendra = 17.500**). Lo derivado **no se persiste** (ALINEACIÓN §1):
  se calcula al leer, y así la Ficha y el OCP siempre distinguen el número declarado del calculado. La **Densidad en Verde** deja
  de ser obligatoria y baja al bloque opcional, con las humedades.
- **Corregido**: **B3 le decía al productor un número imposible.** La ayuda de Almendra Total hablaba de una muestra de **205 g**
  mientras el rango declarado llega a **245 g** — una muestra no puede pesar menos que lo que sale de ella. La aritmética de
  laboratorio del propio repo (`computeFactor`, `fa_start` = **250**) ya usaba 250, y solo con 250 cuadran los dos rangos
  (AT 150–245 g ↔ factor 71–117, contra el 75–120 declarado). Copy corregida en KR. ⚠️ El mismo «205 g» sigue escrito en
  `fichasActions.ts` del OCP: **pendiente con dueño `consolas`** (no se toca código ajeno).
- **Añadido**: **el mapa EUDR enseña TODAS las parcelas a la vez** (owner). La que se edita va en oro; las hermanas ya guardadas,
  fijas en gris y rotuladas con su nombre — antes cada cafetal se dibujaba en su propio mapa, a ciegas, y dos podían solaparse
  sin que nadie se enterara. El mapa arranca centrado sobre ellas cuando la parcela nueva aún no tiene geometría.
- **Corregido**: **el primer vértice del polígono no se veía.** El `<Polygon>` no tiene nada que pintar hasta el segundo clic, así
  que el primero caía en un mapa que no reaccionaba y parecía que el toque no había funcionado (lo vio el owner). Ahora cada
  esquina es un **marcador numerado desde la primera** y se puede **arrastrar** para corregirla sin deshacer.
- **Cambiado**: **una sola puerta de entrada al dibujo.** Los botones de terminar, deshacer, ubicación y cancelar solo existen
  mientras se dibuja; fuera de ese momento no hacían nada y estorbaban. Y un clic suelto en el mapa ya **no** arranca un borrador
  invisible: la entrada es el botón, como pidió el owner.
- **Añadido**: el **nombre de la Parcela 1** ya es editable (las 2..N lo eran desde F1; esa no, porque nace espejada de la finca).
- **Añadido**: **el correo de la cuenta, a la vista** en Información General — en la tarjeta del panel y en el modal, en solo
  lectura. Es la dirección a la que CTCx le escribe, y el productor tenía que salir del panel para acordarse de con cuál se
  registró. Sale de la sesión de Auth, no de `profiles`; cambiarlo es cambiar la identidad y no es un campo de ese formulario.
- **Datos**: `lots.sample_2kg_confirmed_at` entra al modelo cliente del panel (solo lectura — lo protege
  `guard_lot_protected_columns`): es lo que cierra el chip **MUE**. Campo nuevo del datasheet `b4_files_foto` con **default
  seguro `[]`**, como manda el charter.
- **Docs**: dos guardianes se ponen al día con las reglas nuevas en vez de quedarse rojos (regla §4.5): `qa-reportado-productor`
  (38 → **45**) pasa a vigilar que la básica de B3 pida uno u otro, que la densidad **ya no** esté en la compuerta, y que lo
  derivado **no** se escriba al datasheet; `qa-evaluaciones` (40 → **46**) cambia la escalera `GAL`/`ARE` por los nueve chips de
  la barra nueva y **exige que la línea comercial salga de `estadoDelCircuito()`**, no de lógica propia — que es lo que la V5.62
  dejó escrito para cuando el panel del productor mostrara ese estado.

## [V5.63] — 2026-09-19 (commit cc8d39a)

- **Corregido**: **la LCP salía lavada: texto casi invisible sobre blanco.** Lo vio el owner en una captura. A la cuarta consola
  le faltaba su **layout raíz** (`src/app/lcp/layout.tsx`) desde que nació en la V5.59: ese archivo —fuera de `(app)`— es el que
  envuelve la consola en `data-theme="bcp"`, carga el Tailwind del panel y pone el `noindex`. Sin él heredaba los colores de
  otro tema y el rail perdía su fondo. **Nada lo avisó**: `tsc`, el build y los 54 guardianes pasaron en verde tres versiones
  seguidas, porque las consolas no se conducen en navegador. Es el mismo fallo de familia que la V5.59 quiso cerrar —una consola
  nueva son varios archivos, y el que no se deriva de `CONSOLE_ORDER` se olvida—, así que `qa-rutas-consolas` gana **(h)**: exige
  el layout raíz de cada consola, con su tema, su Tailwind y su `noindex` (probado haciéndolo morder).
- **Cambiado**: **el rail del OCP es el cuadro del owner, entrada por entrada.** «OCP · Kaffetal Regal»: Productores, Fincas y
  Lotes. «OCP · Catálogo»: **Lotes a Evaluar · Lotes en Evaluación · Lotes Evaluados → Pendiente Oferta · Catálogo Activo ·
  Ofertas CP Aceptadas · Oferta desde CTCx Selection**. «OCP · Manejo de Stock Físico»: Gestión de Muestras · CTCx Selection ·
  Compras. Las etiquetas son las del cuadro; las rutas, las que existían — y cada página dice en su título lo que dice el rail.
- **Cambiado**: **«Nominados» se parte en dos.** `/ocp/a-evaluar` (nota 2: el productor pidió la evaluación; falta confirmar el
  pago, la muestra o las dos) y `/ocp/en-evaluacion` (nota 3: pagados y recibidos — En Fila, los baches, el veredicto y el
  reembolso). Es UNA carga y UN componente con dos vistas (`nominados/CircuitoVista.tsx`), no dos páginas copiadas. La URL vieja
  es un 308 a la primera (54 rutas en `rutasMovidas.ts`). **Ninguna Server Action ni regla cambió.**
- **Cambiado**: ⚠️ **los baches de sondeo siguen en pantalla, a propósito.** El plan (D5) los saca, pero `recordEvaluationVerdict`
  EXIGE hoy que el lote esté en un bache en estado «registro»: quitarlos sin cambiar esa regla dejaría a la casa sin poder
  evaluar un solo lote. Salen con la fase 4b.
- **Retirado**: **«Panel» sale del rail** del BCP, el OCP y la LCP (la página sigue siendo donde aterriza el conmutador de
  consolas; el ECP conserva el suyo porque ES una entrada del cuadro: el Tablero de Ejecución). **«Fichas Técnicas» sale del
  rail**: se abre desde «Lotes en Evaluación», que es donde se usa. Y las cuatro pestañas repetidas en todas las páginas del
  catálogo se reducen a las que el rail NO tiene: Subastas Tyrian bajo «Catálogo Activo», Humedad bajo «Ofertas CP Aceptadas».
- **Añadido**: **«Gestión de Muestras» y «CTCx Selection · Compras» entran al rail sin módulo**, por decisión del owner (invierte
  la D9 del plan para este grupo). Sus páginas no fingen un tablero vacío: dicen que el módulo no existe, qué hay hoy, qué se
  construiría primero y las cinco preguntas que lo bloquean — las de su brief.
- **Docs**: charter `consolas`, `ALINEACION` §3, `AGENTS.md`, el recuadro de la fase 4 en `OVERHAUL_CONSOLAS_PLAN.md` y los dos
  briefs de Stock Físico.

## [V5.62] — 2026-09-19 (commit eaea06c)

- **Añadido**: **el estado de un lote en el circuito nuevo, DERIVADO** — fase 4a del overhaul (notas 2–5 del owner). El camino
  *a evaluar → en evaluación → evaluado, pendiente de oferta → catálogo activo* no es una columna: sale de datos que ya
  existen —la inscripción y su pago, el recibo de la muestra, el grado, la última oferta, el contrato—. `src/lib/ocp/circuito.ts`
  es una función PURA que lo lee y lo dice, con **lo que falta** para el paso siguiente («confirmar el pago», «recibir la
  muestra», «confirmar el grado y emitir la oferta»…). No escribe nada y no cambia ninguna regla.
- **Añadido**: la tabla `/ocp/kr` gana la columna **Circuito** y su filtro. Sobre los datos de hoy dice lo que es verdad: 14
  lotes en ficha y 1 en catálogo activo (no hay ninguna inscripción todavía, y hay un trato vivo).
- **Añadido**: `qa-circuito-check` (31; el guardián n.º 60). Su tabla de verdad está escrita **desde las notas del owner**, no
  desde el módulo, y exige dos propiedades que importan cuando dos superficies van a leer el mismo estado: que sea **TOTAL**
  (las 13.440 combinaciones de entradas dan un estado conocido) y **MONÓTONA** (confirmar un pago, recibir una muestra, poner
  un grado, emitir o aceptar una oferta nunca hacen RETROCEDER a un lote). Probado haciéndolo morder dos veces.
- **Cambiado**: «Oferta emitida» es un estado que las notas no nombran y que hace falta: entre que CTCx oferta y el productor
  acepta, el lote está en algún sitio. Y una oferta rechazada, retirada o expirada devuelve el lote a «pendiente de oferta»,
  diciendo por qué.
- **Docs**: ⚠️ **la fase 4 se partió en dos, y la 4b está PARADA a propósito.** `OVERHAUL_CONSOLAS_PLAN.md` lo explica: (1) el
  plan tenía un problema de ORDEN — el *guard* «no se acepta una oferta sin disponibilidad declarada ni términos» es de la fase
  4, pero la pantalla del productor que los envía es de la fase 5, bloqueada por las cuentas `prueba-*`: desplegado en ese
  orden, **ningún productor podría aceptar una oferta**; (2) la 4b reemplaza `/ocp/nominados` por cuatro pantallas sin que nadie
  haya visto todavía la de la fase 3; (3) toca dinero —la escalera de liberaciones y el reembolso del 80 %— sobre un contrato
  vivo. Charter `consolas`, `ALINEACION` §3 (para `kaffetal-regal`: ese estado se IMPORTA, no se recalcula) y `AGENTS.md`.

## [V5.61] — 2026-09-19 (commit dd3b734)

- **Hito**: **Productores, Fincas y Lotes son UNA tabla: `/ocp/kr`** — fase 3 del overhaul de las consolas (nota 1 del owner).
  Tres módulos con tres tableros, tres mapas a medias y tres modales pasan a ser una pantalla navegable en cualquier dirección:
  del lote a su finca, de la finca a su productor, y de vuelta.
- **Añadido**: **la tabla de grano LOTE.** Cada fila es un lote con su finca y su productor al lado; **la finca sin lotes y el
  productor sin fincas tienen fila propia** (si no, 18 de los 28 productores de hoy habrían desaparecido de la pantalla — justo
  a los que hay que acompañar). Columnas: Productor · Finca · Lote · **Visa EUDR · Ficha (FT · FT2 · EUDR · Video) · EVA ·
  Muestra · Grado · Oferta CP · Trato**, cada una con enlace a lo que nombra. Búsqueda libre; filtros por país, departamento,
  grado y rango de temporadas; filtros rápidos **Galardonados · Sin finca · Sin lote**; agrupable por productor o por finca.
- **Añadido**: **el mapa se conserva, y por fin dice lo mismo que la tabla.** Es una segunda vista de LA MISMA carga con LOS
  MISMOS filtros: un pin por finca (color = su Visa) y uno por lote (color = su grado) sobre ella, agrupados por cercanía, con
  el dial de temporadas de dos perillas. Antes el mapa de Fincas no filtraba por temporada y el de Lotes solo enseñaba los que
  iban camino de la Arena.
- **Añadido**: **la vista completa** — `?lote=` · `?finca=` · `?productor=` — con protagonista **Lote → Finca → Productor** y
  migas para saltar entre los tres. Monta como secciones de UNA página lo que eran tres modales: la checklist de la EVA con
  su veredicto, el recibo de la muestra, la DDS y reabrir un No apto; el veredicto de la Visa con el editor EUDR, las
  parcelas y los certificados; y el panel del productor con sus seis pestañas. Lee SOLO lo que se abre: la página de
  Productores leía los perfiles, fincas, lotes, inscripciones, contratos y notas de todos para pintar un tablero.
- **Cambiado**: **las tres páginas no se reescribieron: se convirtieron** en esas tres secciones (con `git mv`, conservando su
  historia). **Ninguna Server Action cambió**, ni sus reglas, ni lo que ve el productor.
- **Retirado**: **Galardonados deja de ser módulo**: es el filtro «Galardonados» de la tabla (D4 del plan). Se retiran también
  `FincaModalRow`, `ProductoresBoard` y `FincasViewSwitch`; de `LotesViews` sobreviven el dial de temporadas y dos botones.
- **Corregido**: **la etapa de un lote se rotulaba de tres maneras.** `ficha_completa` era «En evaluación (EVA)» en Productores,
  «Ficha enviada» en Fincas y «En EVA» en Lotes. Una fuente: `src/lib/ocp/etapas.ts`. Y el constructor de los campos de la
  Visa EUDR —quince columnas, escritas dos veces— pasa a `src/lib/ocp/fincaEudr.ts`: un campo olvidado en una copia no falla,
  deja la Visa clavada en «en revisión» para todo el mundo. `qa-visa-check` (36) lo vigila ahora en un sitio, y exige que el
  SELECT de quien lo usa pida `status` y `eudr_cert_shared` (probado haciéndolo morder).
- **Corregido**: dos enlaces del Panel llevaban meses mandando a Fincas un `?status=pending_review` **que ninguna página leía**.
  Las tareas enlazan ahora por parámetro a la vista completa de SU finca o SU lote.
- **Cambiado**: cuatro rutas se mudan a una — `/ocp/productores`, `/ocp/fincas`, `/ocp/lotes`, `/ocp/galardonados` → `/ocp/kr` —
  y las cuatro `/bcp/…` de la V4.24 que apuntaban a ellas se reapuntaron (53 rutas en `rutasMovidas.ts`, todas en un salto).
  Es la primera mudanza «muchas a una»: las sub-rutas viajan pegadas al destino, así que **el dossier y el KML de la Visa se
  mudaron a `/ocp/kr/<id>/…`** para que las URLs `/ocp/fincas/<id>/dossier` impresas en correos y expedientes sigan abriendo.
  Un ancla (`#lot-…`) no viaja en un 308 —el servidor ni la ve—: la traduce la página nueva al llegar.
- **Docs**: charter `consolas` (el mapa de código de `kr/` y de `src/lib/ocp/`; lo que la fase dejó abierto) y `kaffetal-regal`;
  `ALINEACION` §3; `AGENTS.md`; `OVERHAUL_CONSOLAS_PLAN.md`, con lo que cambió al ejecutarla.
  ⚠️ **Nadie ha visto la pantalla pintada**: las consolas no se conducen en navegador (OTP real). Se verificó por `tsc`,
  `eslint`, build, guardianes y SQL — las 41 columnas que piden sus consultas existen, y la lógica de filas replicada en SQL
  da 35 (15 lotes + 2 fincas sin lote + 18 productores sin nada). Queda como pendiente del owner en el charter.

## [V5.60] — 2026-09-19 (commit 257c42d)

- **Hito**: **el nuevo reparto BCP ↔ ECP** — fase 2 del overhaul de las consolas (`docs/OVERHAUL_CONSOLAS_PLAN.md`), según el
  cuadro del owner. El **BCP** es *lo que la casa ES*: «Ecosistema de Valor» —el tablero de cada plataforma de la red— y
  «Configuración del Sistema». El **ECP** es *con qué decide y qué tiene pendiente*: «Herramientas Internas», agrupadas por
  modelo, y el Tablero de Ejecución.
- **Cambiado**: **dieciséis módulos cambian de consola.** Al BCP: Herramientas del Café, Directorio, Coffeed, CTC Tech,
  Varietales, Terratalento y Manejo de Plataformas (del ECP), y **Kaffetal Regal Arena con su Club** (del OCP). Al ECP:
  Direccionamiento, el Modelo Económico (`/ecp/pvc`), los tres cotizadores, las anclas de mercado y Automatizaciones. «Socios
  de la red» deja de ser grupo aparte y entra en Configuración. Todas las URLs viejas siguen vivas como **308 en un salto**
  (49 rutas en `rutasMovidas.ts`).
- **Cambiado**: **nueve de las dieciséis son viajes de vuelta**, y un viaje de vuelta no se escribe como una mudanza: la página
  real vuelve a una URL que era un talón. Se borraron nueve talones (chocarían con la página), sus nueve entradas (la vieja y
  la inversa juntas son un bucle) y se reapuntó lo que apuntaba a la casa que se deja: las cuatro `/ocp/cotizador-*|anclas`,
  `/ecp/grados` y las dos de la pestaña que dejó el rename de la V5.45. `/ecp/direccionamiento/{plataformas,modelo-economico}`
  pasan a talón EXPLÍCITO: su padre volvió a ser una página real. Los cotizadores habían salido del ECP esa misma tarde (V5.56).
- **Añadido**: **el Tablero de Ejecución** (`/ecp`). El Panel del ECP era un índice con cuatro casillas de módulos por
  construir; ahora enseña **lo que la casa tiene pendiente en las cuatro consolas**, agrupado por la consola dueña. Nada se
  escribe a mano: cada tarea se DEDUCE de un estado que pide a alguien (un lead sin responder, una finca por revisar, un mensaje
  de productor, una humedad fuera de rango, un lote en fila para la Arena) y enlaza a su elemento. El motor nació dentro del
  Panel del OCP y se generalizó: `src/lib/panel/tareas.ts` (puro) + `tareasCarga.ts`. El Panel del OCP enseña ya solo las suyas.
- **Corregido**: **marcar una tarea no refrescaba nada, y a quien no tenía permiso la casilla le mentía.** `setTaskState`
  revalidaba `/bcp` — la casa de la que el Panel se fue en la V4.24. Ahora revalida el Panel de cada consola que enseña la
  tarea. Y devolvía el rechazo, pero `PanelTasks` lo ignoraba: la casilla se quedaba marcada en pantalla y desmarcada en la
  base. Ahora deshace y lo dice. Qué consolas pueden marcarla sale de la CLAVE de la tarea (su dueña y el ECP), no del cliente.
- **Seguridad**: **las compuertas de Coffeed leen su consola del rail.** `coffeedGate` y `studioGate` llevaban `"ecp"` escrito
  dentro — un permiso sin barras, de los que ninguna mudanza de rutas toca. Ahora llaman a `consolaDelModulo("coffeed")`, y si
  nadie enlaza Coffeed en el rail, **cierran**. Las 17 compuertas de cotizadores/anclas/integraciones volvieron a `"ecp"` (una
  línea por módulo, gracias a la V5.56); PVC a `"ecp"`; herramientas, directorio, plataformas, Arena y Club a `"bcp"`; las dos
  listas de espera compartidas a `["lcp","bcp"]` / `["bcp","lcp"]`. `qa-rutas-consolas` (468) lo contrastó todo con el rail.
- **Cambiado**: **la Arena vive en el BCP, pero no se despega limpia del OCP.** Su página asigna lotes a sesiones, invita a la
  vitrina y revisa reclamos: tres acciones del circuito del lote, que abren ahora las DOS consolas (`["ocp","bcp"]`), con dos
  componentes importados del árbol del OCP por ruta absoluta. Queda anotado en el charter: la fase 4 decide.
- **Cambiado**: **lo que sirve a varias consolas sale del árbol del OCP**: `ActionForm`, `PanelTasks` y `tareasActions`
  (antes `dashboardActions`) viven en `src/components/panel/`.
- **Corregido**: **el diagrama de `/bcp/documentacion` llevaba un mes pintando una casa que ya no existía.** «Dentro del
  Control Panel» era un SVG con cada caja escrita a mano como «espejo del menú»: seguía dibujando el reparto de antes de la
  V4.24, con tres consolas. Ya no se dibuja: **se genera del rail**, y en el diagrama de la red la consola que recibe cada
  formulario se lee también de ahí. Una consola o un módulo nuevo aparecen solos.
- **Cambiado**: el Panel del BCP es el índice del Ecosistema de Valor y la Configuración; **conserva los KPI del Modelo
  Económico** (son las cifras del negocio) aunque el módulo viva en el ECP. Títulos de pestaña, cabeceras y mensajes de las
  páginas mudadas dicen su consola de hoy. El rail **no promete lo que no hay** (D9): «Seguimiento de Temas» y «Plataformas de
  Pagos» no entraron.
- **Docs**: charters `consolas`, `herramientas-internas` (vive en el ECP), `coffeed`, `directorio`, `herramientas-cafe`,
  `terratalento`, `ctc-tech`, `varietales`, `kaffetal-regal`, `socios`, `cherry-picked`; `ALINEACION` §1 (vocabulario) y §3;
  `AGENTS.md`; `BCP_USER_ADMIN_PLAN.md`; nota de cabecera en `PVC_BCP_PLAN.md`; `OVERHAUL_CONSOLAS_PLAN.md` — fase 2 marcada
  como ejecutada, con las siete cosas que cambiaron al ejecutarla; `KICKOFF` recompilado.

## [V5.59] — 2026-09-19 (commit cfb0808)

- **Hito**: **nace la LCP · Lead Control Panel — *Relationship*, la cuarta consola.** Fase 1 del overhaul aprobado por el
  owner (`docs/OVERHAUL_CONSOLAS_PLAN.md`). La LCP es la consola de **lo que entra de fuera y a quién se le responde**: no
  decide precios ni mueve lotes. Mismo login maestro, mismo conmutador, su tarjeta en `/panel` y su línea en la puerta
  pública (ES · EN · DE).
- **Cambiado**: **siete rutas se mudan a la LCP.** Del ECP: `/ecp/buzon` → `/lcp/buzon`, `/ecp/leads` → `/lcp/leads`,
  `/ecp/ctc-home` → `/lcp/lista-espera`. Del OCP: `/ocp/crm/{caas,green,roast,x}` → `/lcp/crm/…` (el grupo «OCP · Cherry
  Picked» desaparece del rail). Las siete URLs viejas siguen vivas como **308 en un salto**; `/bcp/caas` y `/ocp/leads`, que
  apuntaban a rutas que hoy se mudan, se **reapuntaron** (42 rutas en `rutasMovidas.ts`; regla F2: jamás un talón contra otro).
- **Añadido**: **«Lista de espera» reúne todas las listas de la red.** Era solo la de la portada; ahora enseña, con un filtro
  que dice cuántos quedan sin contactar en cada una, las cinco fuentes de `newsletter_subscribers` (CTC Home, Roast, X,
  Directorio, Herramientas) y la lista de Terratalento, que tiene tabla propia. No sustituye a los tableros que cada lista
  tiene junto a lo suyo: es el mismo componente leyendo la misma tabla — marcar a alguien aquí lo marca allá.
- **Seguridad**: **la consola que administra un lead ya no se escribe a mano, y su compuerta fina mira el NIVEL.**
  `leadsActions.ts` tenía un mapa `PILLAR_CONSOLE` —permisos sin barras, invisibles a toda reescritura de rutas— que se quedó
  atrás en dos mudanzas. Desapareció: `src/lib/panel/leadsPilares.ts` guarda UN mapa, pilar → ruta del tablero, y la consola
  se deduce de su primer segmento. Y la compuerta fina (`requireLeadConsole`) solo comprobaba el GRANT, no el nivel: un
  colaborador «admin» en una consola y «viewer» en la dueña del lead podía responderlo. Ahora pide nivel `emite` en la
  consola dueña, y **devuelve** el rechazo en vez de lanzar. Sin daño: las tres credenciales tienen el mismo nivel en todas.
  De paso se cura el doble grant que pedía CaaS (ECP para entrar a la acción + OCP por el pilar): ahora es solo LCP.
- **Cambiado**: **lo que sirve a dos consolas no cuelga del árbol de ninguna.** `leadsActions.ts` y `LeadModalRow.tsx` pasan a
  `src/components/panel/` (los usan la LCP y los tableros de CTC Tech y Varietales del ECP). Las compuertas del Buzón y del
  CRM CP Green pasan a `"lcp"`; la de las listas de espera a `["lcp","ecp"]`; la de Terratalento a `["ecp","lcp"]`.
- **Cambiado**: **la lista de consolas tiene una sola fuente.** `qa-rutas-consolas` y `qa-niveles` tenían `bcp|ecp|ocp`
  escrito a mano nueve veces; ahora leen `CONSOLE_ORDER`, igual que `/panel`, el conmutador y la pantalla de credenciales
  (cuyo mapa de niveles vacío también se deriva). `/panel` pasa a una rejilla que acepta cuatro tarjetas; `robots.txt` cierra `/lcp`.
- **Añadido**: `qa-rutas-consolas` (431) aprende dos cosas. **La compuerta en ARRAY**: hasta hoy era invisible para él, y por
  eso la lista de espera compartida «no entraba en el mapa» — nadie la vigilaba. Ahora las consolas esperadas se deducen del
  rail (`rail` + `tambien`) y la compuerta tiene que nombrar exactamente ese conjunto. **(g) los pilares de leads**: cada
  tablero es un enlace real del rail de su consola, y `leadsActions` no vuelve a escribir una consola a mano. Las tres
  comprobaciones se probaron haciéndolas morder. `qa-crm-interes` (63) exige que la lista reunida enseñe TODA fuente de
  `SOURCES`, y deja de dar por buena la compuerta por una palabra que estaba en la ruta del `import`. `qa-nav` (22) cubre el
  primer grupo anidado del rail (`/lcp/crm/…`).
- **Datos**: `panel_users.consoles` gana `lcp` en las tres credenciales — el owner `admin`, los dos colaboradores `viewer`,
  igual que en las otras tres (D2 del plan, con permiso explícito del owner). Comprobado por SQL antes del push: nadie con
  `ecp` u `ocp` y sin `lcp`.
- **Docs**: charter `consolas` (cuatro consolas; fases que quedan), `ctc-tech`, `varietales`, `cherry-picked`; `ALINEACION`
  §1 (vocabulario: LCP = *Relationship*) y §3; `AGENTS.md`; `BCP_USER_ADMIN_PLAN.md` (la columna «Módulo» de la lista blanca);
  `OVERHAUL_CONSOLAS_PLAN.md` — fase 1 marcada como ejecutada, **con lo que cambió al ejecutarla**: el color (el azul acero
  propuesto no se distinguía del OCP; quedó el carmesí corporativo aclarado), y las cinco decisiones de diseño de arriba.
  **Pendiente a propósito**: el diagrama «espejo del menú» de `/bcp/documentacion` sigue dibujando tres consolas; se
  redibuja una vez, al cerrar la fase 2.

## [V5.58] — 2026-09-19 (commit 8fa0441)

> **Wrap V45** (2026-09-19): ciclo compilado en `Documentacion_Interactiva_V45.0(55c8aaa).html` — 40 nodos · 148 fichas (+2: `nivelesconsola`, `guardianespejo`) · 59 trazas (+1) · 95 wires · 36 CTX (+1) · 389 ANN (+8). Primer wrap llamado desde su vía, y fase 0 del overhaul de las consolas: es la foto del ANTES.

- **Seguridad**: **el Buzón se le escapó a la V5.57: un «viewer» podía responder correos.** Cuatro acciones de
  `src/app/ecp/(app)/buzonActions.ts` —`sendBuzonReply`, `setBuzonStatus`, `setBuzonTags`, `markInboundEmailRead`— no llaman
  a `requireActiveAdmin()`: llaman a un AYUDANTE (`loadIfAllowed` → `buzonIdentity`) que la llama. El inventario de la V5.57
  y su guardián miraban la llamada a la vista, función por función, y un ayudante que no escribe pasa limpio. Lo destapó el
  mapa que se hizo para planificar la cuarta consola (LCP), horas después. **Sin daño**: `buzon_outbound` tiene cero filas —
  nadie ha enviado nunca una respuesta desde el Buzón.
- **Corregido**: responder o reenviar un correo y archivarlo o borrarlo (que lo mueve también en el buzón remoto) exigen
  nivel **admin** del ECP. Etiquetar y marcar leído/no leído entran en la lista blanca de **borradores** —son orden interno
  y reversible, y sin lo segundo un viewer fallaría en silencio al abrir su propio correo—: la lista pasa de 12 a **14**,
  primero en `BCP_USER_ADMIN_PLAN.md` y después en el código, como manda la regla.
- **Añadido**: `qa-niveles-check` (35 → **36**) **sigue la cadena de ayudantes** dentro de cada archivo: toda función
  exportada que llegue a la compuerta vieja —directa o por ayudantes— y escriba tiene que pasar además por una compuerta
  que mire el nivel. Probado mordiendo: quitarle la compuerta a `sendBuzonReply` lo pone rojo. Es la única familia de
  compuerta indirecta del repo (comprobado: el otro caso, `revealSessionIdentities`, solo lee).

## [V5.57] — 2026-09-19 (commit 66cb351)

- **Seguridad**: **el nivel «viewer» de un colaborador por fin se hace cumplir.** `panel_users.consoles` guarda desde el
  2026-07-15 un nivel por consola —`admin` o `viewer`— y durante dos meses **ningún código lo leyó**: `grantedConsoles()`
  solo preguntaba si la consola estaba concedida (`Boolean("viewer")` es tan verdadero como `Boolean("admin")`), y las
  compuertas se conformaban. `requireActiveAdmin()` —detrás de **124 acciones**, casi todo el OCP— no miraba ni la consola.
  Un «viewer» podía emitir una oferta, firmar un contrato, publicar un lote o adjudicar una subasta. **Lo destapó la
  auditoría del nodo final, no un incidente**: los dos colaboradores «viewer» llevaban desde el 20 de julio sin escribir
  nada (siete acciones en total, todas de sus días de alta).
- **Añadido**: **la regla**, decidida por el owner (cierra la pregunta abierta n.º 2 de `BCP_USER_ADMIN_PLAN.md`): dos
  niveles bastan, pero el de abajo no es «solo mirar» — es **leer y preparar borradores**. Toda acción del servidor declara
  su **clase** —`lectura` · `borrador` · `emite`— y la clase decide el nivel: un viewer pasa las dos primeras. Vive en
  `src/lib/panel/niveles.ts` (puro) y su FUENTE es la sección nueva «Niveles por consola» del plan.
- **Añadido**: `permisoDeEscritura(consola, clase)` — la compuerta de las 124 acciones que nacieron detrás de
  `requireActiveAdmin()`. **Lanza** solo cuando no hay sesión (inalcanzable desde una pantalla legítima) y **devuelve**
  `{ ok:false, error }` cuando lo que falta es nivel: un viewer pulsando un botón ve un mensaje que dice qué pasó y a
  quién pedírselo, y la página no se cae. `requireConsoleWrite`, `coffeedGate` y `studioGate` ganan el mismo argumento.
- **Seguridad**: **fallo CERRADO.** La clase por defecto de las cuatro compuertas es `emite`: una acción nueva que olvide
  declararse queda cerrada al viewer, no abierta. De 228 acciones, **174 exigen nivel admin**, 42 son lectura y **12 son
  borradores**, en una lista blanca corta: las cinco de una cotización sin emitir, rotular una transcripción (2), guardar
  una propuesta del Mapa de Trabajo, la casilla de una tarea, la etapa manual del CRM y las dos marcas de «ya le escribí».
- **Corregido**: `logProducerComm` —la nota sobre un productor— parecía un borrador y **no lo es: el productor la ve** en
  su panel. Salió de la lista blanca al revisar los formularios, y el plan lo deja escrito para que nadie lo «arregle».
- **Cambiado**: siete acciones atadas a `<form action>` devolvían `void` y no tenían cómo mostrar un rechazo
  (`createHarvestSeason`, `createArenaSession`, `recordHumidityReading`, `markReconditioning`, `resolveReconditioning`,
  `createLot`, `logProducerComm`): devuelven `ActionResult` y sus ocho formularios pasan al `ActionForm` de la casa.
- **Añadido**: el rail de la consola dice **«Lectura y borradores»** bajo el nombre de un viewer, y `/bcp/usuarios`
  explica qué hace cada nivel al concederlo («Viewer — lee y prepara borradores»). Los botones siguen visibles: esconderlos
  es una tanda por consola, posterior. Quince mensajes «Tu sesión no está activa» dicen ahora la verdad para los dos casos.
- **Añadido**: guardián **`qa-niveles-check.mjs`** (35) — **lee la regla y la lista blanca DEL PLAN**, no del código, y
  exige que `niveles.ts` y las llamadas digan lo mismo; que las cuatro compuertas miren el nivel y cierren por defecto; que
  detrás de `requireActiveAdmin()` a secas no quede nada que escriba; y que ningún borrador exista sin estar antes en el
  plan. Probado mordiendo: marcar `emitOffer` como borrador lo pone rojo.
- **Cambiado**: `qa-rutas-consolas` (341 → **365**) entiende las compuertas con clase y `permisoDeEscritura("ocp", …)`, y
  declara cuatro módulos de `src/lib/` que ahora nombran su consola; `qa-fichas`, `qa-redaccion` y `qa-subastas` afirman
  que sus acciones exigen nivel admin, no solo que tienen compuerta.
- **Datos**: ninguno. Los dos colaboradores se quedan como `viewer` en las tres consolas (decisión del owner) y pasan a
  leer y preparar borradores en cuanto despliega; comprobado por SQL que ningún nivel guardado es inválido.

## [V5.56] — 2026-09-19 (commit 867a4b5)

- **Hito**: **«BCP · Herramientas Internas» recibe sus piezas: los tres cotizadores y las anclas de mercado dejan el ECP.**
  Ejecuta `docs/MUDANZA_HERRAMIENTAS_INTERNAS_PLAN.md` entero (tandas A y B; el owner aprobó las cinco decisiones tal como
  se recomendaban). Es la **segunda** mudanza de estos módulos (OCP → ECP en la V4.26): las cuatro entradas `/ocp/…` de
  `rutasMovidas.ts` se **reapuntaron** al BCP —regla F2, jamás un talón contra otro— y nacen las cuatro `/ecp/… → /bcp/…`
  con sus talones 308. `qa-rutas-consolas`: 29 → **35** rutas mudadas.
- **Seguridad**: **`qa-rutas-consolas` aprende a mirar `src/lib/` — y caza una compuerta viva.** La comprobación (f) solo
  veía `src/app/<consola>/`, y las Server Actions de media casa viven en `src/lib/<módulo>/actions.ts`, donde la consola es
  un identificador que ninguna mudanza de rutas toca. La nueva **(f-bis)** declara qué entrada del rail sirve a cada módulo
  y exige que todas sus compuertas (y sus `revalidatePath`) sean de ESA consola — **la consola esperada sale del rail, no
  del módulo** — y que ningún módulo con compuerta quede sin declarar. El día que se escribió encontró dos cosas:
  **Automatizaciones** llevaba desde la V4.25 en `/bcp/automatizaciones` con sus seis acciones pidiendo
  `requireConsoleWrite("ecp")` (no le fallaba a nadie: el owner tiene las tres consolas; le habría fallado al primer
  colaborador con grant solo de BCP), y `src/lib/coffeed/studioGate.ts`, una compuerta que nadie tenía en la lista. 264 →
  **341** comprobaciones.
- **Corregido**: `src/lib/integraciones/actions.ts` — las seis compuertas de Automatizaciones pasan a la consola donde
  vive su pantalla (`CONSOLA = "bcp"`), y el mensaje «Tu sesión del ECP no está activa» dice BCP.
- **Cambiado**: las **17 compuertas de escritura** de `src/lib/cotizador/actions.ts` (13) y `src/lib/anclas/actions.ts` (4)
  ya no llevan la consola escrita a mano: cada módulo la declara UNA vez (`const CONSOLA: PanelConsoleKey = "bcp"`) y (f-bis)
  la contrasta con el rail. Los tres `revalidatePath("/ecp/anclas-mercado")` leen `ANCLAS_PATH`, y los seis `basePath` de las
  páginas y los seis enlaces escritos a mano del costo de empaque leen `QUOTE_BASE_PATH`: la próxima mudanza es una línea.
- **Cambiado**: **el rail** — «BCP · Herramientas Internas» queda ordenado por modelo: Panel · Direccionamiento · Modelo
  Económico · Anclas de mercado · Cotizador de lotes · Costo de empaque · Cotizador logístico (sin `ownerOnly`: quien los
  veía en el ECP los sigue viendo). «ECP · Caja de herramientas» se queda con Transcripciones.
- **Cambiado**: `QuoteDetail.tsx` sale de la carpeta de rutas a `src/components/cotizador/`: dos páginas lo importaban desde
  `@/app/ecp/(app)/cotizador-lotes/[id]/…`, un import de ruta a ruta que la mudanza habría roto.
- **Retirado**: la pestaña vacía **«Modelo Económico» de Direccionamiento** (`/bcp/direccionamiento/modelo-economico`), que
  el rename de la V5.45 dejó atrás: había dos entradas con el mismo nombre en la misma consola. Queda como 308 hacia
  `/bcp/pvc`, y la URL antiquísima del ECP llega en UN salto (entrada propia; `destinoDe()` resuelve por el `de` más largo).
  Su talón es un `page.tsx` a secas —las hermanas de la ruta siguen vivas y un catch-all chocaría—, y el guardián aprendió
  a reconocer esa forma por lo que HACE (fuera de `(app)`, redirigiendo con `destinoDe()`).
- **Cambiado**: los dos «Grados» ya no se llaman igual — en Direccionamiento, «Grados de Calidad · definición vigente»; en
  el Modelo Económico, «Escala de puntos · en validación». Se funden cuando la fase 2 lleve la escala a `definicion.ts`.
- **Corregido**: ocho títulos de página decían «· OCP» y cinco cabeceras de archivo «OCP ·» — dos consolas atrás; y los dos
  módulos respondían «Tu sesión del OCP no está activa». Dicen BCP.
- **Corregido**: el prompt del nodo final pedía correr «TODOS los `qa-*.mjs`», y dos **gastan dinero**:
  `qa-cromatografia-modelo` (API de Anthropic, ≈ US$ 0,013 por corrida × 3) dice en su cabecera que NO es parte de la
  compuerta, y la batería de esta vía lo corrió cinco veces el 2026-09-19 (≈ US$ 0,20–0,35; no escribe en `ai_usage`, así
  que el libro no lo muestra). El prompt y `ALINEACION` §5.3 nombran ahora las excepciones.
- **Docs**: el plan pasa a EJECUTADO; `herramientas-internas.md` y `consolas.md` al día (la mudanza se cierra; queda con
  dueño en `consolas` el nivel `viewer`, que sigue sin hacerse cumplir); línea en `ALINEACION` §3.

## [V5.55] — 2026-09-19 (commit 912d7e5)

- **Hito**: **Herramientas Internas se redefine: es lo que el rail del BCP llamaba «Business Core».** El owner se
  arrepintió de la definición de dos componentes y la cambió: Herramientas Internas deja de ser un cajón de utilidades
  del equipo y pasa a ser **los cinco modelos con los que la casa piensa y fija sus cifras** — **Definición de
  Contexto · Misión y Visión · Modelo Económico (PVC y Grados de Calidad) · Modelo de Procesamiento (de la finca, de CPS
  a verde empacado y embalado) · Modelo de Logística (estimaciones y cotizaciones que definen precios post-FOB, según
  volúmenes y regiones)**. Invierte su propia decisión de esa mañana (V5.53: «el PVC es únicamente del BCP», charter
  `consolas`): el Modelo Económico vuelve a `herramientas-internas`, ahora como pieza central.
- **Cambiado**: el primer grupo del rail del BCP se llama **«BCP · Herramientas Internas»** (antes «BCP · Business
  Core», `src/lib/panel/consoles.ts`). **Solo cambió el nombre: ninguna ruta se movió** — traer `/ecp/cotizador-*` y
  `/ecp/anclas-mercado` al BCP es una mudanza con talones 308 y 14 compuertas de permiso que el owner aplazó.
- **Docs**: `docs/componentes/herramientas-internas.md` **reescrito**: la tabla de los cinco modelos con dónde vive
  HOY cada pieza (dos no tienen módulo: Procesamiento y Logística son piezas sueltas en `lectura.ts`, `canales.ts`, el
  motor y los cotizadores del ECP), sus tablas (`direccionamiento_context`, `pvc_*`, `quotes`, `market_anchors`), sus
  once guardianes, sus reglas («un modelo se EXHIBE antes de GOBERNAR», «un modelo nuevo empieza por un brief») y su
  kick-off — una conversación por MODELO. Recibe de `consolas` los pendientes del PVC (fase 2, refurbish, CN-1, CN-8, la
  mitad de modelo de CN-9) **y el contrato de Grados de `ALINEACION` §1** (`definicion.ts`).
- **Docs**: `docs/componentes/consolas.md` — el BCP de este charter queda en **configuración del sistema y red de
  socios**; suelta Direccionamiento y el Modelo Económico y **recibe el Transcriptor, Stripe y la Herramienta de Guion**
  (con sus tablas `transcripts`/`transcript_workers` y sus dos guardianes). Nace con dueño aquí el pendiente de la mudanza.
- **Docs**: reparto de lo que sobraba, **por modelo** — cotizador logístico → Logística; cotizador de empaque →
  Procesamiento; anclas de mercado y cotizador de lotes → Económico; las pestañas «Grados de Calidad» y «Mercado Global»
  de Direccionamiento → Modelo Económico (Mercado Global es el «Marco de mercado» del plan §11).
- **Docs**: `ALINEACION` — línea en §3, regla nueva en §2 (**Herramientas Internas es el backstage del backstage**), nota
  de lectura y tres filas con dueño nuevo en §3b; `PLAN_NARRATIVA` §1 (CN-1, CN-8, CN-9 cambian de dueño y conservan la
  clave); cabecera de `PVC_BCP_PLAN.md`; `AGENTS.md`; y los kick-offs recompilados (`docs/KICKOFF.{md,html}`).

## [V5.54] — 2026-09-19 (commit 6e90d79)

- **Corregido**: **Sonnet 5 cuesta 2/10 por millón, sin promoción.** `src/lib/ai/precios.ts` lo tenía como base 3/15 con
  un «precio de lanzamiento» 2/10 hasta el 2026-08-31 — la promo no existía: 2/10 ES la tarifa (tabla de modelos de la API,
  verificada el 2026-09-19; lo avisó CommaaS el 2026-09-14 y la auditoría del nodo final le puso dueño). Desde el 1 de
  septiembre cada llamada de Sonnet 5 se habría anotado un 50 % por encima de lo facturado. **No llegó a pasar**: el libro
  no tiene ni una fila de Sonnet 5 entre el 1 y el 19 de septiembre (las cinco que hay son de agosto, a 2/10, comprobado
  por SQL), así que no hay histórico que decidir. De paso entra la tarifa de `claude-fable-5-1` (10/50).
- **Corregido**: **`qa-consumo-check` afirmaba la tarifa equivocada EN VERDE** — «el 2026-09-01 ya va a tarifa plena
  (3 y 15)», «la misma llamada cuesta un 50 % más pasada la promo». Segunda vez en dos versiones que un guardián copia
  la regla del código (la otra: la Base física, V5.53). Ahora afirma 2/10 antes y después del 1 de septiembre, que
  ninguna tarifa declara una promoción, y contrasta siete modelos contra la tabla publicada (20 → **22**).
- **Corregido**: **`qa-transcripciones-nube.mjs` estaba roto** (como muy tarde desde la reorganización de carpetas del 2026-09-11): buscaba su audio de prueba en
  `../reference_html_tools/_whatsapp-transcript-html/…`, carpeta que dejó de existir, y moría con `ENOENT` a mitad de la
  parte pagada. El audio vive en `tools/transcriptor/tests/fixtures/`; la ruta se ancla ahora al script (no al directorio
  desde el que se corre) y su existencia se comprueba en la parte GRATIS. **Corrido de punta a punta**: subió los 43 s,
  AssemblyAI devolvió 6 segmentos y 2 voces, el aviso llegó por webhook y la fila de prueba se borró (19 → **20**).
- **Cambiado**: `ConsumoBoard` — el aviso «Sonnet 5 está a precio de lanzamiento» anunciaba una promo que no existía;
  se queda dormido y despierta solo si `precios.ts` vuelve a declarar una. `docs/CLAVES_IA_Y_COSTE.md` deja de decir que
  el capítulo con Sonnet cuesta «~$0.016 desde el 01/09».
- **Cambiado**: **`docs/KICKOFF.html`** — **«Copiar prompt» copia primero por el camino síncrono**, dentro del clic, que
  es lo único que un marco aislado como el visor de artefactos acepta siempre (la API moderna del portapapeles puede
  estar vetada ahí y antes iba primero); probado con la API bloqueada y un clic real. El prompt de la ficha **se reescribe
  en vivo** al teclear en «Hoy:», así que lo que se ve es lo que se copia — también en el último recurso, que selecciona
  el texto para Ctrl+C. Los enlaces internos se resuelven a mano, por si el visor no navega a un «#ancla».
- **Añadido**: **botón «↑ Arriba»** arriba a la derecha de cada una de las 18 fichas del KICKOFF (44 px, vuelve al
  inicio —al índice, en el teléfono— y deja el foco allí).
- **Docs**: cerradas las dos filas de `ALINEACION` §3b (`precios.ts`, el guardián de transcripciones) y los pendientes
  (b) y (c) de la auditoría en `consolas.md`; `herramientas-internas.md` deja de anunciar el guardián como roto.

## [V5.53] — 2026-09-19 (commit a53a27d)

- **Hito**: **el nodo final estrena oficio, y el owner cierra cinco decisiones en un día.** La conversación
  «WRAP-COMMIT-PUSH (CTC Platforms)» —la vía de los wraps que `ALINEACION` §5.3 nombraba y nunca existió— auditó por
  primera vez que el maestro y los charters estuvieran en el mismo punto (`d563a44`, solo docs). No lo estaban. De lo que
  encontró, el owner decidió el mismo día: **(1)** el Modelo Económico (PVC) es **únicamente del BCP**; **(2)** los
  métodos de pago serán **Nequi Y Zulu, los dos**, a configurar más adelante; **(3)** la regla de la mezcla, reconciliada
  en todos lados; **(4)** las sesiones de componente siguen empujando su tanda y esta vía es el cierre; **(5)** un
  documento nuevo con todos los prompts de arranque.
- **Corregido**: **la Base física estaba implementada AL REVÉS de lo decidido.** `src/lib/pvc/escala.ts` exigía
  `factor > 94` («mayor que 94») cuando el owner fijó **≤ 94, y un Black hasta 98** (`PVC_BCP_PLAN.md` §14 n.º 9): el
  factor de rendimiento son los kilos de pergamino por 70 kg de excelso, y más bajo es mejor. El tablero publicado
  siempre lo dijo bien. `revisarBaseFisica(b, banda)` recibe ahora el grado que el lote llevaría, y nacen
  `FACTOR_MAXIMO`, `FACTOR_MAXIMO_BLACK` y `factorMaximoDe`. La calculadora de BCP · Grados arranca en 92,8 (la base
  de la FNC) en vez de en un 95 que ya no cumple. Hoy solo lo lee esa pantalla; es la puerta que el veredicto heredará.
- **Corregido**: **`qa-pvc-escala` afirmaba la regla invertida EN VERDE** («factor 95 cumple · 93 no cumple»). Un
  guardián que copia la regla del código no verifica nada: ahora la toma del plan — 93 y 94 cumplen, 95 no, 95 sí en
  Black, 98 sí y 98,5 no, y el tope de Black no vale para un Red (63 → **68** comprobaciones).
- **Cambiado**: **la regla de la mezcla** (`src/lib/pvc/lectura.ts`), precisada por el owner. **Black** es un blend de
  3 a 4 **orígenes y/o variedades**; **Red** es **siempre de una sola variedad** —una mezcla regional—; y los 3 o 4
  están **anclados a la compra mínima a cada productor involucrado: una carga**. Sale la fila «2 lotes → 4 cargas»: una
  mezcla de dos ya no existe. Nacen `CARGAS_POR_PRODUCTOR` y `COMPOSICION_MEZCLA`; `MOQ_MEZCLA` se DERIVA
  (`n × CARGAS_POR_PRODUCTOR`) en vez de escribirse a mano. `LecturaBoard` y `EscalaBoard` lo dicen así;
  `qa-pvc-lectura` 59 → **67** (cuatro de ellas leen el PLAN: la regla escrita y la del código tienen que ser la misma).
- **Docs**: la mezcla, **reconciliada en todos lados** — `PVC_BCP_PLAN.md` §9.2 (tabla sin la fila de dos), §12 (el
  «4 · 3 · 2 · 1 · ½, fijos»), §14.4 (la tabla traía «Black 4 · Red 3» fijos; ahora son dos filas que valen para los dos
  grados) y §14.7 n.º 28; `ALINEACION` §3b; el plan de narrativa (CN-1, CP-1); `consolas.md`, `cherry-picked.md`,
  `kaffetal-regal.md` y el brief del guion del productor, que llevaba el 🟡 «consolas reconcilia».
- **Docs**: **el Modelo Económico es solo del BCP.** `consolas.md` gana sus tablas (`pvc_*`, `public_pvc_current`,
  `public_pvc_next`), su mapa de código, sus **siete guardianes** (`qa-pvc-{motor,tablero,vigencia,lectura,escala,
  canales,compromiso}`) y su regla («cambiar el motor empieza en Python»); `herramientas-internas.md` los suelta — llevaba
  congelado en la fase 1 del PVC desde la V5.29.
- **Docs**: **métodos de pago** — `ALINEACION` §1 deja de tener un «conflicto abierto n.º 2»: Nequi y Zulu se integran
  los dos (Stripe sigue aplazado). Reescritas las dos filas de §3b que se contradecían, el O-3 del plan, y los charters
  de consolas, Kaffetal Regal y Cherry Picked.
- **Añadido**: **`docs/KICKOFF.html`** — el documento nuevo con los **18 prompts de arranque** (los doce componentes,
  el nodo final, plataforma, CommaaS y los tres de «proyecto nuevo»): índice, botón de copiar y un campo «Hoy:» que
  rellena `<la tarea>` antes de copiar. Lo compila el mismo `build_kickoff.py` que ya escribía `KICKOFF.md`, desde
  `docs/componentes/kickoff_plantilla.html`, para que no vuelva a quedarse viejo (el PDF que usaba el owner no traía la
  Secretaría y nombraba una vía que no existía). El **prompt de «WRAP-COMMIT-PUSH»** es nuevo y lleva la auditoría en
  siete pasos.

## [V5.52] — 2026-09-18 (commit 7037ec4)

- **Hito**: **CP-1 · la tienda deja el euro.** El precio de un lote lo calcula el PVC en **dólares**
  (`motor.ts`: `n0 = copc / trm / kg_g`) y la tienda Green tenía el símbolo «€» escrito a mano en seis archivos. El
  2026-09-18, con el primer lote publicado, quedó anunciando **«€31,00/kg» sobre un número en dólares**. Ejecuta la
  decisión del owner de `ALINEACION` §3 (2026-09-17).
- **Añadido**: `src/lib/precios/moneda.ts` — **fuente única** de la moneda de cara al comprador: `MONEDA_TIENDA`
  (USD · «US$») y `MONEDA_SUBASTA` (EUR · «€»), más el formateador `importe()`, que antes se llamaba `eur()` — el
  nombre era la mitad del problema: devolvía un número sin moneda y cada sitio le pegaba el símbolo que le parecía.
- **Cambiado**: catálogo, tarjeta de lote, carrito, envíos, perfil y pedidos, el pack de muestras, la narrativa
  (Transparency Credit, que **no llevaba ninguna moneda**), la landing de Roast y el catálogo del OCP pasan a leer el
  símbolo de esa fuente. Ni un «€» suelto queda en la tienda.
- **Datos**: ⚠️ `cartData()` suma en UN total los kilos, el flete y el pack, así que los tres pasan a dólares con el
  **mismo número**. Para el lote es una corrección (siempre fue USD); para el flete (0,10–0,45/kg) y el pack (300) es
  un **cambio de precio implícito de ~8 %**, hecho con eso sabido: 0 pedidos de lote y 1 pack de prueba el día del
  cambio. Si el owner prefiere convertir en vez de reetiquetar, el sitio es ese archivo y una tasa.
- **Retirado**: a medias y declarado — la **subasta Tyrian sigue en euros** y no es un olvido — `lot_auctions` lleva
  la moneda en el NOMBRE de sus columnas (`precio_salida_eur_kg`, `incremento_eur_kg`), así que cambiarle el símbolo a
  la pantalla sin migrar el esquema sería mentir en la dirección contraria a la que se acaba de corregir. Pasa a US$
  en **CN-4**. Su euro ahora sale de `MONEDA_SUBASTA`, no de un literal: una excepción declarada se ve.
- **Corregido**: en el paquete público del lote, el atributo SCA `sca_cuppers` se rotulaba «Catador» — se lee como un
  nombre y es un **puntaje**. Pasa a «Puntaje del catador» en los tres idiomas.
- **Añadido**: guardián `qa-moneda-check.mjs` (24) — ni un símbolo suelto en la tienda, `eur()` no vuelve, los tres
  sumandos del carrito comparten moneda y el euro de la subasta viene declarado.

> **Wrap V44** (2026-09-19): ciclo compilado en `Documentacion_Interactiva_V44.0(f420ad4).html` — 40 nodos (+1: `n-portal`) · 146 fichas (+6: `portalpublico`, `codigopublico`, `moneda`, `canales`, `compromiso`, `narrativa`) · 58 trazas (+2: `findmylot`, `programas`) · 95 wires (+4) · 35 CTX (+1) · 381 ANN (+19) · FILETREE 3002. Compila V5.46–V5.52 y la narrativa del 17-sep (solo docs).

## [V5.51] — 2026-09-18 (commit 9ed7b28)

- **Cambiado**: la **primera imagen** del CTCx Public Catalogue pasa a ser la **cesta de cerezas** del owner
  («Flavour · Quality · Traceability»). Va entera y sin retocar sobre una placa blanca —`contain`, nunca `cover`:
  recortar un dibujo le corta el asa a la cesta—, y sobre blanco y no sobre el papel del tema, porque es un grabado a
  línea muy claro que sobre gris se apagaría.
- **Corregido**: la foto de la mesa con el café en sus cinco estados **salía boca abajo**. Es una panorámica tomada de
  lado y se había rotado −90° en vez de +90°, así que los platos colgaban de la madera en lugar de apoyarse en ella.
  Rotada bien y reencuadrada: ahora se ven molido, tostado, verde y pergamino sobre la mesa, con las tazas detrás.
- **Cambiado**: la tira «de la finca a la taza» pasa de cuatro pasos a **cinco** — la foto del patio de secado, que
  hasta ahora hacía de hero, bajó a un paso propio («El secado»). De paso la cadena queda completa: el café no salta
  de la cereza al saco.
- **Retirado**: `hero-patio-guacamayo.webp` (su recorte 3:4 ya no se usa; el patio vive ahora en 4:3 como
  `secado-patio-guacamayo.webp`). Nada apunta a él — se comprueba antes de borrar.
- **Añadido**: `qa-catalogo-publico-check.mjs` sube a **119**. La comprobación nueva empareja la tira: las fotos se
  casan con los pies **por índice**, así que una foto de más —o un pie de menos en un idioma— es una página que
  revienta en producción con `undefined`, y los tipos no lo ven porque es un array.

## [V5.50] — 2026-09-18 (commit c438f9f)

- **Hito**: el **CTCx Public Catalogue** se vistió. La portada pasa de una columna de texto a una página con hero
  fotográfico, firma de procedencia, explicación ilustrada y la tira «de la finca a la taza». Las fotos son del
  **archivo propio de CTC** (originales en `reference/ctcx-public-catalogue/`), no de banco de imágenes: la del hero
  lleva el guacamayo de la casa dentro del encuadre, sobre el patio de secado.
- **Añadido**: la **marca del portal** (`MarcaPortal.tsx` + `marca-ctcx-portal.svg`) — una lupa cuyo cristal es el
  grano: el círculo hace de lente y de grano a la vez y la doble curva es la hendidura del café, así que el símbolo
  dice lo que hace la página. Va en línea y hereda `currentColor`, de modo que se pinta con el tema de cada superficie
  sin una imagen por tema.
- **Añadido**: la **firma de procedencia** (`ProcedenciaCTCx.tsx`) — quién es CTC, Kaffetal Regal y Cherry Picked, con
  sus tres logos y una línea cada uno. Es lo que le faltaba a la página: a este portal se llega tecleando un código
  impreso en una bolsa, sin haber visto nunca la marca. No son botones a propósito — es una firma; las puertas siguen
  abajo. La misma firma, en pequeño, cierra el paquete de cada lote.
- **Añadido**: seis fotos optimizadas en `public/images/ctcx-public-catalogue/` (webp, 72–233 KB frente a originales de
  1,5–6,7 MB) y copias ligeras de los tres logos (los de Kaffetal Regal y Cherry Picked pesaban 852 KB y 1,1 MB).
- **Añadido**: tarjeta **Open Graph propia** (`public/images/og/ctcx-public-catalogue.jpg`, 1200×630, 87 KB), que cierra
  el pendiente abierto en la V5.48: hasta ahora el portal prestaba la de la casa matriz, así que compartir un lote por
  WhatsApp enseñaba el logotipo de CTC sin decir a dónde llevaba el enlace. La usan la portada y cada lote.
- **Cambiado**: `catalogoPublico.module.css` reescrita — hero a dos columnas, tarjetas de procedencia de altura
  pareja con los logos alineados, tira de cuatro pasos, y el paquete del lote con cabecera y firma. Ni un color de
  marca escrito a mano: todo sale de los tokens del tema.
- **Añadido**: `qa-catalogo-publico-check.mjs` sube a **115** — comprueba que las dos copias de la marca dibujen lo
  mismo, que la firma muestre los tres logos y no sea una llamada a la acción, que la portada no apunte a
  `reference/` (esa carpeta no va al build) y que ninguna foto ni la tarjeta se pasen de peso.

## [V5.49] — 2026-09-18 (commit e549669)

- **Añadido**: la cinta del **Catálogo Activo** estrena la puerta al portal público — un botón «Buscar mi lote por su
  código» junto al «Ver el catálogo completo» de siempre. Como el módulo está montado en **siete superficies**, el
  botón aparece de una vez en CTC Home, Kaffetal Regal, CaaS y las cuatro landings de la familia Cherry Picked.
- **Cambiado**: el pie de la cinta pasa a ser una fila (`.pie`) con las dos puertas en los extremos — a la izquierda el
  catálogo completo, que vive tras el login; a la derecha el portal público, que no pide nada. En pantalla estrecha se
  apilan alineadas a la izquierda, y el botón mide 44 px de alto (mínimo táctil de la casa).
- **Corregido**: el enlace es **absoluto** a la casa matriz, antes de que doliera. `/ctcx-public-catalogue`
  vive en `RUTAS_SOLO_WWW` y no tiene subdominio, así que un `href` relativo habría funcionado en `www` y dado **404
  en los otros seis hosts** donde está montada la cinta — la misma trampa del proxy que ya se pagó con el botón de la
  ficha técnica.
- **Añadido**: `RUTA_PORTAL` en `src/lib/catalogo/codigoPublico.ts`, para que la ruta del portal se nombre una vez y
  `rutaDelCodigo()` cuelgue de ella. El guardián comprueba que coincida con la del mapa de la red.
- **Añadido**: `qa-catalogo-publico-check.mjs` sube a **85** — vigila que la cinta enlace absoluto, que no teclee la
  ruta a mano, que el botón conserve los 44 px, y que el diccionario de `SneakPeek.tsx` (el que alimenta las siete
  superficies) tenga las tres lenguas completas.

## [V5.48] — 2026-09-18 (commit 5a3121b)

- **Hito**: nace **CTCx Public Catalogue** (`www.ctcexport.com/ctcx-public-catalogue`), el pivote público del lote:
  **«Find my Lot»** resuelve un código corto al paquete público del café, y debajo van la explicación del portal y las
  tres puertas — Kaffetal Regal, Cherry Picked y el «Escríbenos» con su selector de Tema completo. Es la mitad
  delantera de la tanda **CN-7** del plan de narrativa (identificador público del lote → ficha pública).
- **Añadido**: `lots.public_code` — el código corto, único y ALMACENADO del lote (`CTCX-XXXX-XXXX`, alfabeto Crockford
  base32 sin I/L/O/U). Es la **fuente única** que viene a reemplazar los dos códigos derivados y contradictorios que
  convivían: `codigoDeLote(lot_id, grade)` en la cinta y `listingCode(lot_listings.id, grade)` en la tienda Green.
- **Añadido**: `src/lib/catalogo/codigoPublico.ts` (módulo PURO, sin `server-only`) — `normalizaCodigo()` perdona
  minúsculas, guiones, el prefijo y las tres letras ambiguas (O→0, I/L→1), y devuelve la forma canónica o `null`.
- **Añadido**: `/ctcx-public-catalogue` (estática, con su tarjeta y su canonical) y `/ctcx-public-catalogue/[codigo]`
  (dinámica, con canonical y Open Graph POR LOTE). Un código no canónico responde **308** a su forma canónica; un
  código ilegible o sin lote publicado, **404**. Las dos pantallas en ES · EN · DE.
- **Añadido**: `RUTAS_SOLO_WWW` en `src/lib/red/subdominios.ts` — la red aprende que una superficie pública puede no
  ser un subdominio. La leen **los dos** consumidores del mapa: el sitemap (`sitemap.xml/route.ts`) y el tablero de
  ECP · Manejo de Plataformas (`plataformasActions.rutasDeLaRed`), que sin ella habría rechazado la fila y dejado el
  `superficieConOverrides` de la superficie inerte sin fallar.
- **Cambiado**: `publishLot` (OCP · Catálogo) acuña el código público si falta, con el cliente service-role y de forma
  idempotente — despublicar y volver a publicar conserva el código, porque la URL puede estar impresa en una bolsa.
  `/ocp/catalogo` lo muestra en cada publicación.
- **Datos**: migración `lots_codigo_publico` — columna `lots.public_code` (nullable, sin DEFAULT), función
  `public.ctc_public_code()` (`SECURITY INVOKER`, `search_path = ''`, `EXECUTE` revocado a `public`/`anon`/
  `authenticated`), índice único `lots_public_code_key`, y `public_lot_catalog` recreada con `create or replace`
  añadiendo `public_code` al final — nunca `drop + create`, que habría perdido el `grant select` de `anon`.
- **Seguridad**: `guard_lot_protected_columns` gana `public_code`. `lots_update_own` no tiene `WITH CHECK`, así que sin
  esa línea un productor podía escribir cualquier cadena sobre una URL pública o romper un enlace ya compartido.
  Verificado contra la base: el `UPDATE` del productor responde «Estos campos solo puede actualizarlos CTC.» y el
  control (renombrar su lote) sigue permitido. La columna **no lleva DEFAULT** a propósito: los lotes se insertan desde
  el navegador del productor, y un DEFAULT + el REVOKE habría roto «crear lote» en Kaffetal Regal.
- **Seguridad**: queda escrito, en el módulo y en la ruta, que **el código público no es una credencial** —
  `public_lot_catalog` es legible por `anon`, así que el catálogo publicado entero se lee con sus códigos en una sola
  petición. «Find my Lot» es un índice de conveniencia; la compuerta sigue siendo la vista.
- **Añadido**: guardián `qa-catalogo-publico-check.mjs` (76). `qa-ficha-publica-check.mjs` sube a **115**: su §8 pasa de
  vigilar dos puertas al `datasheet` a vigilar **tres**. `qa-guard-check.mjs` gana «producer CANNOT set public_code».
- **Docs**: `ALINEACION.md` §3 y los «Pendientes» de `consolas`, `cherry-picked` y `kaffetal-regal`.

## [V5.47] — 2026-09-16 (commit ea30260)

- **Cambiado**: las **correcciones del CEO** (2026-09-16) entran como `docs/PVC_BCP_PLAN.md` §12 y **priman** sobre lo
  escrito: §9.2, §9.5 y §9.6 quedan marcados SUPERADO. **Cherry Picked solo se entrega DDP** (consolidado a través del
  master roaster); **CaaS** cotiza **FOB Colombia · puerto de destino · DDP** (envío dedicado). Las habilitaciones no son
  intercambiables: **master roaster** (cliente tipo partner) abre Cherry Picked; **regional enablement** (operador
  logístico contratado por CTC) abre el puerto y el DDP de CaaS. **FOB siempre está disponible**.
- **Cambiado**: `src/lib/pvc/canales.ts` reescrito — programas × tramos, `habilitacionRequerida`, `puedeCotizar` y la
  escalera de acceso del comprador `accesoDelComprador` (con master roaster: CP preferido, CaaS segunda opción; solo
  regional enablement: CaaS completo; sin nada: CaaS FOB). El MOQ es **único, en cargas por grado** (Black/Red 3–4,
  Blue 2, Gold/Tyrian 1 o menos según disponibilidad); el empaque es solo presentación. El MOQ en kilos de CaaS se retira.
- **Añadido**: `src/lib/pvc/compromiso.ts` — la **oportunidad Cherry Picked** del productor: escalera de liberación por
  trimestre acumulada (0 · 25 · 50 %) y penalización del **4 %** sobre lo retirado fuera de tramo; `tablaDeSalida`.
- **Añadido**: pestaña Lectura del Modelo Económico — tarjetas «Programas, incoterms y región» y «Oportunidad Cherry
  Picked · la escalera de compromiso» (tabla de salida mes a mes).
- **Cambiado**: la subasta Tyrian puja sobre **FOB puerto Colombia** y se queda en EUR/kg; calendario del PVC por
  trimestres exactos, público, publicado dos meses antes, rige el PVC vigente en la compra.
- **Añadido**: guardianes `qa-pvc-canales.mjs` reescrito (57) y `qa-pvc-compromiso.mjs` nuevo (31).
- **Seguridad**: se retiró del árbol vigente información sensible de acceso hallada en la documentación; la corrección
  real se atiende con el owner fuera del repo. Regla: ningún documento del repo copia credenciales.
- **Docs**: cartas de Cherry Picked, Kaffetal Regal y Herramientas del Café con las decisiones del CEO; `ALINEACION.md`
  §3 y §3b (pendientes del owner: seguridad, auditoría de exposición del repo público, marca Kaffetal ante la SIC,
  preguntas abiertas y brechas del modelo para la v2.2.0).

## [V5.46] — 2026-09-16 (commit ee1383a)

- **Añadido**: la **matriz comercial** del Modelo Económico (`docs/PVC_BCP_PLAN.md` §9.6, lámina del owner) — **dos
  canales × tres tramos de incoterm**, que es lo que faltaba para poder cotizar. **FOB/FCA es el precio base**: no
  depende del destino, **depende del MOQ** — y eso es literal, porque la pila calcula el flete con `fleteKg(moq)` sobre
  escalones de volumen, así que un Black de Cherry Picked (3 cargas ≈ 234 kg) cae en el tramo de 4,2 US$/kg y el mismo
  Black en CaaS (1000 kg) en el de **2,9**. La diferencia entre canales es el camión, no una política comercial.
- **Añadido**: **CIF/CIP y DDP solo se cotizan con habilitación regional**, y es distinta en cada canal — **Master
  Roaster** en Cherry Picked (un tostador de referencia que opera ese mercado con CTCx; ya existía en la casa) y
  **Regional Operation Enablement** en CaaS (el papeleo y el conocimiento propios para esa geografía; concepto nuevo).
  Hasta ahora el motor calculaba `n2`/`n3`/`n4` para cualquier destino y **nada impedía** pintar un DDP a un país donde
  CTCx no tiene con quién entregar.
- **Añadido**: MOQ por canal — Cherry Picked en **cargas equivalentes** (Black y Red 3 o 4 · Blue 2 · Gold 1 · Tyrian ½)
  y CaaS en **kilos** (Black y Red 1000 · Blue 500 · Gold y Tyrian 100), este último **componible con fracciones de
  varios cafés**. El módulo puro `src/lib/pvc/canales.ts` lo encierra junto a `puedeCotizar()`.
- **Añadido**: la pestaña **Lectura** muestra la matriz con los precios reales de la edición y **el escalón de flete en
  el que cae el MOQ de cada canal**, con las casillas condicionadas marcadas.
- **Añadido**: guardián **`scripts/qa-pvc-canales.mjs`** (63) — el mapeo tramo → columna de la pila (fob=n2, cif=n3,
  ddp=n4), que FOB sea el único incondicional, las dos habilitaciones, los MOQ de la lámina, que los dos módulos que
  dicen el MOQ de Cherry Picked no se separen, y que el flete siga bajando con el volumen.
- **Docs**: §9.3 anota que CIF/DDP dependen de la habilitación; §11.1 mete la matriz en la pestaña «MOQ y mermas».
  Quedan **dos preguntas al owner**: si el tercer tramo es DDP o hay que partirlo en DDP y **DAP** (entregado sin
  derechos pagados), y la tensión entre el mínimo estándar de Tyrian (½ carga) y el piso de saco de §9.2 (70 kg).

## [V5.45] — 2026-09-16 (commit 8730d9f)

> **Wrap V43** (2026-09-16): ciclo compilado en `Documentacion_Interactiva_V43.0(4418a67).html` — 39 nodos · 140 fichas (+1: `cromatografia`) · 56 trazas (+3) · 91 wires · 34 CTX · 362 ANN (+22) · FILETREE 2864 archivos. Compila V5.32–V5.45.

- **Añadido**: pestaña **Grados** del Modelo Económico (`/bcp/pvc/grados`) — la escala **«El Punto y la Tríada»**
  (`docs/PVC_BCP_PLAN.md` §9.1) con su **calculadora**: puntaje SCA + las tres letras (variedad · proceso ·
  reconocimiento) → puntos → grado → **lo que ese grado vale hoy** (escalón de la edición vigente, empaque y MOQ). Es
  la primera versión de la herramienta «PVC × grado» del §9.5. Trae la curva de la escala sobre las cinco bandas, la
  **Base física** como puerta previa (factor > 94, humedad 10–12 %, densidad por variedad), la tabla de SCA mínimo por
  tríada y el catálogo semilla de variedades con las tres filas que el owner aún no confirma.
- **Añadido**: `src/lib/pvc/escala.ts` — módulo **puro** con el modelo: `baseSca` sobre las anclas de la gráfica del
  owner, el multiplicador con **K derivada** ((2500/1990 − 1)/6, que es lo que lleva el techo del café común al de la
  escala), las tres puertas y `revisarBaseFisica`.
- **Cambiado**: el módulo se llama **«Modelo Económico»** en el rail del BCP (antes «PVC · Valor de Cosecha»). La
  **ruta sigue siendo `/bcp/pvc`** a propósito: el rename es de nombre, no de sitio.
- **Cambiado**: el **panel del BCP deja de ser un índice y es un tablero**. Llevaba escrito desde V4.24 que volvería a
  serlo «cuando haya KPIs de negocio que valga la pena mirar de un vistazo» — el Modelo Económico los trajo: PVC
  vigente, prima mínima, cuánto se ha movido el mercado desde el corte y qué precio viene. El índice de módulos sigue
  debajo, ahora encabezado por Modelo Económico. `ConsoleScaffold` acepta `kpis` y `badge` (sin ellos se comporta igual
  que antes, que es lo que hace el ECP).
- **Añadido**: guardián **`scripts/qa-pvc-escala.mjs`** (63) — K derivada y no elegida; que el surplus **multiplique** y
  no sume; las tres puertas; los cuatro cambios del owner del 16-sep (BCC:86, CBC:86, CCB:87 y ABB:84 son Blue); el
  contraste con la gráfica (19 de 22 puntos en su banda, y **exactamente** los tres conocidos moviéndose); bandas sin
  huecos; monotonía en SCA y en surplus; y que la pantalla siga diciendo que esto **no gobierna**.

## [V5.44] — 2026-09-16 (commit 7f3e9aa)

- **Añadido**: primera cara del refurbish del BCP (`docs/PVC_BCP_PLAN.md` §11) — la pestaña **Lectura**
  (`/bcp/pvc/lectura`, primera del tab strip) responde «qué significa hoy el precio que rige». **No recalcula ni
  publica nada**: el PVC está fijado por tres meses y esta pantalla mide la distancia entre lo que se fijó al corte y lo
  que el mercado hace hoy. Las tres cifras del owner, cada una con su dibujo: **prima mínima** (el escalón Black contra
  el precio de la Federación del día, +40,6 % hoy) con **la regla de precios** a escala real; **sobre base pergamino**
  (+$830.000 por carga de 125 kg) con **la carga apilada**; y **verde empacado FOB** ($45.341/kg, `n2` a la TRM del
  corte) con **el embudo de una carga** — 125 kg CPS → 93,09 excelso → 78 garantizados → unidades de empaque, con el
  COP/kg en cada escalón. Añade la desviación contra la entrada de la edición y la holgura hasta el disparador.
- **Añadido**: `src/lib/pvc/lectura.ts` — módulo **puro** (como `motor.ts`) con las tres fórmulas, el embudo y las
  reglas de MOQ y empaque; y `lecturaDeMercado()` en el servicio, que lee `market_anchors` (90 días, promedio de 30).
- **Cambiado** (addendum del owner, `PVC_BCP_PLAN.md` §9.2): el empaque son **dos estándares**, no cinco formatos —
  **vacío 3 · 6 · 12 kg** para Blue, Gold y Tyrian (los tres con **un solo estimado de costo**) y **GrainPro-type +
  yute de 35 kg** para Black y Red, que deja de venderse en bolsa de 6 kg. El MOQ de Black y Red lo fija **cuántos lotes
  componen la mezcla** (2 → 4 cargas, 3 → 3, 4 → 4; una mezcla de cinco no existe: con seis se hacen dos de tres);
  Blue 2 cargas; Gold 1 carga, con piso excepcional de **un saco** (70 kg CPS ≈ 50 verde ≈ 40 tostado) para Gold y
  Tyrian. El incremento después del mínimo es **la mitad**, fraccionable a cuartos como upsale. Se **exhibe** en
  Lectura; todavía no gobierna precio — eso es la versión v2.2.0 del modelo, con acta.
- **Añadido**: guardián **`scripts/qa-pvc-lectura.mjs`** (59) — las tres fórmulas con los números reales del día, los
  dos estándares de empaque, la regla de la mezcla, el piso de saco, el incremento a la mitad y el embudo; más que la
  pantalla use las funciones en vez de repetir fórmulas.
- **Docs**: el §11.5 corrige el tercer KPI — el owner lo llama «verde FOB», así que es `n2` (FCA Bogotá), no `n1`; y el
  costo de empaque pasa de ser un parámetro a **dos**, uno por estándar, traídos del Cotizador de Empaque del ECP.

## [V5.43] — 2026-09-16 (commit dba3795)

- **Corregido** (hallazgo **A1** de `docs/PVC_BCP_PLAN.md` §10.2): **«vigente» ignoraba la ventana de vigencia del PVC**.
  `edicionVigente()`, la vista `public_pvc_current` y —por su cuenta— la pantalla de Ediciones decidían cuál rige con
  «la última publicada por `published_at`». Como el PVC **se fija por tres meses y se publica siete u ocho semanas antes
  de su fecha efectiva**, publicar la franja siguiente habría puesto su precio a regir el mismo día, con la anterior
  todavía en curso. Ahora rige la edición publicada/corregida **cuya ventana contiene hoy**, y la fecha se toma en hora
  de Colombia (`hoyEnColombia()`): el servidor corre en UTC y adelantaba el cambio de franja cinco horas. No hubo daño
  en producción porque ningún módulo comercial lee todavía el PVC (0 ofertas, 0 contratos, 0 listados).
- **Añadido**: la **próxima edición** deja de estar escondida. Vista `public_pvc_next`, `edicionProxima()`,
  `pvcProximoPublico()`, el campo `proxima` en `GET /api/pvc/current` y una tarjeta propia en Ediciones — que un
  productor o un comprador vea con siete semanas de antelación el precio que viene es el sentido de publicar tan pronto.
  El historial marca «rige hoy» y «próxima».
- **Datos**: migración `pvc_vigencia_por_ventana` — `public_pvc_current` filtra por `[valid_from, valid_to]` con
  `coalesce(valid_from, publish_date)` para que una edición sin ventana no deje al sistema sin precio; nace
  `public_pvc_next`.
- **Añadido**: guardián **`scripts/qa-pvc-vigencia.mjs`** (28) — la regla en los tres sitios que la deciden, que la
  pantalla ya no la derive por su cuenta, y la aritmética de la ventana probada con las fechas de una franja real.
- **Docs**: `PVC_BCP_PLAN.md` gana el **§11, el refurbish del BCP a «Modelo Económico»** (pestañas Lectura · Grados ·
  Marco de mercado · MOQ y mermas; el marco **es dato** y clasifica la Tríada, con el D10 como su impresión; la
  explicación de los dos sistemas de MOQ por la doble unidad carga↔bolsa y el colchón de merma; el Tablero como
  configurador de un agente; los KPI con sus visualizaciones; Month-Wrap ×5 por periodo) y el **§10, la auditoría del
  módulo** (A1–A13) verificada contra la base.

## [V5.42] — 2026-09-15 (commit da793d4)

- **Corregido**: la ayuda «¿Cómo enciendo un equipo?» de OCP · Transcripciones (`WorkersBadge.tsx`) mandaba al
  operador a `reference_html_tools\_whatsapp-transcript-html`, carpeta que dejó de existir con la reorganización de
  `C:\dev` (2026-09-11). Ahora dice `tools\transcriptor` — la misma carpeta que empaqueta `/api/transcripciones/descargar`.
- **Docs**: las cinco decisiones del PVC (`docs/PVC_BCP_PLAN.md` §8) quedan **tomadas por el owner** (2026-09-15) y el
  plan gana el §9 con la **escala de puntos CTC** (1000–2500: base por SCA × surplus multiplicativo por variedad ·
  proceso · reconocimiento, con puerta de entrada en 80–81,99 y Tyrian solo desde 89 SCA), los MOQ por unidades de 6 kg y la doctrina de moneda (US$ FOB a la TRM del corte como normalizador;
  CIF/DDP en la moneda del destino). El conflicto abierto n.º 1 de `ALINEACION.md` §1 se cierra; la fase 2 del PVC
  queda desbloqueada (pendiente con dueño `consolas`).

## [V5.41] — 2026-09-14 (commit 9a16044)

- **Añadido**: botones **«i» en cada campo** del análisis cuantitativo (pH, materia orgánica, nitrógeno, fósforo, potasio,
  calcio, magnesio) con qué es en 15 palabras o menos y los **rangos bajo · medio · alto de Cenicafé** (Sadeghian 2018,
  Avance Técnico 497, tabla 2; café en producción), el rango adecuado resaltado, el método de laboratorio al que valen y
  el aviso de confirmarlos con el técnico. Los rangos viven en las **reglas v2.6** y no llegan al modelo. También hay
  «i» en «NaOH por 5 g de suelo», «Papel del croma» y «¿Cómo maneja la finca?», con una tabla de opciones.
- **Cambiado**: las definiciones con ecuación usan notación simbólica y una **leyenda completa de símbolos**, plegada al
  final en un acordeón (glosario de 99 símbolos en tres idiomas: L*, a*, b*, ΔE*ab, r(θ)…). Abren con un **diagrama de
  lo que se mide**, dibujado sobre la foto del croma con sus fronteras medidas si la hay.
- **Añadido**: en la revisión de la escala de Ford, cada número del **rango que daría el técnico** dice qué significa
  (1 ausente … 5 totalmente desarrollada), junto al rango del programa, el de la lectura y la mediana publicada. Tres «i»
  nuevas (canales, picos, intensidad) con su ecuación, su diagrama y la guía 1–5, aclarando que la fuente solo define 1 y
  5 y que 2 a 4 son la guía de CTC.
- **Añadido**: opción **N/A** en los veredictos por elemento y en la valoración general del laboratorio.
- **Cambiado**: la cara del laboratorio va en **pestañas** (Captura · Rasgos · Lectura · Feedback), con el contador de
  revisados en la pestaña de lectura; al imprimir salen todas.
- **Añadido**: el **PDF del laboratorio abre con un one-pager** del informe del productor (foto anotada, señal, resumen,
  conjeturas con certeza, prácticas, lo que confirma, análisis declarado, «Preparada por» y descargo) y salto de página.
- **Corregido**: el contador de elementos revisados daba 0 cuando la cara del laboratorio estaba oculta.
- **Docs**: PDF de metodología edición 1.3; `cromatografia-recorrido.mjs` pasa por la pestaña Feedback; guardián
  `qa-cromatografia` sube a **294**.

## [V5.40] — 2026-09-13 (commit 0dd40e5)

- **Añadido**: **Tulio Esteban Lozano Vesga** (UIS-IPRED, proyecto Campo Para Todos) entra en el Lector de Cromatografía
  como **referente de la cromatografía cualitativa en la caficultura latinoamericana**. Su trabajo de grado (finca El
  Guacal, Barichara, 2021; 14 cromas con laboratorio Cenicafé pareado) es fuente de nivel B en las **reglas v2.5**:
  protocolo de Restrepo y Pinheiro tal como se practica en Colombia, efecto de la dilución de NaOH (50–200 ml por 5 g),
  terminaciones de los picos («explosión de lunares» frente a «granos de maíz») y un segundo caso colombiano en que un
  croma leído como excelente coincidió con materia orgánica «muy baja» en laboratorio. Dirigió además la tesis UIS 2026
  que ya se citaba. Bloque `referentes` en las reglas (documentación, no criterio).
- **Añadido**: «Bibliografía y metodología» abre con el referente y seis enlaces (tesis en el repositorio UIS, Perfect
  Daily Grind 2025, dos notas de Comunicaciones UIS 2026, taller en SINTERCAFE 2026 y @campoparatodos), con la nota de
  que citarlo no implica que respalde la herramienta; en los tres idiomas. Pie de la herramienta y bibliografía de los
  PDF (edición 1.2) al día; DOC-03 lo nombra en «lo que falta validar» y en la lección de los casos pareados.
- **Docs**: `fuentes/INDEX.md` (fuera del repo) registra la tesis como #24; el guardián `qa-cromatografia` sube a **280**.

## [V5.39] — 2026-09-13 (commit d23352f)

- **Añadido**: el Lector de Cromatografía habla **español, inglés y alemán**. Conmutador ES · EN · DE en la cabecera
  (se recuerda en el navegador); la interfaz entera, los diálogos y las definiciones salen de diccionarios completos; la
  lectura del modelo se pide en ese idioma (prompt `croma-prompt-1.8`) y la validación aplica léxicos por idioma
  (prohibiciones, duda, coherencia con la radialidad, zonas) más el español. Lo que el servidor pone por su cuenta
  (catálogo de prácticas, señales, certezas, descargos, etiquetas de nivel, reglas regionales, compuerta) sale del
  bloque `i18n` de las **reglas v2.4**. Una lectura con campos en español cuando se pidió otro idioma se rechaza.
- **Añadido**: **análisis cuantitativo de laboratorio** (pH, materia orgánica, N, P, K, Ca, Mg, laboratorio y fecha) en
  un acordeón paralelo a «Más datos», con la explicación de qué es (el examen que suele hacer la Federación a través de
  Cenicafé). Se guarda con el trabajo, sale en el informe del productor como tabla con sus propios valores, viaja al
  modelo marcado como dato del laboratorio y solo alimenta un campo técnico nuevo, `contraste_laboratorio`, que la
  validación exige cuando hay análisis, prohíbe cuando no lo hay, y rechaza si califica los valores («pH bajo»,
  «moderate organic matter») o mezcla la taza. La cara del productor sigue sin nombrar nutrientes ni acidez.
- **Añadido**: **«Preparada por»** opcional en el informe del productor: casilla, nombre de la cuenta por defecto (la ruta
  de fincas devuelve `cuenta.nombre` desde `profiles.full_name`) y editable. No viaja al modelo y solo se guarda si se
  marca.
- **Añadido**: botones **«i» de definiciones** en la compuerta, los rasgos medidos, la escala de Ford, la certeza y la
  señal: un diálogo con qué es, la ecuación tal como la calcula el motor, la leyenda de símbolos y el rango, en los
  tres idiomas.
- **Cambiado**: los PDF impresos llevan cabecera explícita **«Colombian Trading Company SAS»**, pie con **NIT
  901.483.425-7 · ctcexport.com** y **«Página n de N»** (cajas de margen `@page`, Chrome y Edge; el pie del documento
  sigue en cualquier navegador).
- **Cambiado**: el «i» verde del laboratorio es ahora el botón **«Bibliografía y metodología»**, en su propia barra
  encima de «Imprimir feedback (PDF)».
- **Corregido**: el patrón de palabras vetadas tomaba «photo» por «pH»; los tokens cortos exigen fin de palabra. Una
  fuente C que **niega** la validación por pares ya no se rechaza.
- **Docs**: PDF de metodología edición 1.1 regenerados; `qa-cromatografia-modelo` acepta `[idioma] [lab]`; el guardián
  `qa-cromatografia` sube a **271** comprobaciones (paridad de diccionarios, léxicos, contraste, PDF, definiciones).

## [V5.38] — 2026-09-13 (commit 6fd3187)

- **Cambiado**: el Lector de Cromatografía usa en modo oscuro **el morado claro de CTCX** (fondo `#451D96`, tarjetas
  `#512AA6`, acentos lavanda) en vez del casi negro que el owner encontró demasiado oscuro.
- **Añadido**: la cara del laboratorio **muestra la foto anotada**, con el id y la zona de cada conjetura bajo su
  título. Cada figura lleva ids propios de flecha y recorte, porque las dos viven a la vez en la página.
- **Añadido**: **identificación del laboratorio** en el Feedback Técnico: laboratorio o institución, RUT con aviso del
  dígito de verificación (algoritmo DIAN), nombre y cargo del técnico, y firma dibujada con el dedo o el mouse. Sale en
  el PDF impreso y en el JSON (esquema 2). Una lectura nueva conserva a quien revisa pero no su firma; los trabajos
  anteriores se migran.
- **Añadido**: botón **«?»** amarillo en el paso 1 del productor: qué es la cromatografía en cinco puntos sencillos,
  un dibujo de las cuatro partes del croma y un cierre, más **tres fotos de ejemplo** que pasan por la misma
  compuerta y quedan marcadas como ejemplo en el informe.
- **Añadido**: botón **«i»** verde en la tarjeta de feedback: el método en unas 150 palabras, un acordeón de recursos
  en línea con licencia y nivel, y otro con **tres PDF de metodología** (metodología · base de conocimiento y fuentes ·
  datos, calibración y validación) con marca de agua, derechos de CTCX, atribución de terceros y limitación de
  responsabilidad. Se generan con `scripts/build-cromatografia-docs.mjs` desde las reglas, el motor y el prompt.
- **Añadido**: el guardián `qa-cromatografia` sube a 213 comprobaciones (tema, figura del laboratorio, identificación y
  NIT, los dos diálogos sin jerga para el productor, fotos y PDF en disco).

## [V5.37] — 2026-09-13 (commit c918c8f)

- **Añadido**: el informe del productor del Lector de Cromatografía **abre con su foto anotada** (pedido del owner): el
  croma recortado y centrado, con un número y una flecha por conjetura que señalan la zona de la que habla, y el
  título al lado. Va en pantalla y en el PDF exportado; las tarjetas de las conjeturas llevan el mismo número.
- **Cambiado**: cada conjetura nombra su **zona** (central · mineral · organic · enzymatic · general; prompt 1.7). La
  flecha se ubica con el centro, el radio y las fronteras que midió el motor de rasgos, no a ojo. Si la zona falta o
  no es válida, `zonaDesdeTexto` la deduce de lo que se ve y queda anotado; las lecturas guardadas sin zona también
  se señalan. La miniatura guardada sube a 560 px para que la foto se imprima nítida.

## [V5.36] — 2026-09-13 (commit d72cdc3)

- **Cambiado**: el informe del productor del Lector de Cromatografía **lee más y no abre con «vaya al laboratorio»**
  (owner). Los hallazgos pasan a ser **conjeturas** (de 2 a 5): lo que se ve, lo que podría significar, otra
  explicación posible y lo que implicaría para el lote, cada una con su **certeza** (baja o media). La certeza no la
  escribe el modelo: la calcula `certezaDe` desde la confianza y el nivel de evidencia de las interpretaciones
  técnicas que la sustentan.
- **Cambiado**: «Qué puede hacer» trae solo prácticas de manejo, ordenadas por prioridad, y al menos una. El análisis de
  laboratorio y repetir el croma siguen siempre, pero en un bloque aparte al final, «Para confirmar y seguir el
  avance»; si el modelo los elige, pasan ahí con su porqué. Reglas v2.3 (textos de certeza) y prompt 1.6.
- **Corregido**: una interpretación que cita dos fuentes («Kokornaczyk…; Graciano…») con nivel «A/B» ya no se rechaza: se acepta con el nivel más conservador y queda anotado; cada fuente debe existir en las reglas. Prompt 1.6 con las listas literales de palabras que la cara del productor no puede usar. Prueba en vivo: 3 de 3 al primer intento, ≈ US$ 0,021 por lectura.
- **Añadido**: la cara del laboratorio revisa cada conjetura (c1…) y cada práctica para confirmar (k1…); las lecturas
  guardadas de V5.35 se siguen pintando. Guardián `qa-cromatografia` con las costuras nuevas.

## [V5.35] — 2026-09-13 (commit 89cf9bf)

- **Cambiado**: **el Lector de Cromatografía tiene dos caras** (reingeniería pedida por el owner). La del **productor**
  es la principal: tres pasos (foto con consejos en palabras del campo, datos de la muestra, «Leer mi suelo») y un
  informe con señal general, resumen, lo que muestra la foto y qué puede hacer, cada acción con su cómo hacerlo, su
  cuidado y su fuente. La del **laboratorio** es el backstage técnico: compuerta, rasgos, Ford, cadena de evidencia,
  contexto regional y recomendaciones técnicas.
- **Añadido**: **Feedback Técnico**. En la cara del laboratorio el técnico da un veredicto y un comentario por cada
  elemento (descripción, rangos de Ford con el rango que él daría, interpretaciones, contexto regional,
  recomendaciones, y cada hallazgo y acción del informe del productor) y una valoración general. Se exporta como
  `feedback-tecnico-<id>.json`, con la lectura, los rasgos, las versiones y la miniatura, para refinar el modelo, y
  se imprime en PDF. Sin consentimiento no lleva el nombre de la finca.
- **Cambiado**: reglas **v2.2** con el catálogo de prácticas de manejo (cómo hacerlo verificado en UIS 2026 pp. 60–62,
  Altepetl y Embrapa 455) y la política de lenguaje del productor (sin jerga y sin nombrar nutrientes ni acidez: la
  foto no los ve). Prompt **1.5**: la IA escribe las dos caras en la misma lectura; la del productor elige prácticas
  del catálogo por id y cada hallazgo y acción apunta a las interpretaciones técnicas que lo sustentan.
  `validarSalida` lo comprueba y añade siempre el análisis de laboratorio y repetir el croma. Prueba en vivo: 2 de 2
  al primer intento, ≈ US$ 0,019 por lectura.
- **Cambiado**: marca **CTCX** como en Defectos del Café: franja de color, loro en cabecera, pie con el logo, la
  propiedad y las fuentes, y la misma firma en los PDF exportados (`public/tools/assets/ctcx-*.png`).
- **Retirado**: las seis fuentes Plex que solo usaba el Lector (el sistema CTCX usa fuentes del sistema).
- **Docs**: brief (acta de la reingeniería) y charter.

## [V5.34] — 2026-09-13 (commit 43917c0)

- **Añadido**: el Lector de Cromatografía usa su **clave propia** `CROMATOGRAPHY_ANTHROPIC_API_KEY` (creada por el owner
  para separar su gasto en la consola de Anthropic) y, si falta, la general `ANTHROPIC_API_KEY`.
- **Añadido**: `GET /api/herramientas/cromatografia/estado` dice si la lectura con IA está disponible y el estado de
  cada variable (ok · sin-clave · clave-invalida · limite-o-saldo), comprobado contra `GET /v1/models` sin gastar
  tokens y guardado 10 minutos. Nunca devuelve la clave. Guardián `qa-cromatografia` con sus costuras.

## [V5.33] — 2026-09-13 (commit ed19bb3)

- **Cambiado**: **reglas de interpretación v2.1** del Lector de Cromatografía (`src/lib/tools/cromatografia/reglas.json`).
  El owner dejó la v2.0 como guía y el criterio de CTC con prelación; cada cambio está contrastado página a página
  con las fuentes abiertas: radios relativos al frente del extracto con priors 0,15 · 0,5 · 0,8; zona periférica
  como papel sin extracto que no se interpreta; escala de Ford con solo sus extremos, procedimiento por cuadrantes y
  distribución observada (mediana 2,5, el color nunca pasó de 4); centro blanco en dos lecturas (nítido y aislado
  frente a cremoso que se integra); fuera el verde oscuro como degradación, dentro el violeta como no deseable; zona
  media ↔ biomasa atribuida a Graciano et al. 2020; terminaciones de los picos según Embrapa 455 en lugar de «borde
  dentado»; nivel de evidencia explícito por fuente; reglas de comparación y metadatos de protocolo.
- **Cambiado**: **compuerta de la foto 1.2**, pensada como «¿se tomó bien la foto?» (owner). El porcentaje del
  encuadre deja de rechazar. Se rechaza un croma de menos de 500 px de diámetro en la foto original y una cámara muy
  inclinada (razón de ejes < 0,80). Las fronteras solo cuentan si son un máximo local dentro de su ventana. Con las
  108 capturas de Martins et al. 2026 pasan 108 y las fronteras medianas medidas son 0,15 · 0,48 · 0,82.
- **Añadido**: el formulario pide el protocolo (papel, NaOH por 5 g de suelo, días desde el revelado) y la lectura lo
  tiene en cuenta. Prompt 1.3 (una fuente C no suena a institución; la observación sale de la imagen; ante dos patrones, las dos lecturas): 3 de 3 lecturas pasan los controles al primer intento, rangos de Ford idénticos, ≈ US$ 0,016 por lectura.
- **Docs**: brief y charter con las tres decisiones del owner resueltas; el dataset propio queda como sugerencia.

## [V5.32] — 2026-09-13 (commit cb4f9e7)

- **Añadido**: **Lector de Cromatografía de Suelo** (`cromatografia-suelo`, Herramientas del Café, Plus), la
  primera herramienta de la suite con pieza de servidor. Lee la foto de una cromatografía de Pfeiffer y el
  contexto de la finca, y da un reporte con cadena de evidencia (observación · lectura · fuente · nivel A/B/C).
  Regla de oro en código: lectura cualitativa, nunca medición ni vínculo con la taza.
  `public/tools/cromatografia-suelo.html` (compuerta, rasgos, Ford programático, reporte y PDF en el navegador,
  sin cuenta y sin internet) · `public/tools/assets/cromatografia-rasgos.js` (visión clásica en JS puro: centro,
  perfil radial CIELAB de 50 anillos, fronteras, radialidad, picos, entropía, simetría) ·
  `src/lib/tools/cromatografia/{reglas.json,prompt.ts,salida.ts}` (prompt armado en tiempo de ejecución desde
  `interpretation_rules.json` v2.0; validación de claims prohibidos, coherencia rasgos↔texto, techo de nivel por
  fuente, descargo forzado, ids por lectura para el futuro modo «expert feedback») ·
  `api/herramientas/cromatografia` (sesión → veredicto de acceso → techo diario de 20 → Haiku 4.5 a temperatura
  0, una corrección si no pasa los controles) · `api/herramientas/cromatografia/fincas` (las fincas de la cuenta
  para prellenar; nunca coordenadas; apagado en Cherry Picked). Trabajos por el puente con esquema propio.
- **Añadido**: guardián `scripts/qa-cromatografia-check.mjs` (122: reglas byte a byte, cromas sintéticos y seis
  rechazos de compuerta, regiones, techos de nivel, salida del modelo, costuras) y prueba en vivo manual
  `scripts/qa-cromatografia-modelo.mjs` (estabilidad a temperatura 0; ≈ US$ 0,013 por lectura, medido).
- **Cambiado**: el libro de consumo gana la vía `herramientas:cromatografia` (`USOS`, `qa-consumo-check`).
- **Datos**: umbrales de la compuerta calibrados con las 108 capturas abiertas de Martins et al. 2026 (Zenodo,
  CC BY 4.0): 107 pasan. El área mínima baja al 20 % frente al 40 % del JSON, que rechazaba capturas bien
  hechas; decisión pendiente del owner.
- **Docs**: brief aprobado `docs/componentes/briefs/herramientas-cafe-cromatografia-suelo.md` (con lo
  construido, la investigación de fuentes y el diseño del modo experto); charter, ALINEACION §3 y §3b.

## [V5.31] — 2026-09-11 (commit 649435c)

- **Docs**: **la plataforma se trabaja por componentes.** Decisión del owner (2026-09-11): un componente por
  conversación, cada uno con su **charter** (`docs/componentes/<clave>.md` — diez: consolas, herramientas-internas,
  biblia, kaffetal-regal, cherry-picked, herramientas-cafe, coffeed, directorio, ctc-tech, varietales), atados
  por **`docs/ALINEACION.md`** (14 contratos transversales, la regla del backstage, el registro de permeación y
  los pendientes cruzados con dueño) y arrancados con **`docs/KICKOFF.md`** (12 prompts compilados desde los
  charters por `docs/componentes/build_kickoff.py`). `docs/HANDOFF.md` se queda con lo transversal (1.397 → 276
  líneas; su cronología íntegra en `docs/archive/HANDOFF_cronologia_2026-07_09.md`); `AGENTS.md` describe el
  trabajo por componentes y el orden de lectura; `README.md` deja de ser el boilerplate de create-next-app; los
  planes ya ejecutados de `docs/` llevan banner de archivado (se quedan en su sitio porque el código los cita).
  Plan y decisiones: `docs/REFURBISH_PLAN.md`.
- **Añadido**: guardián **`scripts/qa-arqlog-check.mjs`** — toda versión del CHANGELOG posterior al último wrap
  del mapa debe tener su asiento en el log de arquitectura vigente. Nació porque V5.25–V5.30 salieron de seis
  sesiones sin dejar asiento; sus seis asientos se compilaron hoy desde este archivo.
- **Cambiado**: **versionado y wraps con desarrollos en paralelo** (`ALINEACION.md` §5): la versión se toma al
  empujar (pull → +1 → push), el asiento es del componente y va en el mismo commit que la versión, el wrap es
  de la plataforma y solo se llama desde la conversación «Wraps del mapa» del grupo CTC Consolas internas.
  CommaaS adopta el mismo contrato a su escala (`commaas/docs/ALINEACION.md`).
- **Datos**: fuera del repo — `C:\dev` ordenado (`reference/<tema>`, `apps-internas/`, los prototipos como
  tenants pendientes de CommaaS), memoria de Claude propia por espacio, barra lateral del Code por componente.

> **Wrap V42** (2026-09-12): ciclo compilado en Documentacion_Interactiva_V42.0(8eb14f5).html —
> 39 nodos · 139 fichas (+2: PVC, componentes) · 53 trazas (+1) · 340 ANN (+15) · batería 9/9 vacías ·
> recupera V5.25–V5.30, que ninguna sesión había anotado.

## [V5.30] — 2026-09-11 (commit 12ea217)

- **Cambiado**: **el video de presentación deja de ser provisional.** Las dos superficies que lo montan —«Tres
  ofertas» en CTC Home (`EcosystemSection`) y «Bienvenidos al Kaffetal Regal» (`BienvenidosSection`)— apuntan al
  video definitivo (`qDAu9mK3KRA`) en lugar del id provisional `Yird1_j6yqo` que compartían desde que se montó el
  `YtEmbed`. Miniatura, reproductor y enlace a YouTube se derivan del id, así que el cambio es una constante por
  superficie.
- **Corregido**: el copy afirmaba una duración que el video definitivo no tiene. El pie visible del reproductor en
  CTC Home decía «CTC, en un minuto» (y sus pares en inglés y alemán) debajo de un video de 5:33, y la entradilla
  del Kaffetal Regal prometía «el camino completo, en un minuto de video». Las seis cadenas de las tres lenguas
  quedaron **neutras respecto a la duración**, que es lo correcto para cualquier montaje futuro.

## [V5.29] — 2026-09-10 (commit 9f57a17)

- **Cambiado**: **PVC · revisión de coherencia.** El dossier v2.1.1 (`docs/pvc/v2.1.1`) se reeditó armonizado con el
  módulo: el código de edición pierde el sufijo de versión (`PVC-F4-2026`; el método se versiona aparte), D2 §7.3–7.4
  describen la publicación con huella en BCP · PVC y los ciclos semanales internos, D3 §1 registra la huella
  (`c476fe80`), y el **D4 en español e inglés lleva el mismo esqueleto que produce «Exportar Reporte» en el
  tablero** (PVC, tres KPIs, escalera con FCA/CIP/DDP, cómo se construye, compromisos; el contexto de mercado
  vive en D3). Una sola etiqueta de versión (v2.1.1) en motor, calculadora y documentos.
- **Cambiado**: el tablero exporta el D4 en **español o inglés** con el título `código · modelo · huella` (ya no
  numera sus propias versiones «D4 v3.n»); abierto sin conexión al BCP, «Publicar» se declara simulación local.
- **Corregido**: el motor Python de referencia redondeaba los empates al par (2.025.000 → 2.020.000) donde Excel
  y el tablero redondean hacia arriba; ahora los cuatro motores coinciden y D2 Anexo A lo fija por escrito.
- **Corregido**: las tablas de `/bcp/pvc` usaban una clase inexistente; ahora llevan el estilo de tabla del panel.
- **Retirado**: las Server Actions de lectura y publicación sin uso en `lib/pvc/actions.ts` — publicar tiene un solo
  camino (la ruta del tablero) para que no existan dos ediciones del mismo código.
- **Añadido**: guardián `scripts/qa-pvc-tablero.mjs` — evalúa el modelo JavaScript del tablero (marcadores
  `@@MODELO`) contra `paridad.json`; con `qa-pvc-motor` y `verify_xlsx.py`, las cuatro implementaciones quedan
  ancladas a la misma referencia.

## [V5.28] — 2026-09-10 (commit 3ae9914)

- **Hito**: **PVC · Ponderación de Valor de Cosecha** entra a la plataforma como módulo del **BCP · Business Core**
  (`/bcp/pvc`, owner-only): la fuente única del indicador principal del negocio. Fase 1 de `docs/PVC_BCP_PLAN.md`.
- **Añadido**: motor TypeScript `src/lib/pvc/motor.ts` (port de `pvc_model_v2.py`, método PVC-D2 v2.1.1: edición,
  escalera, pila FCA/CIP/DDP, back-proof 2019–2026, KPIs, huella) con guardián de paridad
  `scripts/qa-pvc-motor.mjs` contra las cifras exportadas del motor Python (`paridad.json`).
- **Añadido**: cuatro pestañas — **Ediciones** (la vigente con sus KPIs, escalera y pila; historial con huella),
  **Tablero** (el tablero HTML interactivo embebido y autenticado, con puente a la base: publica y lee ediciones),
  **Parámetros del modelo** (versiones inmutables del método, registro de una nueva por acta) y **Dossier**
  (D0–D9 + calculadora por versión, servidos autenticados desde `docs/pvc/`).
- **Añadido**: `GET /api/pvc/current` — la edición vigente pública (código, PVC, vigencia, escalera, pila, KPIs)
  desde la vista `public_pvc_current`, para Cherry Picked, Kaffetal Regal y Make.
- **Datos**: migración `bcp_pvc_core` — `pvc_model_versions`, `pvc_editions` (guard `pvc_editions_guard`: una
  edición publicada es inmutable; una corrección al alza es otra fila con `correction_of`), `pvc_cycles`,
  `pvc_sources`, `pvc_trigger_watch`, `pvc_forecast_scores` (todas service-role-only) y la vista
  `public_pvc_current`. Semilla: modelo v2.1.1 y la edición **PVC-F4-2026 = $2.500.000** publicada.
- **Cambiado**: el rail del BCP · Business Core gana «PVC · Valor de Cosecha»; la pestaña Modelo Económico enlaza al
  módulo. `next.config.ts` traza `docs/pvc/**` para las rutas que lo leen.
- **Docs**: `docs/PVC_BCP_PLAN.md` (el acople completo: tablas, sitios donde repercute, ciclo semanal, certeza,
  fases y las cinco decisiones pendientes del owner); sección en HANDOFF.

## [V5.27] — 2026-08-23 (commit 76993c7)

- **Corregido**: en **Defectos del Café**, la clave de identificación pintaba la foto del grano ENCIMA de
  su etiqueta («Negro o carbón», «Ámbar traslúcido»…). Causa real: la caja de la imagen era una rejilla
  con fila automática y la imagen llevaba `max-height:80%` — ese porcentaje no se resuelve contra una
  fila auto, la imagen salía a tamaño natural (hasta 92 px en una caja de 58) y, como el filtro
  `drop-shadow` crea contexto de apilamiento, se dibujaba sobre la etiqueta que la sigue. Las dos
  correcciones anteriores (V5.25) atacaban el recorte del texto, que era un síntoma secundario. Ahora la
  caja es flex de alto fijo con `overflow:hidden` y la imagen lleva tope en píxeles; medido en el
  navegador: 0/21 imágenes fuera de caja en ES/EN/DE (antes 21/21).

## [V5.26] — 2026-08-22 (commit 4bb787d)

- **Añadido**: captura del carrusel de Herramientas para **Defectos del Café**
  (`public/images/herramientas/shots/defectos-cafe.jpg`, `scripts/build-tool-shots.mjs` registra la
  entrada `defectos-cafe: /tools/defectos-cafe.html`). Sin ella la tarjeta caía al texto de reserva
  en la landing pública.

## [V5.25] — 2026-08-22 (commit 90593cd)

- **Añadido**: nueva herramienta **Defectos del Café** en `public/tools/defectos-cafe.html` —
  catálogo interactivo de los 14 defectos del café verde del afiche oficial de la FNC (fotografía
  propia de CTC, fondo de muestra cambiable gris/blanco/negro/bandeja) y de los defectos del tueste,
  con clave visual de identificación (desde el grano o desde la taza), la matriz de incidencia y
  origen, control de proceso por etapa y una práctica de reconocimiento uno a la vez con
  retroalimentación inmediata. Tres idiomas (español, inglés, alemán). Marca CTCX. Origen `repo`,
  registrada en `tools`/`tool_versions` (id `defectos-cafe`, orden 20) y encendida solo en **web**
  (Herramientas del Café pública) — kr/cp/dc quedan apagados a propósito hasta que el owner decida
  ampliar el reparto.

## [V5.24] — 2026-08-22 (commit edf29ea)

- **Añadido**: **Subastas Tyrian — la puja del comprador**, «el podio de los mejores, al mejor postor».
  Dos tablas service-role-only (`lot_auctions` · `auction_bids`, RLS con cero políticas) y un **guard
  trigger** que hace atómica la regla de la puja (bloquea la fila de la subasta: abierta y vigente,
  fracción válida, monto ≥ líder + incremento o precio de salida; la líder anterior pasa a
  `superada`). En **Cherry Picked Green** la `TyrianSection` dejó de ser demo: lee la subasta real
  (`listarSubastas`, también para visitantes) y puja con `pujar` — sesión + nivel **Pintón o
  superior**; estados «tu puja lidera» / «te superaron»; por mitades A/B o el lote completo; tres
  idiomas. En el OCP, **/ocp/subastas** (pestaña del Catálogo) reemplaza el stub: CTCx abre la
  subasta de un Tyrian galardonado (kilos, salida EUR/kg, incremento, cierre, nivel mínimo, nota
  pública), la mira en vivo (líder y pujadores por mitad), la cierra, la adjudica o la cancela.
- **Cambiado**: adjudicar **no emite oferta ni contrato** — las monedas no se mezclan: la puja es
  EUR/kg, la oferta al productor sigue en COP/kg y se registra en Ofertas como «mejor postor»
  (circuito V5.18 intacto). El perfil del comprador ya no habla del lote demo TY-2713.
- **Añadido**: guardián `scripts/qa-subastas-check.mjs` (30 comprobaciones).
- **Datos**: migración `subastas_tyrian` aplicada en producción (tablas, índices, trigger).

> **Wrap V41** (2026-08-22): ciclo compilado en Documentacion_Interactiva_V41.0(8ac6f6f).html —
> 39 nodos · 137 fichas (+1: Subastas Tyrian) · 52 trazas (+1) · 325 ANN (+6) · batería 9/9 vacías.

## [V5.23] — 2026-08-21 (commit d5d2391)

- **Añadido**: el **escáner visual del OCP y el set de Fichas Técnicas** — el seguimiento acordado
  del rediseño B2/B3 (V5.20). Nueva tabla **`lot_fichas`** (RLS select-own; escrituras solo
  service-role; índice único parcial = a lo sumo **una ficha oficial por lote**). En **/ocp/fichas**
  (riel «OCP · Kaffetal Regal») CTCx ve los soportes B2/B3 de cada lote (URLs firmadas bajo
  demanda), dispara el **escáner** — visión IA (`claude-sonnet-5`, fetch crudo de la casa, gasto
  anotado en `ai_usage` como `kr:ficha-escaner`) que extrae puntaje, escala, atributos SCA, notas,
  factor, almendra, densidad, humedades y mallas al formato `FichaTecnicaData`, saneado por rangos —
  o **compila el reporte del productor** sin IA; y administra el set (oficial ★ · eliminar). El
  escáner es **opt-in** (botón con confirmación de costo): jamás corre en una carga de página ni en
  el veredicto.
- **Añadido**: el productor ve el set en su Ficha — **FichasDelLote** lista las Fichas Técnicas al
  pie de los panes **B2** (cara sensorial) y **B3** (cara física), la oficial primero, solo lectura.
- **Añadido**: guardián `scripts/qa-fichas-check.mjs` (31 comprobaciones: opt-in, modelo pequeño,
  consumo anotado, service-role, una oficial, la extracción no toca `lots` ni `lot_evaluations`).
- **Datos**: migración `lot_fichas_set` aplicada en producción (tabla + índices + política).

> **Wrap V40** (2026-08-21): ciclo compilado en Documentacion_Interactiva_V40.0(1b5720d).html —
> 39 nodos · 136 fichas (+3: el set de Fichas Técnicas, Redacción, el taller de Herramientas) ·
> 51 trazas (+2) · 319 ANN (+10) · batería 9/9 vacías.

## [V5.22] — 2026-08-21 (commit 20832bb)

- **Cambiado**: el **Mapa de Trabajo (`/bcp/mapa`) alcanza al modelo nuevo** — el wrap V39 lo dejó
  señalado como el último rincón narrando el flujo viejo. La banda de la **Arena pasa DESPUÉS del
  Galardón** y se rotula «Arena · vitrina» (tinte de soporte, no del tramo pagado); el bache se
  rotula «Evaluación · bache Q-Grader» y su compuerta «Veredicto Q-Grader · el puntaje manda»
  cablea directo al **GAL** (`gradoPorPuntaje`) y a la planilla oficial en `lot_evaluations`; entra
  el nodo **`lot_offers`** y el comercio se recablea — el galardón emite la oferta, **la aceptación
  crea el contrato**, la negociación Black desemboca en su oferta, y la vitrina cuelga del galardón
  como invitación. El nodo de decisión «Grado CTC» de la jornada se retira (el grado ya no se vota).

## [V5.21] — 2026-08-21 (commit 6a4af47)

- **Corregido**: dos afinados del owner sobre el B2/B3 recién rediseñado. **B2 pierde el bloque
  «Notas de Análisis & Referencia Q-Grader»** (notas de laboratorio y campos del Q-Grader no son
  del reporte del productor — la referencia vive en «Solicitar oficialización», al pie de la Ficha;
  los campos quedan en el tipo por los datasheets guardados). **B3 muestra SIEMPRE sus números**:
  factor (75–120), almendra total (150–245 g) y densidad en verde (600–1000 g/L) a la vista sin
  marcar nada, y las humedades opcionales debajo — la casilla «Solo sé información básica» queda
  solo como declaración de que no habrá soportes (la regla de completar no cambia). Las notas del
  productor alimentan ahora `ficha_notas_cata` vía `cupping_profile` cuando el campo legado viene
  vacío.

## [V5.20] — 2026-08-21 (commit 5e12b04)

- **Hito**: **B2 y B3 de la Ficha se vuelven «Reportado por Productor»** (instrucciones del owner
  sobre el panel nuevo). El productor ya no digita los 10 atributos SCA ni la granulometría malla a
  malla: **B2** pide «No lo sé» O su estimación — puntaje (0–100) + escala **SCA/CVA** + notas — y/o
  sus soportes; **B3** pide «Solo sé información básica» — Factor de Rendimiento (**75–120**) y/o
  Almendra Total (**150–245 g**; AT = 205 g − cisco) con Densidad en Verde (**600–1000 g/L**)
  OBLIGATORIA — o al menos un soporte, con bloque opcional de Humedad en Pergamino / Humedad en
  Verde / Densidad. Ambas pantallas llevan la explicación grande y B2 sus dos bocetos (red de araña
  + rueda de sabores). Los datasheets viejos siguen contando como completos (los campos legados
  quedan en el tipo y en las compuertas).
- **Añadido**: **soportes por sección** — hasta **7 PDFs y 7 fotos** en B2 y en B3, subidos directo
  a Storage con la convención kaffetalMedia y referenciados en el datasheet; con validación de tipo,
  tope aplicado y **re-descarga garantizada incluso con la sección bloqueada** (anclas firmadas
  bajo demanda, que un fieldset disabled no apaga). Son el insumo del seguimiento acordado: el
  escáner visual del OCP que extraerá los datos y compilará el SET de Fichas Técnicas del lote (una
  oficial), listadas en esos mismos panes al existir.
- **Corregido**: **arrastrar un archivo ya no pinta el cursor prohibido** — los inputs de archivo
  (Información general, Finca, certificados, A3, B4 y los soportes nuevos) son ahora destinos de
  arrastre reales (`FileDrop`: dragover + drop al mismo manejador).
- **Cambiado**: la **barra de módulos va ARRIBA en escritorio** (pegajosa bajo la cabecera) y sigue
  fija abajo en el móvil; menos aire entre bloques en todas las pestañas; y el botón **«Mi red»
  sale de la cabecera del panel** — el salto entre plataformas vive en el Ecosistema de Valor. El
  puntaje reportado de B2 alimenta `ficha_puntaje_estimado`; la vista final de la Ficha muestra el
  reporte del productor (puntaje + escala + soportes + almendra/densidad/humedades) cuando no hay
  datos del formato viejo.
- **Docs**: guardián nuevo `scripts/qa-reportado-productor-check.mjs` (40: campos nuevos y legados,
  compuertas y rangos, tope de 7, la re-descarga por ancla, los bocetos, y FileDrop en los cuatro
  formularios).

> **Wrap V39** (2026-08-21): ciclo compilado en `Documentacion_Interactiva_V39.0(5c128cf).html` —
> 39 nodos · 133 fichas (+5) · 49 trazas (+1) · 91 wires · 309 ANN · FILETREE 1827. Compila
> V5.16–V5.20, los pendientes V5.1 y notas compactas de V5.2–V5.15 (deuda declarada en Log V39).

## [V5.19] — 2026-08-21 (commit 3302cf3)

- **Hito**: **el galardón nace del puntaje; la Arena es la vitrina.** Cierra el plan V5.16→V5.19:
  la Arena queda re-gateada como la **gala post-galardón de la temporada**, exclusiva de
  **Blue/Gold/Tyrian con contrato abierto** (`showcaseGate`): se INVITA (`inviteLotToArena`,
  nueva cola «Elegibles para la vitrina» en `/ocp/arena`), se bloquea en sesión sin tocar jamás
  `lots.grade/stage`, y `finalizeJornada` registra el **podio** (arena_scores + planillas
  `bcp_arena` que enriquecen el promedio oficial + nota al productor) sin gradar, sin crear
  contratos ni negociaciones y sin repartir membresías.
- **Corregido**: dos residuos del modelo viejo que habrían corrompido lotes nuevos — «Confirmar
  recibido» en `/ocp/lotes` ya no empuja el stage a `fila_arena` (confirma la muestra y avanza la
  inscripción `postulacion → fila`, como Nominados), y `deleteArenaSession` ya no revierte un
  `galardonado` a `apto` sin grado (el galardón lo escribió el bache, no la sesión que se borra —
  solo los stages legados `fila_arena`/`evaluado` se revierten).
- **Cambiado**: la landing de KR cuenta la historia nueva en los tres idiomas — la Arena pasa de
  «El tiquete de entrada» a **«La vitrina de la temporada»** (todo lote se evalúa a ciegas con un
  Q-Grader certificado; la gala es de los mejores ya galardonados y con contrato), «Por qué
  inscribirse» habla de solicitar la evaluación, la oportunidad cita la catación del Q-Grader y el
  índice anuncia «La vitrina en vivo de los mejores». El productor ve los estados de la vitrina
  (invitado · sesión confirmada · compitió) dentro de Lotes Galardonados.
- **Docs**: **barrido de HANDOFF** — el flujo de negocio central reescrito al modelo V5.16–V5.19,
  banner V5.17–V5.19 sobre «The Arena pipeline» (manda sobre el histórico), correcciones fechadas
  en las viñetas de la tarifa y del Club, y el módulo del productor apuntando a «Evaluar mi Café».
  `qa-evaluaciones-check.mjs` gana la sección de la vitrina (42 comprobaciones) y
  `qa-ofertas-check.mjs` afina su aserción (SELECT sí, INSERT jamás).

## [V5.18] — 2026-08-21 (commit 69f2311)

- **Hito**: **el contrato nace de la aceptación del productor.** Nace el circuito de OFERTAS:
  CTCx confirma el trato desde el OCP (`/ocp/ofertas`, pestaña nueva del Catálogo) referenciando la
  combinación **Grado + Puntaje + Variedad + Proceso congelada como snapshot**, y el productor lo
  acepta o rechaza desde su panel — aceptar crea el `purchase_contract` (pendiente de la firma de
  CTC, que conserva su `signContract` y su escalera de liberación); rechazar cierra sin compromiso.
  El contrato automático que el galardón creaba desde 2026-07-17 queda retirado. Fase 3 de 4 del
  plan V5.16→V5.19.
- **Añadido**: la pestaña **«Contratos y Compras» real, en cuatro secciones** (mockups del owner):
  *Ofertas de Temporada* (galardonados Red o superior, de esta temporada o la pasada), *Contratos
  de Temporada* (el mes a mes de la ventana de venta; un **lote de la temporada pasada se posiciona
  pero SE VE como tal** — el encuadre viaja congelado en la oferta), *Ofertas Black* (la compra
  directa que sale de la negociación Black) y **Subastas Tyrian** — «el podio de los mejores, al
  mejor postor»: el Tyrian va rumbo a subasta, CTC corre la puja fuera y registra el mejor postor
  como oferta que el productor decide. En el OCP: colas de elegibles por clase, abiertas con
  retiro, historial de respuestas.
- **Cambiado**: `recordEvaluationVerdict` ya no inserta contratos (red/blue/gold y tyrian aparecen
  en las colas de Ofertas); `decideBlackNegotiation('comprar')` **emite la oferta Black** (precio
  acordado obligatorio) en vez de crear el contrato; el gate del Club en `signContract` corrige su
  mensaje (la membresía llega con el galardón). Regla de temporada con `seasonKey` (Mitaca antes
  que Principal): más vieja que la pasada, rechazo duro al emitir.
- **Datos**: tabla **`lot_offers`** (kind `temporada|black|subasta`, status
  `emitida|aceptada|rechazada|retirada|expirada`, snapshots, encuadre de temporada congelado,
  índice único parcial de UNA oferta abierta por lote — probado con rollback en producción), RLS
  select-own y escrituras solo por service role; columna **`purchase_contracts.season_id`**
  (temporada de VENTA, heredada de la oferta — no derivada del registro del lote, a propósito).
- **Docs**: guardián nuevo `scripts/qa-ofertas-check.mjs` (máquina de estados, elegibilidad por
  clase, ventana de dos temporadas, propiedad del productor, y que el contrato no nazca en ningún
  otro sitio).

## [V5.17] — 2026-08-21 (commit 5adb30e)

- **Hito**: **el galardón nace del bache — el Q-Grader escribe el grado, y el puntaje manda.** El
  veredicto de la evaluación (`recordEvaluationVerdict`, ex-`recordSondeoResult`) es ahora EL
  escritor del grado: exige una planilla B2/B3 con puntaje SCA, lo pasa por `redondeaPuntaje`,
  **deriva el Grado CTC con `gradoPorPuntaje()`** (nadie digita un grado — la puerta que
  `definicion.ts` §«la jornada de Arena» pedía cerrar), inserta la planilla como evaluación oficial
  y saca el lote **galardonado sin pisar una sesión de Arena**. La sesión de Arena deja de ser el
  paso obligatorio del proceso (su re-gate como vitrina de Blue/Gold/Tyrian llega en V5.19).
  Fase 2 de 4 del plan V5.16→V5.19.
- **Añadido**: la pestaña **«Evaluar mi Café» real, en tres secciones** (mockups del owner):
  *Solicitudes de Evaluación* (lotes Aptos: solicitar, pagar, despachar la muestra), *Evaluaciones
  en Fila* (muestra y pago confirmados, esperando bache/Q-Grader; el «no superó» con su cashback y
  mejoras vive aquí) y *Lotes Galardonados* (el sello del grado, el puntaje, el certificado EUDR y
  el feedback del Q-Grader). El OCP previsualiza el grado derivado antes de firmar («Puntaje 86.5 →
  Gold») y el bache gana su campo **Q-Grader** — su nombre firma la planilla oficial.
- **Cambiado**: la **membresía del Kaffetal Club llega con el Galardón** (una sola función,
  `grantClubMembershipOnce` en `src/lib/arena/club.ts`); `finalizeJornada` ya no la reparte. La
  escalera canónica del lote es **FT·FT2·EUDR·VID → EVA → MUE·SON → GAL → ARE** (ARE al final,
  opcional — la vitrina); el stepper, las etiquetas de etapa («En fila de evaluación»), los avisos
  al productor y el copy de solicitar («Solicitar evaluación», `EVALUATION_FEE_COP`) hablan el
  idioma nuevo. `isLotCommitted` mira también la inscripción (un lote puede galardonarse sin pisar
  `fila_arena`, y el espejo por stage solo cubría la mitad de la delete-RLS).
- **Datos**: fase terminal **`galardonado`** en el CHECK de `arena_inscriptions.phase`; columna
  `sondeo_batches.q_grader_name`; valor **`q_grader_batch`** en el enum `evaluation_source` — la
  procedencia visible en la Ficha dice «Evaluación CTC · Q-Grader en bache», no se disfraza de
  Arena. El trigger M3 (muestra solo con inscripción y en `apto`) NO cambió, a propósito.
- **Docs**: guardián nuevo `scripts/qa-evaluaciones-check.mjs` (la firma del veredicto no acepta
  grados, la procedencia propia, el Club en un solo sitio, las tres secciones, GAL antes que ARE);
  banner V5.17 sobre la sección «The Arena pipeline» del HANDOFF (barrido completo en V5.19).

## [V5.16] — 2026-08-21 (commit c2fc0a1)

- **Hito**: **el panel del productor se rehace en CINCO interfaces** detrás de una barra de
  navegación inferior fija — Mensajes · Ecosistema · **Mi Perfil** (al centro) · Evaluaciones ·
  Contratos — según los mockups del owner (bloque B del review V5.0, ítems B3/B4: el panel se
  rehace ANTES de recorrer el bloque). La rejilla de doce tarjetas y los dos FABs flotantes se
  retiran; cada interfaz vive en `src/components/kaffetal-regal/panel/` y `AppDashboard` queda como
  cascarón. Fase 1 de 4 del plan V5.16→V5.19 (la escalera de etapas, las ofertas/subastas y la
  Arena-vitrina llegan en las siguientes).
- **Añadido**: **Mi Perfil** — Información general + Mis Fincas + Mis Lotes como carruseles (lo
  nuevo empuja lo viejo a la derecha); la flecha de cada sección abre la lista completa con filtros
  (Visa EUDR para fincas, etapa para lotes). **Ecosistema de Valor** — las plataformas de la red
  como tarjetas que VOLTEAN: Directorio, Herramientas y Coffeed abren su plataforma; CTC Tech y
  Varietales abren su solicitud especializada aquí mismo; Terratalento va en gris («En
  desarrollo») y solo registra interés. **Mensajes y Notificaciones** — reemplaza a
  «Retroalimentación y ayuda» y absorbe «Mis solicitudes»: una sola bandeja con dos filtros, la
  partición sigue siendo por CAMPO (`panel/mensajes.ts`, `partirFeed`). La barra inferior lleva la
  insignia de notas sin leer.
- **Cambiado**: el contrato `?m=<módulo>` (V4.34) por fin se LEE: cada clave de la rejilla vieja
  aterriza en su pestaña nueva (`LEGACY_MODULE_TO_TAB`), con el drill abierto para `fincas`/`lotes`
  — los enlaces de vuelta de la concha de herramientas y los marcadores viejos siguen funcionando.
  El botón «Atrás» del teléfono: el drill cuenta como capa de historial; cambiar de pestaña no.
- **Retirado**: los dos FABs (`SideModuleFabs`), el `ToolPanel` embebido con su `KR_TOOL_COPY` y
  «Solicitar Plus» (decisión del owner: la tarjeta de Herramientas ABRE la plataforma y el Plus se
  administra allá), y el módulo de Jornadas de Recolecta (Terratalento queda en gris hasta su
  lanzamiento; su lado ECP no se toca). Evaluaciones y Contratos son por ahora TRASPLANTES de los
  módulos Arena+Certificación y Mis contratos — se reconstruyen en V5.17/V5.18.
- **Docs**: guardián nuevo `scripts/qa-kr-panel-check.mjs` (las 5 pestañas, el mapa `?m=`, la pila
  de «Atrás», los FABs fuera, y la trampa V4.30 de los CSS modules en los 8 archivos del panel);
  `qa-solicitudes-kr-check.mjs` re-apuntado a `panel/mensajes.ts`/`MensajesTab`.

---

## [V5.15] — 2026-08-20 (commit c64beb6)

- **Cambiado**: el **Estándar CTC de Almacenamiento de Pergamino es bilingüe en TODAS las
  superficies** (owner: «en ambos idiomas, y en los formularios de KR sobre todo en español»). La
  V5.14 lo tradujo solo en el formulario del productor; quedaban en inglés puro el editor EUDR del
  OCP (tres sitios), el Expediente EUDR de la finca y el Certificado EUDR del lote. Ahora todos
  dicen «Estándar CTC de Almacenamiento de Pergamino · CTC Parchment Storage Standard» — el
  español dice qué es, el inglés es el nombre registrado con el que el documento viaja a Europa. En
  el formulario de KR el inglés queda en pequeño y entre paréntesis: ahí el que lee es el
  caficultor.
- **Docs**: verificación de la V5.14 contra las filas REALES de producción, ejecutando
  `fincaEudrStatus`/`lotEudrStatus` de verdad sobre las cinco fincas y los cuatro lotes: las dos
  fincas aprobadas con expediente remitido siguen «Visa vigente» (cero regresión); **Palmas — el
  caso exacto del reporte — pasa de la falsa «Visa vigente» a «Visa en revisión por CTC» con su
  botón Aprobar habilitado**, y su lote deja de decir «Sello listo». Las dos incompletas siguen
  «Visa en trámite», que es del productor.

---

## [V5.14] — 2026-08-20 (commit 7e11014)

- **Hito**: primera tanda de la revisión de **Kaffetal Regal y el OCP que lo administra**, sobre
  retroalimentación del owner con capturas de un teléfono real. Catorce puntos, y tres de los
  reportados resultaron ser **síntomas de un mismo defecto**.
- **Corregido**: **la Visa EUDR se afirmaba sola.** `fincaEudrStatus()` derivaba la Visa ÚNICAMENTE
  de lo que contestaba el productor y **no leía `fincas.status` en ninguna parte**. De ese único
  agujero salían los tres síntomas reportados: la finca decía «Visa vigente» **antes** de que el OCP
  la aprobara; aprobarla no cambiaba nada visible; y **«Rechazar» parecía no hacer nada** —sí escribe
  el estado rechazado y su fila de auditoría, pero nadie miraba ese campo—. Ahora la función se parte
  en dos: `fincaEudrDeclaracion()` juzga el expediente del productor (y es lo que gatea
  `approveFinca`, o haría falta estar aprobada para poder aprobarla) y `fincaEudrStatus()` le aplica
  encima el veredicto: **en revisión → aprobada · expediente sin remitir → vigente**, y **rechazada**
  cuando lo está. El Sello del lote hereda los estados nuevos, así que un lote deja de tener «Sello
  listo» con su finca sin aprobar. Sin migración: `status` y `eudr_cert_shared` ya viajaban al
  cliente, y las dos fincas aprobadas de producción ya tenían el expediente remitido.
- **Corregido**: **la FT2 no tenía ningún impasse — tenía un botón tapado.** Los FABs («Ayuda» y
  «Guardar Ficha») estaban `position:fixed` en la esquina inferior derecha del viewport, que es
  exactamente donde la barra pegajosa pone «Completar FT2 y continuar». En un teléfono se posaban
  encima: se tocaba el FAB creyendo tocar el botón y la etapa no avanzaba nunca. Ahora la botonera va
  **anclada a la barra** (`absolute` contra el `sticky` en la Ficha, `sticky` al pie del pop-up en
  Finca) y se apila en vertical, como manda la casa. Ninguna altura de barra puede volver a
  solaparla.
- **Corregido**: la fila de acciones no podía envolver, así que en 375 px el botón que se salía por
  la derecha era el principal. Ahora envuelve, y por debajo de 520 px se apila a lo ancho.
- **Corregido**: **la granulometría solo sabía avisar de un lado.** Como el Residuo absorbe la
  diferencia, la suma daba «100,0 %» siempre que las mallas pesaran de MENOS: pesar una de seis y
  olvidar las otras cinco salía impecable, con un Residuo del 75 % que nadie leía como error. El
  veredicto ahora distingue **se pasó** (y en cuántos gramos), **faltan mallas por pesar** (y cuántos
  gramos quedan sin repartir) y **cuadra**. Se añade además la instrucción que faltaba: tamizar el
  grano sano, y que el Residuo no se teclea.
- **Añadido**: en B3, **el factor de rendimiento del propio productor**, opcional, junto al
  calculado. El campo existía pero enterrado en B1, otra sub-etapa: aquí, donde el número se calcula
  delante de él, ya puede decir «a mí me dio otro». No toca el cálculo; los dos viajan a CTC.
- **Añadido**: **«📍 Estoy aquí»** en el mapa de la finca. Quien está parado en la mitad de su predio
  no debería tener que encontrarse a sí mismo en un satélite arrastrando con el dedo. Un mensaje
  distinto por cada causa de fallo (permiso denegado · GPS lento · error), porque «no se pudo» no le
  dice a nadie qué hacer.
- **Añadido**: en A3, el **atajo del puntaje**. Quien adjunta ahí una foto de su hoja de catación
  suele ponerse después a teclear los diez atributos SCA a mano. El camino corto ya existía en B2
  («Solicitar oficialización», con adjunto, que aterriza en la cola del BCP) pero no lo descubría
  nadie: ahora aparece la señal, con su botón, en cuanto hay un adjunto.
- **Cambiado**: **el aviso de compuerta dice QUÉ falta y DÓNDE.** Recitaba la etapa entera —«Complete
  A3, A4, B2 y B3»— aunque solo faltara una cosa, y había que abrir las cuatro para averiguar cuál.
  Ahora lista solo lo que falta, con el índice del pane y el dato concreto («B3 · Física ·
  Granulometría → el Trillado Verde Restante»), y dura 9 s en vez de 3,2 porque ahora hay algo que
  leer.
- **Cambiado**: **«Solicitar revisión de datos» deja de abrir el correo.** Un `mailto:` sacaba al
  productor de la plataforma para pedir algo sobre la plataforma: la petición caía en una bandeja
  suelta, sin quedar atada a la finca ni aparecer en «Retroalimentación y ayuda» —y en el teléfono de
  un caficultor a menudo no abre nada—. Ahora va por el **canal interno** (`producer_comm_log`), con
  la finca como contexto.
- **Cambiado**: en «Retroalimentación y ayuda» el productor se llama **por su nombre** en sus propios
  mensajes, no «Usted» —que es como le habla CTC a él, no como se nombra él—.
- **Cambiado**: el **riesgo del producto del cuestionario EUDR se pregunta al derecho**. Pedirle al
  caficultor que marque lo malo de su propio café se lee como una acusación, y era la única casilla
  de la pantalla que EMPEORA su perfil al marcarla. Ahora marca lo que **sí** cumple. Es un cambio de
  redacción, no de datos: se sigue guardando la lista de factores negativos, así que ninguna finca ya
  registrada cambia de significado.
- **Cambiado**: el **Estándar CTC de Almacenamiento de Pergamino** se dice en español, con el nombre
  registrado en inglés entre paréntesis —viaja así en el expediente y en el certificado del lote, que
  los lee un comprador europeo—.
- **Cambiado**: **el bucle de la portada de KR sube de `.32` a `.50`** y el velo se aligera. Segunda
  vez que el owner pide lo mismo («apenas se ve que hay algo detrás»); la subida del 14 de agosto se
  quedó corta. Medido contra el fotograma **BLANCO** del bucle, como exige el comentario que dejó
  aquella: la columna del titular cae en ~rgb(32,49,40), que contra el marfil del h1 da **12,4:1** en
  escritorio y **8,2:1** en el peor punto del móvil (la AA pide 4,5; la AAA, 7).
- **Cambiado**: **objetivos táctiles para dedos de caficultor**. `.btn-sm` medía 31 px de alto y las
  casillas 13 px, muy por debajo de los 44 px de la WCAG 2.2. La compuerta es `pointer:coarse`, no el
  ancho de pantalla: lo que decide es con qué se toca. El OCP en portátil no engorda un píxel.
- **Cambiado**: **los pop-up de revisión del OCP dejan de ser estrechos**. Heredaban los 560 px de un
  formulario de contacto, subidos a mano a 680/720 con un `style` en línea. Un expediente de finca en
  720 px de un portátil de 1440 obliga a desplazar dentro de una caja con media pantalla vacía al
  lado. Clase compartida `.modal-wide` = `min(1180px, 94vw)`.
- **Corregido**: el formulario de finca **se salía del pop-up por el ancho** —y lo que se sale por la
  derecha de una caja que solo desplaza en vertical no se puede alcanzar de ninguna forma—.
  `min-width:0` en las rejillas, pestañas que desplazan solas, y la tabla de mallas encerrada en su
  propio contenedor.
- **Corregido** *(ajeno a esta tanda, encontrado al pasar el gate)*: `qa-tools-seo` llevaba **rojo
  desde la V5.7**. `mapa-variedades` y la rueda del sabor cerraban su meta description con «Coffee
  Tools · CTC.» / «Herramientas del Café · CTC.» en vez del sufijo de la casa. Corregidas en el
  archivo y espejadas en la columna `meta_description`, que es lo que el guardián compara.
- **Docs**: **dos guardianes nuevos, los dos probados revirtiendo el arreglo** (cantan ese caso y
  solo ese). `qa-visa-check` (30 comprobaciones) fija que la Visa no se afirme sin veredicto, que
  Rechazar se vea, que aprobar siga siendo posible, y —el fallo mudo de verdad— que **todo el que
  arma un `FincaEudrFields` desde su propio SELECT traiga `status` y `eudr_cert_shared`**: sin esas
  columnas la compuerta de Arena habría cerrado el pago y el recibo de muestra de fincas ya
  aprobadas, sin un solo error en consola. `qa-kr-ficha-check` (212) fija que ningún FAB vuelva a ser
  `position:fixed`, que la fila de acciones envuelva, la aritmética de la granulometría en los dos
  sentidos, y que toda clase de CSS module usada EXISTA (la trampa de la V4.30: `.noteBox` se estrenó
  en esta tanda en una hoja donde no estaba definida).

---

## [V5.13] — 2026-08-20 (commit 10b0cfb)

- **Corregido**: el «Volver a CTC Web Platform» de `/recuperar-acceso?puerta=panel` aterrizaba en la
  **portada de CTC Home**, no en `/login`. `hrefPuerta()` recortaba la base de la superficie del
  camino —correcto en un subdominio, que ya la sirve y a quien el proxy se la vuelve a anteponer—
  pero el login maestro **no tiene subdominio propio**: recortarle `/login` de `/login` dejaba la URL
  desnuda. Ahora la rama se elige por si la ruta tiene subdominio, no por el camino. Detectado en la
  verificación en vivo de la V5.12.
- **Docs**: `qa-recuperacion-check` sube a **154** comprobaciones con la que faltaba, y que es la que
  de verdad importa: **simula la reescritura de `proxy.ts`** sobre cada URL de producción y exige que
  el resultado sea exactamente el camino de la puerta. La comprobación vieja —absoluta y de
  `ctcexport.com`— la pasaba el enlace roto sin despeinarse. Probada revirtiendo el arreglo: canta
  ese caso y solo ese.

---

## [V5.12] — 2026-08-20 (commit 0bfc6a1)

- **Hito**: **«Recuperar acceso» existe**. Hasta hoy la red tenía **siete puertas de entrada y cero
  formas de volver**: quien olvidaba su contraseña perdía la cuenta para siempre, salvo que un
  operador del BCP le emitiera una temporal a mano — y para un productor de Kaffetal Regal, un
  comprador de Cherry Picked, un experto del Directorio o un recolector de Terratalento no había ni
  eso. `grep resetPasswordForEmail` no devolvía una sola línea en todo el repo.
- **Añadido**: `/recuperar-acceso` — **UNA** superficie para las **once** puertas (las cinco
  plataformas públicas, los cinco nodos de socio y el login maestro). Se sirve desde la **raíz en
  todos los hosts** gracias a la lista `RAIZ_COMPARTIDA` nueva de `src/proxy.ts`; sin ella el
  subdominio le antepondría su base y daría 404 justo en la pantalla a la que llega quien ya no
  puede entrar. Segundo tramo en `/recuperar-acceso/[token]`, con las mismas reglas de contraseña
  que el cambio forzado del panel (ahora compartidas, no duplicadas).
- **Añadido**: el enlace «¿Olvidaste tu contraseña?» en **las siete puertas** — Kaffetal Regal,
  Cherry Picked (en sus tres idiomas), Directorio del Café, Terratalento, Herramientas del Café, los
  nodos de la Red de Socios y `/login`. Solo aparece al ENTRAR: en «Crear cuenta» no hay contraseña
  que olvidar.
- **Seguridad**: **la pantalla dice la verdad** (decisión del owner, 2026-08-20). Si el correo no
  existe se dice, si esa cuenta entra con Google se dice, y cada veredicto termina en una SALIDA
  —crear cuenta, botón de Google, escribir a CTC— en vez de en un callejón. Es una excepción
  deliberada a la regla de la casa de no confirmar qué cuentas existen: el usuario real de esta red
  es un caficultor que teclea mal su correo, y con el mensaje genérico de «si existe, te llegará»
  ese error queda invisible para siempre. La base ya traía el caso: `ete0109@yahoo.com` conviviendo
  con `etel0109@yahoo.com`.
- **Seguridad**: el vale es de un solo uso, se guarda **hasheado** (sha256 sobre 32 bytes de
  `randomBytes`), caduca en 60 minutos, tope de 3 por cuenta cada 15 minutos, y pedir uno nuevo
  quema los anteriores. Un envío que falla **anula el vale** en vez de reportar éxito — misma
  lección que el OTP del panel: dejar la fila viva quemaba un intento por un fallo que no era del
  usuario. Lo que viaja en la URL es `?puerta=<id>`, un identificador saneado contra la lista, nunca
  un destino: aceptar un `?volver=<url>` habría sido un redirect abierto **en la pantalla de
  recuperar la contraseña**.
- **Cambiado**: no se usa `supabase.auth.resetPasswordForEmail()`, y el porqué está escrito en
  `lib/auth/recuperacion.ts`. El suyo no sabe (1) que tres usuarios de la casa son etiquetas
  `@ctcexport.com` **sin buzón** y su enlace tiene que ir al `delivery_email` de
  `panel_users`/`partner_accounts` — mandárselo a su propio usuario los dejaría fuera para siempre
  sin que nada fallara de forma visible —, (2) que 8 de las 29 cuentas entran **solo con Google** y
  no hay contraseña que recuperar, y (3) responder si la cuenta existe. Y una cuarta, práctica: su
  enlace obliga a mantener una allowlist de redirecciones con 19 subdominios dentro.
- **Datos**: migraciones `password_reset_tokens` (el vale: RLS activa y **cero políticas**, patrón
  service-role de la casa) y `buscar_identidad_para_recuperacion` — una función `security definer`
  que resuelve el correo contra `auth.users` con un índice, en vez del `admin.listUsers()` que se
  traería la tabla entera. Con su `revoke` explícito a `public`/`anon`/`authenticated`: Postgres
  concede EXECUTE a PUBLIC por defecto, y sin él cualquiera con la clave anon podría preguntarle a
  la base por el estado de credencial de cualquier correo.
- **Corregido**: quien recupera con el correo **sin confirmar** queda confirmado de paso — abrir el
  enlace ES la prueba de posesión del buzón. Sin eso, la cuenta sin confirmar de la base recuperaría
  su contraseña y seguiría sin poder entrar. Y si venía de una temporal del BCP, el
  `must_change_password` se limpia: la persona acaba de elegir la suya.
- **Docs**: guardián nuevo `scripts/qa-recuperacion-check.mjs` (**143** comprobaciones), probado
  saboteando a propósito el enrutado al `delivery_email` para confirmar que canta.

---

## [V5.11] — 2026-08-20 (commit b73d73b)

- **Retirado**: el **GVG-Space** sale de la plataforma. Se extrajo el **CV App Manager** — sus once
  archivos de interfaz y sus nueve de lógica, unas 6.500 líneas — y se montó como servicio del
  **CommaaS Hub**, en `cv.commaas.cloud`. Era el último submodulo del espacio, así que el espacio se
  va con él: fuera el grupo owner-only del rail del BCP, la tarjeta del índice y el nodo del diagrama
  de estructura. Estaba previsto desde la decisión A8 del tablero del 2026-08-17.
- **Seguridad**: con la mudanza **desaparece el candado de contraseña del espacio** (la cookie HMAC
  de 12 h sobre `platform_settings.gvg_space_lock`). No se sustituye por otro candado: en CommaaS el
  permiso es un grant por persona, que se revoca sin cambiársela a nadie más y deja rastro de quién
  entró. Una contraseña compartida no podía hacer ninguna de las dos cosas.
- **Añadido**: `src/lib/panel/salidasDeLaPlataforma.ts` — la lista de los módulos que se **fueron**
  del edificio, hermana de `rutasMovidas.ts` y aparte de ella. Esa lista describe mudanzas ENTRE
  consolas y su guardián exige que el destino tenga página en este repo; aquí el destino es otro
  dominio. Dos talones 308 la usan: `/bcp/gvg/[[...resto]]` y `/ecp/gvg/[[...resto]]`. La regla F2
  sigue en pie — una URL vieja no muere, y la del ECP se REAPUNTA al destino final en vez de
  encadenarse contra el talón del BCP.
- **Cambiado**: `USOS.gvgMatch` y `USOS.gvgReporte` salen de `src/lib/ai/consumo.ts` (de siete vías
  de gasto a cinco) y `qa-consumo-check` deja de exigir el registro en los dos archivos que ya no
  existen. Las filas históricas de `ai_usage` conservan `gvg:match` y `gvg:reporte`, y el tablero de
  Consumo las sigue mostrando: un libro no se reescribe hacia atrás.
- **Datos**: **nada se borró**. Las siete tablas `public.gvg_*` (1 perfil, 18 experiencias, 7 rutas,
  4 muestras, 14 postulaciones, 56 eventos, 2 reportes) y los archivos de `kaffetal-media/gvg/…`
  siguen donde estaban. La copia al hub la hace `scripts/migrate-cv-from-ctc.mjs` de aquel repo, que
  tampoco borra el origen; dar de baja estas tablas es una decisión posterior del owner, cuando haya
  visto la app funcionando allá con sus datos.
- **Docs**: `docs/HANDOFF.md` — la sección del GVG-Space pasa de describir el módulo a describir su
  salida: qué queda aquí, qué cambió al mudarse (el candado, las tablas de una sola fila que ganaron
  `user_id`, el fin del `service_role`, el nombre que salió del código) y qué lecciones sobrevivieron
  intactas en el otro repo.

## [V5.10] — 2026-08-20 (commit 23fd5d6)

- **Añadido**: **«Regenerar»** en Redacción — la primera generación real falló por credenciales y
  la noticia quedaba `elegida` sin forma de reintentarla. Rehace la entrega **solo mientras siga
  esperando luz verde**: lo aceptado o publicado no se reescribe por detrás, porque ya es contenido
  que alguien aprobó.
- **Cambiado** (disciplina de coste, palabra del owner: «use smaller models and avoid work that can
  be done programmatically»): el redactor pasa a **Haiku** (`MODELO_REDACTOR = MODEL_CHEAP`) —
  ~$0.005 por capítulo frente a ~$0.010 con Sonnet, que además sube a ~$0.016 el 1 de septiembre
  cuando caduca su precio de lanzamiento. Escribir 7 paneles a partir de un titular no es una tarea
  de razonamiento. Subir de modelo sigue siendo cambiar UNA constante.
- **Cambiado**: el techo de salida baja de **2200 a 1400** tokens — un cap generoso no es una red de
  seguridad, es divagación pagada.
- **Cambiado**: la **portada de Gemini es opcional y explícita** (casilla «Con portada · lo más
  caro», encendida por defecto pero a un clic de apagarse). Lo caro se pide, no se da por hecho.
- **Docs**: `docs/CLAVES_IA_Y_COSTE.md` — dónde va cada clave, **cómo distinguir «falta la clave»
  de «la clave está revocada»** por el aviso que viaja con la entrega, el coste medido de cada paso,
  y dónde se iba el dinero de verdad: el **barrido agéntico** del Estudio (`webSearch: 5` × 14
  medios = hasta 70 búsquedas facturadas por vuelta), que la ingesta por RSS de la V5.9 ya
  reemplaza por **$0**.
- **Cambiado**: `qa-redaccion-check` 31 → **41** — el modelo barato en el import (el comentario sí
  lo nombra, para explicar cómo escalar), el cap ajustado, la portada opcional, el rehacer que se
  niega sobre lo aprobado, y que la ingesta no llame a ningún modelo.

## [V5.9] — 2026-08-20 (commit d33b187)

- **Hito** (A12, arranca el bloque Coffeed de la revisión V5.0): nace **Redacción** — el módulo del
  ECP **entre Entregas y Muro**, donde el owner lo señaló. Cierra el pendiente que el spec dejó
  escrito («falta el barrido automático»): el muro deja de depender de posts puestos a mano.
- **Añadido**: la **bandeja de noticias** — los feeds de la lista blanca (los mismos que alimentan
  el ticker de la portada) entran solos, por tandas y con dedupe por URL; al abrir el módulo, si el
  último refresco pasa de 6 h, se refresca solo. Ventana de 14 días; solo piezas con fecha.
- **Datos**: **cuatro medios colombianos** (owner): El Tiempo · Economía, El Espectador, La
  República · Globoeconomía y Agronegocios — feeds VERIFICADOS en vivo antes de insertarlos, y con
  **filtro de café** (`coffeed_sources.keywords`, comparación sin tildes): sin él, la bandeja sería
  la portada de un diario. Perfect Daily Grind ganó el feed que le faltaba. El ticker hereda los
  medios nuevos por leer la misma lista.
- **Añadido**: elegir una noticia dispara el **generador**: Claude (MODEL_WRITE, libro de consumo)
  escribe el capítulo **elaborado** — 7 paneles con papeles (apertura → contexto → desarrollo →
  implicación → mirada CTC → cierre), cada uno 2-4 frases COMPLETAS que se entienden solas: la
  respuesta directa al «too simple and almost not understandable» del owner — y **Gemini** pinta la
  portada (4:5, sin texto). La entrega nace **«entregado»** en la cola de Entregas: producir es del
  taller (aunque el taller sea automático); la luz verde y el publicar siguen siendo de la consola.
- **Añadido**: `coffeed.redaccion.post_creado` → `integration_events` (ventas_marketing) — el
  gancho para el escenario de Make que el owner cuelgue (compartir a Instagram, avisos…).
- **Añadido**: el sobre polimórfico aprende **`kind: noticia`** de punta a punta — la cola de
  Entregas la previsualiza con su portada, su fuente y el AVISO del generador (si salió el
  borrador determinista, quien da luz verde lo sabe), y el muro la pinta con la tira de paneles
  del carrusel + la fuente citada al pie: la trazabilidad es la premisa de Coffeed también aquí.
- **Cambiado**: la bandeja se hojea en **Cover Flow** (las constantes de Cool PDF, como en el
  taller de Herramientas); las portadas son papel de exportación — medio, titular en serifa,
  fecha. Sin IA ni Gemini el módulo sigue operable: borrador determinista y entrega sin portada,
  ambos avisando.
- **Añadido**: guardián `qa-redaccion-check.mjs` (**31**) — el filtro de café EJECUTADO con casos
  reales, el dedupe upsert-ignore, el contrato del `saltar` por id (un medio caído encabezaría
  cada tanda para siempre), el orden Entregas → Redacción → Muro, y el fallback sin claves.

## [V5.8] — 2026-08-20 (commit c3ebfbe)

- **Cambiado** (owner, con la referencia en la mano): el taller pasa a **Cover Flow** — la mecánica
  de `RENDER.flow` de **Cool PDF**, transplantada con sus constantes exactas (rotateY 54°, z −170,
  escala −.14, brightness −.38, `perspective:1500px`). Se conduce con arrastre, rueda horizontal,
  flechas y teclado; la portada del centro tiene su ficha debajo, con la salida. Las carátulas que
  volteaban de la V5.7 se retiran: no eran lo que se pidió.
- **Cambiado** (owner): **dos estantes** — «Tus herramientas» arriba y **«Herramientas Plus»** en su
  propio Cover Flow debajo. El reparto es por NIVEL, no por si la cuenta lo abre: una Plus activa
  sigue siendo Plus, y verla en su estante con el sello **ACTIVA** era justo lo que faltaba.
- **Añadido** (owner): **«Obtener Herramientas Plus»** arriba del taller — explica qué es el nivel
  Plus y, en un SEGUNDO gesto, manda la solicitud. No inventa tabla: crea una fila de
  `tool_access_requests` por cada Plus que la cuenta no abre (la misma cola del ECP, el mismo
  conceder deliberado), avisa por correo y nunca pide lo que ya se tiene.
- **Cambiado** (owner, con captura): abrir una herramienta mostraba **CUATRO filas** antes del
  contenido. Ahora es **UNA cinta de 38px** — logotipo, nombre, «Volver a Herramientas» y una
  **rueda dentada**. Dentro de la rueda: Mis trabajos, todas las herramientas, **Mi Red**, la
  cuenta y la salida. La concha ya no repite su cabecera en pantalla completa y la línea de sesión
  se queda en el nombre del trabajo y su estado de guardado.
- **Añadido** (owner): **«Mi Red»** en la rueda — Directorio del Café y Coffeed siempre; Kaffetal
  Regal **o** Cherry Picked según lo que la cuenta ya sea. Si todavía no es ninguna de las dos, no
  se nombra ninguna: ofrecer las dos sería empujar a elegir, y la exclusión productor ⊕ comprador
  es de la matriz, no de un menú.
- **Añadido** (owner): el **logotipo de la superficie** corona la puerta de acceso y preside el
  hero de la landing (el rótulo de texto que hacía de marca sobra con él delante).
- **Cambiado**: `qa-taller-check` 49 → **65** — las constantes de Cool PDF, los dos estantes, la
  rueda y su evento, la cinta sin cabecera repetida, el Plus que explica antes de pedir y los dos
  logotipos.

## [V5.7] — 2026-08-20 (commit efd3633)

- **Cambiado** (owner): el taller deja la lista por **CARÁTULAS que voltean** — la captura es la
  portada; tocarla gira la tarjeta (rotateY, la mecánica del Sneak Peek) y el reverso trae el
  detalle y las salidas. Tocar-para-mirar y tocar-para-abrir son dos gestos distintos a propósito.
- **Corregido** (owner: «tenía Plus y nada me lo decía»): el estado Plus se dice **con todas las
  letras** — arriba del taller («Plus ACTIVO en tu cuenta: abres N de M») y en el reverso de cada
  carátula («Plus · ACTIVA en tu cuenta» / «se activa por solicitud»). La cuenta del owner abre
  Plus por la activación heredada de la red y ahora la pantalla lo celebra.
- **Añadido** (owner): dos altas desde `reference_html_tools` — **la rueda del sabor V23** entra
  como versión 2 publicada de `catacion`, y **Coffee Varieties Map** (V18) como herramienta nueva
  (`mapa-variedades`, en, default, KR/CP/web). Ambas con puente, guía, captura y espejo SEO.
- **Añadido**: el Home Menu gana sustancia — cada trabajo lista su **resumen** (línea derivada del
  estado que el puente manda al guardar; `CTC.usarResumen` para afinarla) y un **acordeón**
  «¿Qué es esta herramienta y cómo funciona?», CERRADO por defecto, con la **guía** nueva de cada
  herramienta (columna `tools.guia`, editable en la ficha del ECP; escritas las 13).
- **Añadido**: `qa-tools-puente-conformance.mjs` (playwright) — la revisión herramienta por
  herramienta que pidió el owner: ready, captura del centinela y restauración tras recarga.
  **12/12 en orden**: 8 con el circuito completo (captura+resumen+restaura) y 4 SIN-CAMPOS
  anotadas (narrativas/lienzo: agtron, cool-pdf, formula-calidad, viaje-cafe — su memoria útil
  llegará por `CTC.usarEstado`). El arnés pagó dos trampas: un goto lento que navegaba a mitad de
  prueba, y el centinela de texto que un `input[type=number]` sanea a «» sin fallar.
- **Datos**: `tool_sessions.resumen` y `tools.guia` (aditivas). `qa-taller` 43 → **49**;
  `qa-tools-seo-espejo` 74/74 con las dos altas espejadas.
- **Docs**: el trabajo pasa al árbol real `C:\dev\ctc-platforms\ctc-platform` (el clon de
  OneDrive queda retirado).

## [V5.6] — 2026-08-19 (commit fcbb85b)

- **Añadido** (segunda pasada del owner sobre el taller, probado en producción): la **barra del
  taller** — marca, «Mis herramientas», el correo de la sesión y **Salir**. El botón avisa que
  salir cierra la identidad única en toda la red (la cookie es una sola — es la otra cara de
  entrar una sola vez).
- **Cambiado**: **pantalla completa en las tres superficies** — la página de una herramienta deja
  la columna de 1180px: la concha llena la ventana (100dvh), la cabecera se aprieta a una línea y
  el marco se queda con todo el alto. Vale para el taller, Kaffetal Regal y Cherry Picked.
- **Cambiado**: el taller enseña **las mismas capturas del carrusel** en sus tarjetas
  (`CapturaMiniatura`, con la misma caída a logo si falta el archivo).
- **Cambiado**: **el puente va en las ONCE herramientas vivas** (antes solo costo-empaque) y
  `soporta_memoria` queda encendida para todas — la archivada se queda fuera: retirada es
  retirada. En las herramientas sin campos que serializar (el disco Agtron, el viaje) el trabajo
  guarda poco, pero el menú y el nombre valen igual; `CTC.usarEstado` queda para cuando quieran
  guardar su estado propio.
- **Cambiado** (el contraparte del panel): el registro del ECP gana la columna **«Memoria»** al
  lado de Nivel — el estado del puente se ve de un vistazo, sin abrir cada ficha (la casilla para
  cambiarla ya estaba desde V5.4).
- **Cambiado**: `qa-taller-check` 29 → **43** — las once herramientas con puente, la salida en la
  barra, la pantalla completa en las tres superficies y las capturas del taller.

## [V5.5] — 2026-08-19 (commit cc954f3)

- **Añadido** (A8b, pregunta del owner al probar la puerta): **«Entrar con Google»** en
  `/herramientas/acceso` — el séptimo callback de la casa
  (`/herramientas/auth/callback`, patrón de KR/Directorio). El callback **no promueve
  roles**: entrar por Herramientas solo identifica; una cuenta nueva queda en el default
  inerte y el taller le explica las tres puertas de la membresía.
- **Docs**: la URL completa del callback debe estar en la allowlist de Supabase
  (Authentication → URL Configuration → Redirect URLs):
  `https://herramientas.ctcexport.com/herramientas/auth/callback`. Si falta, Google
  completa igual pero aterriza en el Site URL CON sesión (la cookie es compartida) —
  degradado, no roto.
- **Cambiado**: `qa-taller-check` aprende el camino Google (25 → 29).

## [V5.4] — 2026-08-19 (commit b7baa12)

- **Hito** (A8–A11): **Herramientas del Café se convierte en una aplicación semi-independiente**
  — el owner lo pidió así en la revisión V5.0: subir versiones y apps nuevas continuamente,
  conectadas a base de datos para que los usuarios conserven su trabajo, y capaces de empujar
  información al resto del ecosistema. Documento de referencia: `docs/HERRAMIENTAS_TALLER.md`.
- **Cambiado** (A8): la landing **ya no abre herramientas** — enseña un **carrusel de capturas
  reales** (cinta rAF como el Sneak Peek: velocidad sin saltos, pausa al pasar, respeta
  `prefers-reduced-motion`) con nombre y descripción, y manda al taller. Capturas por
  `scripts/build-tool-shots.mjs` (playwright, devDependency; 11/11 generadas y comiteadas — el
  modelo de las tarjetas OG). Una herramienta sin captura cae a tarjeta de texto, no a un hueco.
- **Añadido** (A8): la **puerta** `/herramientas/acceso` — la identidad única de la red: entra la
  misma cuenta de Kaffetal Regal, Cherry Picked **o el Directorio del Café** (la membresía ganó
  la tercera puerta en `accesoHerramienta.ts` / `matriz.ts`; la cookie ya viajaba entre
  subdominios). Sin registro aparte; con sesión, la puerta ni se ve.
- **Añadido** (A9): el **taller** `/herramientas/taller` — todo el catálogo compartible con el
  estado a la vista: una Plus bloqueada **se lista** con candado y «Solicitar» (antes ni salía;
  el owner lo señaló con razón). El taller no filtra por la columna `web`: es la casa de las
  herramientas; el reparto por superficie sigue mandando en KR/CP/DC.
- **Corregido** (A10): en la superficie web ahora EXISTE dónde solicitar una Plus — la concha
  bloqueada ofrece el «Solicitar» de siempre (`tool_access_requests` → se concede a mano en el
  ECP, como estaba diseñado).
- **Añadido** (A11): **trabajos guardados** — el Home Menu que pidió el owner («a name and a time
  stamp list to retrieve them»): crear con nombre, retomar, borrar; autoguardado con indicador
  veraz («Guardando…» / «Guardado HH:MM» / el error). `tool_sessions` service-role-only; cada
  verbo comprueba sesión + veredicto + propiedad; techos de 200 KB y 40 trabajos.
- **Añadido** (A11): el **puente** `public/tools/ctc-bridge.js` — una herramienta se vuelve «con
  memoria» con UNA línea en su HTML + la marca «Con memoria (puente)» en el ECP. Serializa los
  campos solo (o `CTC.usarEstado` para estado propio) y expone `CTC.emitir()` →
  `integration_events` (`it_plataforma`), el canal para empujar al ecosistema. Referencia viva:
  `costo-empaque`. La concha valida `source` y `origin` y nunca habla con `*`.
- **Datos**: `tool_sessions` (RLS encendida, cero políticas) + `tools.soporta_memoria`;
  el ECP gana la casilla en la ficha de cada herramienta.
- **Añadido**: guardián `qa-taller-check.mjs` (25) — propiedad en cada verbo, validación de
  origen del puente, el redirect fuera del try, la trampa del `%20` de `pathname` en Windows
  (pagada una vez: la primera corrida de capturas escribió once archivos en una carpeta
  literal `%20` sin fallar nada). `qa-herramientas-acceso-check` aprende la puerta del DC
  (26 → 31).
- **Docs**: `docs/HERRAMIENTAS_TALLER.md` + sección en el HANDOFF. Pendiente a propósito:
  Google OAuth en la puerta (exige callback + allowlist de Supabase) y capturas por versión.

## [V5.3] — 2026-08-19 (commit 5c20bc4)

- **Cambiado** (A4, CTC Home): en el índice de la red, **Herramientas del Café y Varietales
  Registrados intercambian su sitio** (es/en/de).
- **Corregido** (A4): la imagen de cabecera de la ventana de información **no estaba centrada** —
  4px de hueco a la izquierda contra 60px a la derecha. El reset global lleva `img{max-width:100%}`,
  que recortaba el `calc(100% + 56px)` de la sangría mientras el margen negativo SÍ se aplicaba.
  Lleva `max-width:none`, y la compensación pasa de 28px a los 32px/16px que de verdad acolcha
  `.modal` — nunca había llegado a sangrar del todo.
- **Cambiado** (A4): un logotipo deja de dibujarse sobre una franja a sangre de 560×150, donde
  ocupaba ~120px y dejaba ~220px de blanco plano a cada lado. Ahora es un **plato cuadrado de
  150px, centrado**: un 70% menos de blanco. Los seis logotipos de las puertas son PNG de paleta
  **sin transparencia** (el blanco va cocido dentro), así que el blanco no se puede quitar por CSS
  — se declara. `cherry-picked-logo.png` sí trae alfa: el día que lleguen los seis re-exportados,
  solo cambia el `background`.
- **Corregido** (A7): la entradilla en **español** decía «el Value Ecosystem» en inglés mientras su
  propio titular, dos líneas más abajo, dice «Ecosistema de Valor». Inglés y alemán no se tocan.
- **Cambiado** (A5): la línea de la **Ley 1581** sale de la entradilla del Directorio y baja a un
  **pie de página propio** (12,5px contra los 14px del cuerpo, tras la salida y con filete). Se
  amplía con las palabras que ya usaba `directorio/Landing.tsx`, en vez de inventar texto nuevo.
  `InfoPanel` gana `footnote`, calificado como `.inner .footnote` porque el global `.modal p`
  (0,1,1) le gana a una clase suelta.
- **Añadido** (A6): las **tres listas de espera se separan** y cada puerta pregunta lo suyo —
  Directorio: correo + especialidad · Herramientas: correo + herramienta de interés ·
  Terratalento: correo + rol + municipio. Un solo componente parametrizado (`NetNewsletter`), no
  cuatro copias.
- **Datos** (A6): `newsletter_subscribers.fields` (jsonb, aditivo) para el campo propio de cada
  fuente, con lista blanca POR FUENTE en la acción; y **`terratalento_interes`**, tabla propia
  —service-role-only, RLS encendida y cero políticas— porque su captación no es una lista de correo
  sino material de investigación: dónde hay manos antes de abrir.
- **Corregido** (A6): la restricción `newsletter_subscribers_source_check` seguía nombrando SOLO
  las tres fuentes viejas. Las altas de Directorio y Herramientas habrían fallado **contra la base**
  aunque el código las diera por válidas. Encontrado probando la forma real contra producción, no
  leyendo el esquema.
- **Añadido** (A6): sus **tres tableros**, que es lo que `qa-crm-interes-check` exige de toda fuente
  nueva — Directorio y Herramientas cuelgan de su página del ECP; Terratalento estrena tablero
  propio (reparto por rol y municipios con más gente, que es lo que decide por dónde se abre).
  El guardián sube de 37 a **55 comprobaciones**.

## [V5.2] — 2026-08-19 (commit 43cc84c)

- **Hito**: arranca **«Launch Beta Testing»** — la primera tanda que sale de la revisión
  pantalla por pantalla de la V5.0. El owner recorre las 19 superficies con una lista de 145
  puntos (bloques A–K) y marca cada uno *Done* o *Fix*; esta entrada recoge lo que trajo el
  bloque A.
- **Cambiado** (A1, CTC Home): el hero llega hasta el **borde inferior de la primera pantalla**,
  así la cinta de mercado —que es su último hijo— aterriza justo ahí en vez de dejar asomando un
  pico de la sección siguiente. `.hero` gana `min-height:calc(100svh - var(--hdr-h))` y pasa a
  ser columna flex; `.heroGrid` se queda el sobrante (`flex:1 0 auto` + `align-content:center`),
  de modo que el titular y los botones quedan ópticamente centrados y las cualidades + la cinta
  se apoyan abajo.
- **Añadido**: `--hdr-h` en `globals.css` — el alto de la cabecera de CTC Home en UN solo sitio
  (95px; 71px por debajo de 560px). La cabecera es `sticky`, o sea que OCUPA sitio en el flujo,
  y el hero tiene que restarlo para acabar exacto en el pliegue. `Header.module.css` lleva una
  nota junto al padding y junto al corte de 560px para que el número no se desincronice en
  silencio.
- **Docs**: `svh` y no `dvh` (con `dvh` la cinta daría un salto al ocultarse la barra del
  navegador en un móvil), y `min-height` y no `height` (una traducción más larga estira el hero
  en vez de recortarlo) quedan razonados en el propio CSS.

> Medido en la app corriendo, con la cinta al ras del pliegue y hueco 0 en los tres tamaños:
> 1512×912 (cabecera 95, hero 817), 1366×700 (hero 605, los botones aún sobre el pliegue en
> y=537) y 375×812 (cabecera 71, hero 741, sin desbordamiento horizontal).

## [V5.1] — 2026-08-19 (commit 511a526)

- **Añadido**: este registro — `CHANGELOG.md`, la vista estándar de consulta por versión, con el
  ciclo V5 entero respaldado (V4.27 → V5.0) y su contrato en la cabecera.
- **Añadido**: guardián `qa-changelog-check.mjs` (105) — la insignia no puede subir sin su entrada,
  los shas se sellan, las viñetas llevan categoría y el respaldo histórico no se recorta. Verificado
  saboteándolo por tres caminos.
- **Docs**: el mapa interactivo lo referenciará en el próximo wrap (anotación + ficha `versionado`);
  la regla del bump en `AGENTS.md` ahora exige la entrada en el mismo commit.

## [V5.0] — 2026-08-19 (commit 388af4e)

- **Hito**: el owner declara la quinta generación — **«Pre-Launch Beta»**. Cierra el ciclo V5 entero
  (plan de reorganización V4.23→V4.35 + lista de nueve pendientes V4.36→V4.45) y es el corte estable
  sobre el que arranca la etapa **«Launch Beta Testing»**. Solo cambia `src/lib/version.ts`: la
  insignia dice V5.0 en las 19 superficies.

> **Wrap V38** (2026-08-19): el ciclo V4.27 → V5.0 quedó compilado en
> `docs/architecture/Documentacion_Interactiva_V38.0(d200bb0).html` — 39 nodos · 128 fichas ·
> 48 trazas · 310 anotaciones.

## [V4.45] — 2026-08-19 (commit 58c5caf)

- **Cambiado**: `/control-panel` fuera del sitemap (19 → 18 URLs) — es la puerta del equipo y el
  sitemap era lo único que seguía nominándola a Google. `platform_surfaces.en_sitemap = false`; la
  página sigue viva en `panel.ctcexport.com`.
- **Corregido**: `mermas-rapida.html` gana `noindex, follow` — la segunda mitad del arreglo del
  2026-08-14: el título se limpió entonces, pero el CUERPO conserva el modo cacao entero (que no se
  toca) y un buscador indexa el cuerpo.
- **Cambiado**: `qa-tools-seo-espejo.mjs` aprende excepciones declaradas (`FUERA_DEL_INDICE`, cada
  una con su porqué).

## [V4.44] — 2026-08-19 (commit a934249)

- **Corregido**: la escala de grados es **de dos en dos** (owner): Black 80–81.99 · Red 82–83.99 ·
  Blue 84–85.99 · Gold 86–87.99 · Tyrian 88–100, con el límite siempre para el grado de arriba.
  El repo la afirmaba mal desde el 2026-08-05 — y Notion coincidía: *dos copias de acuerdo no son
  una verificación*.
- **Cambiado**: tres lotes de la cinta suben de grado (86.25→Gold, 84.50 y 84.25→Blue); códigos
  RD-*→BL-* y fichas PDF regeneradas. La escalera queda 3 Gold · 3 Blue · 1 Black, sin Red.
- **Corregido**: `GradosBoard` pinta la fila «Oficial» desde `GRADOS` (estaba escrita a mano).
- **Datos**: Notion alineado del todo — cinco rangos, cinco definiciones, «Tiryan» → **«Tyrian»**.
- **Cambiado**: `qa-grados-check` 44 → 48 (los cuatro límites enteros, uno por uno).

## [V4.43] — 2026-08-19 (commit 6398217)

- **Datos**: seis relaciones `Grado CTC` de Notion corregidas para cuadrar con su propio `SCA`
  (verificadas con `gradoPorPuntaje()`), y dos fichas sin puntaje rellenadas como material de
  muestra — marcadas «PUNTAJE DE RELLENO — NO ES DE LABORATORIO» en su propia ficha.
- **Docs**: sin guardián posible — no hay credenciales de Notion en el repo (el prerrequisito que
  falta para el espejo del §1 de INTEGRACIONES_PLAN).

## [V4.42] — 2026-08-19 (commit 84bea49)

- **Añadido**: la ficha pública de un lote vivo — `/docs/ficha/[lotId]` (fuera del matcher del
  proxy, gotcha 12) + `fichaPublica()` con **lista blanca** sobre las 110 claves de
  `lots.datasheet` (NIT, georreferencia y riesgo EUDR se quedan dentro). La compuerta es la vista:
  sin fila publicada, 404.
- **Añadido**: `public_lot_catalog.tiene_ficha` — un booleano, jamás el contenido — enciende el
  botón de la cinta para lotes vivos.
- **Añadido**: guardián `qa-ficha-publica-check.mjs` (105, contra las 110 claves reales).
- **Docs**: la nota del §9 que mandaba «generar el PDF desde `lots.datasheet`» contradecía la
  auditoría del 2026-07-10 — ganó la auditoría, que explica por qué.

## [V4.41] — 2026-08-19 (commit 3c72ca5)

- **Cambiado**: el pilar 01 del Manifiesto dice **dónde** se verifica la trazabilidad («en la ficha
  técnica y en la DDS», es/en/de) — la promesa era cierta pero la tarjeta no la cumplía leída a
  secas (la finca por D3.1; el productor, nunca).
- **Añadido**: `qa-sneak-peek-check` ata la promesa a la vitrina — falla si se quita el «dónde» o si
  la finca vuelve a la tarjeta (189 → 194).

## [V4.40] — 2026-08-19 (commit 7dfd8bb)

- **Corregido**: D0.9 y D0.10 cerradas **sin cambiar un valor** — la tarjeta ya acertaba. D0.9:
  Bourbon (palabra del owner; la taza desempata). D0.10: La Fortaleza, por prueba — La Floresta no
  cultiva Gesha.
- **Añadido**: los cuatro valores quedan CLAVADOS en el guardián (177 → 189): el mock es temporal y
  una reimportación de Notion los habría deshecho sin que falle nada.

## [V4.39] — 2026-08-19 (commit 353b49e)

- **Añadido**: tablero de la lista de espera de CTC Home en `/ecp/ctc-home` — la tercera fuente de
  `newsletter_subscribers` llevaba nueve días recogiendo correos sin tablero. Vive en el ECP (es de
  la red entera), junto a Leads.
- **Cambiado**: `InteresBoard` + acciones se mudan a `src/components/panel/interes/` — sirven a dos
  consolas. `marcarContactado` revalida los tres tableros.
- **Cambiado**: `qa-crm-interes-check` lee las fuentes de `SOURCES` (28 → 37) — una fuente nueva sin
  tablero rompe el guardián el día que se escribe.

## [V4.38] — 2026-08-19 (commit 419aeae)

- **Corregido**: `tools.meta_description` espejada con los archivos — no es decorativa, es el
  **inventario** que lee «Manejo de Plataformas» (y mentía al revés tras V4.37). `tools.lang` de
  `green-datasheet` corregido (`en` → `es`).
- **Corregido**: `mermas-detallada.html` —retirada el 2026-08-15— seguía viva e indexable: archivar
  no retira un archivo del repo de la web. Ahora lleva `noindex, follow`.
- **Añadido**: guardián `qa-tools-seo-espejo.mjs` (68) + aviso en el campo del ECP (el archivo
  manda; la columna es su espejo).

## [V4.37] — 2026-08-19 (commit e1fbe30)

- **Añadido**: `meta description` en las 12 páginas de `public/tools/` (solo 2 la tenían), derivada
  de `tools.descripcion` y sin frases de administración.
- **Corregido**: la de `mermas-ctc.html` describía OTRA calculadora — peor que vacía.
- **Añadido**: guardián `qa-tools-seo-check.mjs` (193): largo útil, sufijo de la casa, ninguna
  repetida, idioma acorde al `<html lang>`.

## [V4.36] — 2026-08-19 (commit 1ff089c)

- **Seguridad**: `npm audit` de 3 altas a **0** vía `overrides` de `deepmerge-ts` — sin degradar
  `mailparser` (el `fix --force` proponía una bajada rompedora del lector del Buzón). Verificado
  comparando la SALIDA de `simpleParser` antes y después: byte a byte idéntica.

## [V4.35] — 2026-08-19 (commit 642796a)

- **Añadido**: módulo **«Mis solicitudes»** en el panel del productor de KR (CTC Tech · Varietales ·
  CaaS), con contador de no leídos. Cierra el paso (v) — **el plan V5 queda completo**.
- **Corregido**: la partición del feed mira `parentId` además de `leadId` — solo la nota de CTC
  lleva el lead; la respuesta del productor habría quedado en la otra pantalla sin un solo error.
- **Cambiado**: el formulario de contacto gana su puerta («Entrar a …» por pilar, es/en/de); dos
  migraciones cosméticas de `context_label`.
- **Docs**: D5.1 quedó sin objeto — los leads ya se vinculan en la captura, no eran anónimos.

## [V4.34] — 2026-08-18 (commit c2519d8)

- **Añadido**: conchas in-app por superficie (`/kaffetal-regal/herramientas/<slug>` y
  `/cherry-picked-green/…`) con **vuelta segura** — el `?volver=` obedecido a ciegas era un redirect
  abierto. Lista blanca por frontera de segmento; nunca devuelve vacío.
- **Añadido**: solicitudes de acceso en `tool_access_requests`, tabla APARTE de los grants — pedir
  no es poder. El aviso a `info@` guarda su resultado en la fila.
- **Añadido**: guardián `qa-concha-herramientas-check.mjs` (42, once vectores de ataque). Cierra el
  paso (iv).

## [V4.33] — 2026-08-18 (commit 266fc9f)

- **Añadido**: modelo de acceso de Herramientas — `tool_user_grants` por **persona y herramienta**
  (la tabla vieja concedía por audiencia y abría todas las Plus de golpe; queda como comodín
  heredado, con `via` en el veredicto para saber a quién migrar).
- **Cambiado**: `herramientas` entra a la matriz de identidad como OBJETIVO, no como identidad.
- **Añadido**: guardián `qa-herramientas-acceso-check.mjs` (26).

## [V4.32] — 2026-08-18 (commit 9028ed7)

- **Cambiado**: «Definición de contexto» deja de ser vendorizado — las tres preguntas por CUATRO
  unidades (CTCX · KR · CHP · **Value Ecosystem**) + tres pestañas placeholder. Las respuestas
  reales se levantaron con migración (15 campos, 4.202 caracteres).
- **Corregido**: `qa-direccionamiento-check` vuelve a 14/14 — llevaba en 13/2 vigilando una premisa
  muerta. La línea base de eslint baja de 27 avisos a **8**.
- **Añadido**: guardián `qa-definicion-check.mjs` (33). Cierra el paso (iii).

## [V4.31] — 2026-08-18 (commit 403f550)

- **Añadido**: una ficha por nodo partner (`/bcp/socios/<nodo>`, ×5) — estado de credenciales, tres
  puertas y KPI de invitaciones fallidas en cabecera.
- **Corregido**: **13 compuertas apuntaban a la consola equivocada** tras la mudanza (las claves de
  consola no llevan barras). Cerrado con la comprobación (f) de `qa-rutas-consolas`.

## [V4.30] — 2026-08-18 (commit 9890659)

- **Añadido**: CRM CP **Roast** y **X** — listas de espera, no embudos; solo se persiste
  `contacted_at` (y se puede desmarcar). El grupo «OCP · Cherry Picked» queda completo.
- **Añadido**: guardián `qa-crm-interes-check.mjs`, que también compara clases de CSS module usadas
  contra declaradas — una inexistente sale `undefined` sin que nada falle.

## [V4.29] — 2026-08-18 (commit 71bd712)

- **Añadido**: CRM CP **Green** — el embudo de compradores de la tienda. La etapa se **deduce** de
  los pedidos al leer (D3.2); solo el anulado manual se persiste. Regla en módulo puro
  (`etapaComprador.ts`) + guardián `qa-crm-green-check.mjs` (21).

## [V4.28] — 2026-08-18 (commit 4de00ab)

- **Añadido**: D3.1 resuelta — el lote comprado en firme tiene DOS caras. `public_lot_catalog` anula
  `finca_name` y expone `ctc_selection`; el rótulo sale de `legal.ts`; se deriva de la compra. Ni
  una fila de `lots`/`fincas` cambia.

## [V4.27] — 2026-08-18 (commit cdc7b22)

- **Añadido**: **CTC Selection** (`/ocp/ctc-selection`) — el paraguas de lo comprado en firme; Black
  Stock pasa a ser su pestaña Black. `black_negotiations.grade` con CHECK que rechaza `tyrian` (va a
  subasta, y eso vive en la base).
- **Cambiado**: el talón de `/bcp/black-stock` reapuntado en un solo salto (regla F2). Abre el ciclo
  del plan V5 sobre la V4.26.
