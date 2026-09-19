# Brief · Modelo Logístico — vistas «Puerto Colombia», «Puerto de Destino» y «Puerta a Puerta»  (componente: herramientas-internas · slug: `modelo-logistico` · 2026-09-19)

> Fase 6 del overhaul (`docs/OVERHAUL_CONSOLAS_PLAN.md`, D9). El cuadro del owner nombra TRES entradas bajo **ECP · Modelo
> Logístico**. Son tres vistas de UN modelo —los tres tramos que el owner ya fijó: **FOB Colombia · puerto de destino · DDP**
> (`PVC_BCP_PLAN.md` §12.10; no hay DAP)—. Estado: **en scoping — espera al owner, y a CN-8.**

**Qué es** — El modelo que dice **qué cuesta el café después de empacado, tramo por tramo, según volumen y región**. Cada
vista responde una pregunta de precio: **Puerto Colombia** = qué cuesta ponerlo a bordo (el precio FOB) · **Puerto de Destino**
= qué cuesta que llegue al otro lado (flete, seguro y recargos) · **Puerta a Puerta** = qué cuesta entregarlo nacionalizado
(DDP), que es lo único que Cherry Picked vende. Es, en la práctica, el **modelo v2.2.0** que el plan lleva pidiendo desde el 16 de septiembre.

**Para quién** — El **owner** y el **equipo CTC** que cotiza. Aguas abajo: el PVC, las listas de precio por región y CaaS.

**Lo que ya hay (hechos, 2026-09-19)**
- **El cotizador logístico es una calculadora de CoGS completa** (`public/ocp-apps/cotizador-logistico.html`, 366 KB) y ya
  tiene los tres tramos, con otros nombres: **fase 2 «Exportación en origen»** (flete interno, contribución cafetera, repeso y
  guía, agente aduanero / DEX, OIC + VUCE + ICA, antinarcóticos, paletización) · **fase 3 «Transporte internacional»** (courier ·
  aéreo · marítimo, con su desglose CIF: flete base, OTHC, B/L, BAF, LSS, ISPS…) · **fase 4 «Destino y last mile»** (broker,
  aranceles, DTHC, desconsolidación, bodegaje, tasas, IVA, y el transporte final). Y un selector de Incoterm que enciende y
  apaga conceptos.
- ⚠️ **Todas las tarifas están escritas a mano dentro del HTML**, como el valor por defecto de cada casilla. Ninguna viene de la
  base, ninguna tiene fecha ni fuente. País y ciudad de destino son **texto libre**: no hay catálogo de puertos ni de regiones.
  No hay selector LCL/FCL (LCL es un supuesto; FCL, una nota en un globo de ayuda). Lo único que consulta fuera es la TRM.
- **El motor del PVC solo modela AÉREO.** «Puerto de destino» se aproxima con el escalón aéreo `n3`; `params.flete_mar` está
  declarado y **nunca se usa**. Y **los dos DDP salen de la misma columna**: el consolidado de Cherry Picked debería ser más
  barato que el dedicado de CaaS, y hoy son el mismo número (`src/lib/pvc/canales.ts` lo avisa; plan §12.10).
- **Las regiones no existen en la base**; el motor conoce tres destinos (EE. UU., Países Bajos, Alemania). `qa-pvc-canales` (57)
  ya afirma que Cherry Picked solo se entrega DDP y que CaaS tiene los tres tramos.
- De paso: la página `/ecp/cotizador-logistico` le dice al operador «falta el motor de cálculo, entra cuando llegue el HTML de
  referencia». **El HTML llegó y está funcionando.** Es un texto viejo; se corrige en la primera tanda.

**Dónde vivirá** — Módulo de consola: **`/ecp/logistica`** con tres pestañas (los tres tramos), en «ECP · Modelo Logístico»; el
cotizador se queda como está, al lado. Lógica en `src/lib/logistica/` — **pura**: el catálogo de conceptos por tramo y modalidad.

**Datos** — **Primera tanda: ninguno** (el catálogo es un módulo TypeScript extraído del HTML). Segunda tanda, con CN-8:
**`logistica_tarifas`** — `concepto`, `tramo`, `modalidad` (aéreo · marítimo · courier), `region`, `unidad` (por kg · por lote ·
% del valor), `valor`, `moneda`, `vigente_desde`, `fuente` (quién la dio y cuándo). Las regiones y sus habilitaciones son de
**CN-8**, no de este brief: aquí se leen. Patrón de la casa: RLS + cero políticas; una tarifa nueva no borra la anterior.

**IA** — Ninguna.

**Contratos que toca** — **El PVC y su paridad** (`paridad.json`: cuatro motores; una columna marítima es un cambio en los
cuatro) · **canales e Incoterms** (`canales.ts`) · **moneda** (los conceptos se capturan en COP y se cotiza en US$) ·
**subdominios / regiones** (CN-8, que depende de insumos del owner O-5 y O-7).

**Guardián previsto** — `qa-logistica-check`: (1) cada concepto pertenece a UN tramo y a una modalidad; (2) la suma de cada
tramo, para un caso de referencia, cuadra con `n2` · `n3` · `n4` del motor dentro de una tolerancia — o dice en voz alta por
qué no (el marítimo, hasta la v2.2.0); (3) ninguna tarifa sin fuente ni fecha; (4) ningún concepto del HTML sin par en el catálogo.

**Primera tanda** — El catálogo de conceptos en TypeScript y las tres vistas de SOLO LECTURA: para un volumen dado, qué
conceptos entran en cada tramo, con su valor por defecto **marcado como lo que es** («valor por defecto del cotizador, sin
fuente»). Más la corrección del texto viejo. No cambia ningún precio: convierte 366 KB de HTML en una lista que se puede leer,
discutir y vigilar. Es el inventario que CN-8 necesita antes de volver las tarifas un dato.

**Decisiones del owner**
1. **¿Quién mantiene las tarifas y cada cuánto?** ¿Las da el agente de carga (hay una tarifa plana de partner en el HTML), las
   fijas tú por trimestre como el PVC, o las sube el nodo socio «Agente de Carga» desde su panel?
2. **¿Qué volúmenes son los escalones?** El motor aéreo tiene seis (0 · 45 · 100 · 300 · 500 · 1.000 kg). ¿Cuáles son los del
   marítimo, y desde cuántos kilos un envío deja de ser LCL?
3. **La lista de destinos**: hoy tres. ¿Cuáles son los de la primera versión por región?
4. **DDP consolidado frente a dedicado**: ¿cuánto más barato es el consolidado vía master roaster? Sin esa cifra el modelo no
   puede distinguirlos.
5. **¿Esto espera a CN-8 (regiones como dato) o la primera tanda sale antes?** La primera tanda no depende de nada.
