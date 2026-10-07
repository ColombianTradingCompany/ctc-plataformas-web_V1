# Plan de los Ciclos de Cherry Picked

> Owner, 2026-10-06/07 (conversación WRAP-COMMIT-PUSH). Reemplaza la mecánica de **meses** y **modalidades** del trato
> (V5.83–V5.173) por **ventanas de ciclos de 6–7 semanas** atadas a la operación física de CTCx (recibir → procesar →
> enviar). Es el plan en vigor para el trato de Cherry Picked; `docs/PLAN_CIRCUITO_DEL_LOTE.md` (pasos 15–18) y
> `docs/PVC_BCP_PLAN.md` (calendario de publicación, disparador) remiten aquí. **No hay contratos en producción** al
> escribirlo: el cambio no migra nada.

## 0. Por qué

- Los perfiles sensoriales de los primeros «pepeos» no son representativos: el productor **evalúa su lote cuando quiera**
  (cuando la taza ya es la de la cosecha) y la oferta llega cuando llega.
- La ventana comercial tiene que encajar con la operación: el saco del productor llega, se procesa en Sample Kits y viaja
  en un flete consolidado a los destinos donde se impulsa Cherry Picked. Medir el trato en meses no casaba con eso.
- El PVC se publica más tarde (≈ 5 semanas antes del trimestre, no ≈ 2,5 meses) para reducir el riesgo de volatilidad.

## 1. El calendario

- **Semanas ISO 8601** (lunes a domingo). Un trimestre = **13 semanas** = ciclo 1 de **6** + ciclo 2 de **7**. En los años
  ISO de **53 semanas** (2026, 2032…) el trimestre de fin de año tiene **14** (7 + 7) y termina en la primera semana de
  enero. Las fechas son **variables de cada edición del PVC**: el agente las propone con esta regla, CTCx las aprueba.
- Ritmo de cada ciclo: **semana 1** llegan los sacos nuevos y lo vendido en el ciclo anterior · **semana 2** se procesa y
  consolida · **semana 3** sale el **flete programado** de Sample Kits (CP y CaaS). CaaS puede despachar además con su propio
  cronograma, individual o consolidado.

| Trimestre | Ciclo 1 | Ciclo 2 | Sin contratos nuevos | Agente del PVC siguiente → publica a más tardar |
|---|---|---|---|---|
| T4-2026 (14 sem.) | 28 sep – 15 nov (7) | 16 nov – 3 ene (7) | **no aplica en 2026** | lun 16 nov → dom 29 nov |
| T1-2027 | 4 ene – 14 feb | 15 feb – 4 abr | 11 – 24 ene | 15 feb → 28 feb |
| T2-2027 | 5 abr – 16 may | 17 may – 4 jul | 12 – 25 abr | 17 may → 30 may |
| T3-2027 | 5 jul – 15 ago | 16 ago – 3 oct | 12 – 25 jul | 16 ago → 29 ago |
| T4-2027 | 4 oct – 14 nov | 15 nov – 2 ene 2028 | 11 – 24 oct | 15 nov → 28 nov |

- **PVC-F4-2026 se re-fecha** de 15 sep – 15 dic a **28 sep 2026 – 3 ene 2027** (owner: «vale»), con su fila de auditoría.
- Las semanas 2–3 **del trimestre** (no del ciclo) no reciben contratos nuevos desde **2027**: es la operación del primer
  flete y llegan las muestras de evaluación. Las semanas 2–3 del ciclo 2 **sí** reciben (son contratos para el envío
  siguiente).

## 2. La ventana la decide el día de la FIRMA

| Firma | Ventana | Retiro libre | Precio |
|---|---|---|---|
| Renovación firmada antes de empezar el ciclo, o contrato nuevo en su semana 1 | ese ciclo | 25 % | PVC del ciclo |
| Ciclo 1, semanas 2–3 | — sin contratos nuevos (desde 2027) — | | |
| Ciclo 1, después (semana 2 en adelante en T4-2026; semana 4 en adelante desde 2027) | resto del ciclo 1 + ciclo 2 | 30 % | PVC vigente |
| Ciclo 2, semana 1 | ciclo 2 | 25 % | PVC vigente (o el corregido) |
| Ciclo 2, semana 2 antes de publicarse el PVC siguiente | — sin contratos nuevos — | | |
| Ciclo 2, desde la publicación del PVC siguiente | resto del ciclo 2 + ciclo 1 siguiente | 30 % | **promedio simple** de los dos PVC |

- Un solo contrato por ventana; las ventanas pueden cubrir dos ciclos. Las ofertas vencen al terminar su zona (cuenta la
  firma, no la emisión).
- El productor **no elige modalidad**: el sistema le dice su ventana, su retiro y su precio.

## 3. Compras, envíos y pagos

- **Saco inicial** (primer contrato del lote): CTCx compra de inmediato **mínimo 70 kg de CPS** (≈ 50 kg de verde) y **hasta
  200 kg**, a su discreción, **fuera de lo declarado**. Es material de GTM y posicionamiento. Por encima de 200 kg es CTCx
  Selection.
- **Renovaciones**: CTCx puede comprar por adelantado, normalmente 10–20 kg (puede ser 0; tope 200 kg). No se repite el saco.
- **El saco/adelanto sale al cierre de la semana de firma.** Si no sale, el productor elige: **pedir prórroga** de una semana
  (si aún hay tiempo; queda una advertencia), **cancelar** el contrato o **pasarlo a la ventana siguiente**. Un contrato
  firmado en la semana 1 **no tiene prórroga** (su saco tiene que llegar al procesamiento de esa semana 2).
- **Lo vendido** (confirmado semana a semana) sale **por baches que decide el productor** (V5.183, owner 2026-10-07): puede despachar
  cada semana o juntar 3, 4 y hasta 5 semanas —se recomienda cada 2 o 3—, solo si hay compras confirmadas; cada bache sale a más tardar al
  cierre de la 5.ª semana contando la de su primera venta (antes: la semana 1 del ciclo siguiente). Si no sale: una semana de prórroga
  con advertencia; después, el faltante se cobra como **retiro penalizado** (4 % por carga) y CTCx puede declarar la
  ruptura (decisión del owner, como hoy).
- **El transporte lo paga el productor**, con el **código de envío corporativo de CTCx en Servientrega**; al precio final se
  le suma el **Flete a CTCx** de su región (§6) y el resto lo paga el productor en la oficina de envíos (V5.177).
- **Pago 60/40** (toda compra: saco, adelanto, vendido): **60 % con el tiquete de despacho** (el productor registra guía,
  peso y foto) y **40 % al recibir** en CTCx, después de medir **humedad** y **actividad de agua** (rangos por defecto
  10–12 % y aw ≤ 0,70, editables en el Modelo Económico). Fuera de rango, CTCx elige: **devolución** (el productor devuelve
  el 60 %, CTCx paga el flete de vuelta; ambos pierden su transporte) o **compra con un pago adicional de 0–15 %** (el café
  queda pagado al 60–75 %).
- Las advertencias quedan registradas como eventos. Los **puntos de gamificación del productor no existen** todavía: se
  diseñan aparte.

## 4. Lo declarado, el retiro y los mínimos

- **Una declaración por ventana**, con retiro libre del 25 % (ventana de un ciclo) o 30 % (ventana extendida), en cualquier
  momento, **solo sobre lo no vendido**. Por encima, 4 % del precio de cada carga. El ejemplo del owner es la prueba del
  guardián: declara 100 kg (25 % = 25 kg) → semana 2 retira 15 (libres) → semana 3 CTCx vende 70 → semana 4 un tercero
  ofrece 30, pero solo quedan 15: o los retira (10 libres + 5 con 4 %), o los deja en la vitrina hasta el fin de la ventana.
- **Mínimo por ventana** = el del grado (igual para un ciclo que para una ventana extendida). Para un lote que **continúa**,
  baja **10 % del mínimo original por cada cambio de trimestre, lineal** (Red: 750 → 675 → 600 → 525…).
- **Existencia insuficiente**: si lo que le queda al lote no alcanza el mínimo que le corresponde, puede declarar **hasta la
  mitad de ese mínimo, sin derecho a retiro**. El sistema lo calcula: existencia del lote (A2) − vendido − retirado.
- Los mínimos se **editan en el Modelo Económico** como variable de cada edición: cada oferta y contrato congela el mínimo
  con el que nació.

## 5. La renovación y las confirmaciones

- La renovación del ciclo siguiente queda **prellenada en «Lotes Evaluados → Pendiente de Oferta»**, a una aprobación de
  distancia; CTCx la confirma en la **semana 4 de cada ciclo**.
- El productor la acepta en un paso: **confirma la cantidad disponible, reconfirma que la humedad y el bodegaje son los
  adecuados, y firma** dentro de su ventana. Si no responde, el contrato **vence**; CTCx puede generar una oferta nueva con
  las condiciones del momento.
- **Confirmaciones semanales** al productor de lo vendido (convertido) en Cherry Picked.

## 6. El PVC

- **Fechas** de la edición = variables (§1). **El agente** corre en la **semana 1 del ciclo 2**: propone la edición siguiente
  (fechas, insumos de mercado, motor, mínimos, rangos de calidad, flete, informe). Un responsable de CTCx la **aprueba y
  publica a más tardar en la semana 2**.
- **Flete a CTCx** (owner, 2026-10-07; reemplaza el «auxilio de transporte», que **no existe**: la cooperativa paga la base
  FNC —puesta en bodega de Almacafé— **menos** un descuento por flete de $1.000–5.000 por arroba). CTCx hace lo contrario:
  **suma** al precio final un flete fijo por **carga equivalente** según la región de despacho, y el productor despacha con
  el **código corporativo de CTCx en Servientrega** y paga el resto en la oficina. Tres niveles, **variables de la edición**
  (Modelo Económico, owner, con auditoría; ajustables, no entran en la huella del PVC):
  **Regional Santander $25.000** (Santanderes) · **Nacional Centro $50.000** (Antioquia, Eje Cafetero, Tolima, Cundinamarca…)
  · **Nacional Sur $70.000** (Huila, Cauca, Nariño…) por carga = 200 · 400 · 560 COP/kg (14.000 · 28.000 · 39.200 por 70 kg).
  **Precio final = PVC × multiplicador del grado (con su %) + flete de la región.** CTCx elige la región al emitir la oferta
  (la sugiere el departamento de la finca); la oferta y el contrato la **congelan** con su valor; el precio del PVC siguiente
  lleva el mismo flete. Se **muestra** en la oferta, la calculadora, la propuesta de Selection y el contrato (V5.177).
- **Corrección dentro del ciclo** (reemplaza el disparador «FNC ≥ PVC 10 de 15»). Lecturas FNC (una por día con lectura),
  en bloques de **20 lecturas consecutivas dentro del mismo ciclo**; si el ciclo tiene pocas lecturas, el bloque puede
  incluir las de la **última semana del ciclo anterior** (nunca dos ciclos enteros):

  | | Se dispara si | Ajuste | Tope |
  |---|---|---|---|
  | Al alza | FNC > PVC en ≥ 15 de las 20 | + (promedio de las lecturas del ciclo que superan el PVC − PVC) | +10 % |
  | A la baja | PVC ≥ 1,2 × FNC (FNC ≤ PVC / 1,2) en ≥ 15 de las 20 | − (PVC / 1,2 − promedio de las lecturas del ciclo por debajo de ese umbral) | −10 % |

  Una corrección como máximo por ciclo y por PVC; corrige el **PVC base**; aplica **solo a contratos firmados después de
  aprobarla** (la propone el sistema, la aprueba un responsable). En el ciclo 2, ya publicado el PVC siguiente, se miden
  **los dos por separado** (owner, respuesta 1 = b): la FNC contra el vigente lo corrige; la FNC contra el siguiente lo
  **enmienda** (`correction_of`) con las mismas reglas.

## 7. Ficha · A2 «Información de Origen»

Tres datos nuevos del lote: **existencia total de CPS (kg)** (la base de lo disponible; el productor la reconfirma en cada
renovación; si el lote combina fincas, los aportes deben sumarla), **número de plantas** y **estimación de producción** con
un selector **cereza / pergamino**: se escribe una y la otra se deriva a **5 : 1** (5 kg de cereza ≈ 1 kg de CPS).

## 8. Lo que se retira

Las tres modalidades (V5.169) y la «Temporada Actual» (V5.173) · la carga de 125 kg y la franja de 10–25 kg · la
redeclaración al 70 % (V5.171; su barrido diario se reusa para recordatorios y vencimientos de renovación) · el trato **mes
a mes** (`contract_months` queda dormida, con su porqué escrito) · la renovación a los 90 días · «Declarar Siguiente
Temporada» (declarar por adelantado al PVC siguiente) · la mora 2 + 2 semanas con 5 %. **No cambian**: CTCx Selection
(PVC − 8 %, compra en firme), las subastas Tyrian, la regla de cosecha pasada (9 meses, −10 %) como vigencia de la
evaluación.

## 9. Las tandas

Cada tanda es su propia versión (gate, guardianes, CHANGELOG, log, charters, ALINEACION §3, push, badge en vivo).

1. ✅ **HECHA en la V5.174.** **Calendario y reglas (puro + datos).** `src/lib/trato/calendario.ts` (semanas ISO, trimestres, ciclos, semanas sin
   contratos, fechas del agente y de publicación), `ventanas.ts` (firma → ventana, retiro, regla de precio), `minimos.ts`
   (grado, continuidad lineal, existencia insuficiente), `src/lib/pvc/correccion.ts` (bloques de 20, alza/baja, topes).
   Variables de la edición (fechas, mínimos, rangos de calidad; el auxilio, reemplazado en la V5.177 por el Flete a CTCx) en `pvc_editions` y editables en el Modelo
   Económico (`/ecp/pvc/parametros`). Re-fechado de PVC-F4-2026. Ficha A2 (existencia, plantas, producción 5 : 1).
   Guardián nuevo `qa-ciclos-check`.
2. ✅ **HECHA en la V5.175** (el OCP lee la ventana; sus acciones van en la tanda 3). **Oferta, contrato y Kaffetal Regal.** La oferta del OCP calcula la ventana por la fecha y vence con su zona; el
   contrato nuevo (ventana, saco, 60/40, calidad, envíos, retiro, mínimos, renovación; texto con versión); la calculadora
   en semanas con el escenario de ventas; «Mis contratos» con su ventana, lo vendido, el retiro y la renovación de un paso.
3. ✅ **HECHA en la V5.176** (más la vitrina por ventanas y el barrido de renovaciones). **Operación en el OCP.** Renovaciones prellenadas (confirmación en semana 4), confirmaciones semanales, despachos
   (guía, peso, foto) y recepción (humedad, aw), pagos 60/40 y los dos caminos fuera de rango, fallas de envío (prórroga,
   cancelar, siguiente ventana) y advertencias. Se retira el trato mes a mes.
4. **PVC.** (a) ✅ **HECHA en la V5.178**: la vigilancia diaria de la corrección (`src/lib/pvc/vigilancia.ts`, cron 11:25 UTC,
   `pvc_correcciones`, tarjeta en Ediciones, tarea en el Tablero; aprobar publica la edición corregida, que aplica a lo que se
   firme después). (b) ✅ **HECHA en la V5.179**: el agente de la semana 1 del ciclo 2 (`src/lib/pvc/agente.ts`, cron 11:40 UTC):
   borrador con los insumos FNC y la TRM medidos, lo demás arrastrado y marcado (también el Flete a CTCx, los mínimos y la
   calidad), informe en dos pasos con fuentes (sugiere, no aplica), aviso, tarea y recordatorios del plazo; se publica desde
   el Tablero (`?borrador=`). (El flete en la oferta, la calculadora y el contrato: ✅ V5.177.)

## 10. Supuestos tomados (el owner los corrige si no)

- La baja resta la distancia del umbral (PVC / 1,2) al promedio, como su fórmula original con 0,8.
- «Pago adicional de 0–15 %» se suma al 60 % ya pagado (fuera de rango, el café queda pagado al 60–75 %).
- El 60/40 aplica a toda compra; el tope de 200 kg también a las compras adelantadas de renovación.
- Rangos de calidad por defecto: humedad del CPS 10–12 % y aw ≤ 0,70.
- El Flete a CTCx se suma después del multiplicador del grado y de su % (igual para todos los grados); en CTCx Selection el
  tope es PVC − 8 % más el flete; la región se sugiere por el departamento (Santander y Norte de Santander → Regional;
  Huila, Cauca, Nariño, Putumayo, Caquetá → Sur; el resto de Colombia → Centro; fuera de Colombia la elige CTCx).
- La continuidad lineal se cuenta en cambios de trimestre desde el primer contrato del lote; en la práctica un lote no
  pasa de 3–4 trimestres (la regla de cosecha pasada lo castiga a los 9 meses).
