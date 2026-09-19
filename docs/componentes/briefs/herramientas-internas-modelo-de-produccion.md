# Brief · Modelo de Producción — vistas «Procesamiento» y «Empacado»  (componente: herramientas-internas · slug: `modelo-de-produccion` · 2026-09-19)

> Fase 6 del overhaul (`docs/OVERHAUL_CONSOLAS_PLAN.md`, D9). El cuadro del owner nombra DOS entradas —Procesamiento y
> Empacado— bajo **ECP · Modelo de Producción**. Son dos vistas de UN modelo, y el charter manda: «un modelo nuevo empieza por
> un brief, no por una pantalla». Estado: **en scoping — espera al owner.**

**Qué es** — El modelo que dice **qué le pasa al café entre la finca y la caja, cuánto se pierde en cada paso y cuánto cuesta
cada paso**: pergamino seco → trilla → selección → verde garantizado → empacado y embalado. **Procesamiento** es la mitad de
los rendimientos y las mermas; **Empacado**, la de los dos estándares de empaque y su costo por kilo. Su salida no es una
pantalla bonita: son **los dos números que el Modelo Económico necesita** para pasar del verde a granel al verde empacado.

**Para quién** — El **owner** (fija los parámetros) y el **equipo CTC** que cotiza. Aguas abajo: el PVC, las ofertas y la tienda.

**Lo que ya hay (hechos, 2026-09-19) — el modelo existe, pero repartido en cinco sitios que no se hablan**
- **El embudo** (`src/lib/pvc/lectura.ts`, `embudoDeCarga`): 125 kg de pergamino → **93,09 kg de excelso** (factor 94) → **78 kg
  garantizados** → bolsas enteras. Es lo ÚNICO del procesamiento que hay en TypeScript, y el 94 aparece ahí como texto.
- **Las mermas por etapa** (cereza → pergamino → verde → tostado) viven SOLO dentro de `public/ocp-apps/cotizador-lotes.html`.
- **Los costos de transformación** (transporte a trilla · trillado · selección óptica · monitoreo de mallas) viven SOLO dentro
  del HTML del cotizador LOGÍSTICO, fase 0, como casillas editables con un valor por defecto.
- **El cotizador de empaque** calcula UNA cosa: la selladora **al vacío** (bolsa · mano de obra · amortización, en COP/kg).
  Del otro estándar —**GrainPro + yute de 35 kg**, el de Black y Red— no hay estimador; lo más parecido es el «costal doble
  capa» del HTML logístico, con 70 kg por defecto.
- **Decidido y sin construir** (`PVC_BCP_PLAN.md`): el empaque son DOS estándares y su costo entra al modelo como **dos
  parámetros traídos del Cotizador de Empaque** (§9.2, §11.5; hoy es un solo `params.proc`) · la merma no es un número: el
  «colchón» crece al bajar el volumen, de 4,0 % en Black a 17,7 % en Tyrian (§11.3) · **trilla, monitoreo y selección óptica
  los hace el Centro de Calidad con el CIR de Santander; CTCx acopia y empaca** (§14.7 n.º 21) · tostado: **82 %** de
  remanente (n.º 26) · base física: factor ≤ 94, Black hasta 98.
- `public/tools/mermas-detallada.html` existe y el plan lo pide «al lado» del empaque: **nadie lo enlaza**.
- Los tres cotizadores **no tienen guardián** y su matemática vive entera dentro de HTML embebidos.

**Dónde vivirá** — Módulo de consola: **`/ecp/produccion`** con dos pestañas, **Procesamiento** y **Empacado**, en el grupo
«ECP · Modelo de Producción» (que hoy tiene un solo enlace, al cotizador de empaque). Lógica en `src/lib/produccion/` — **pura**,
como `lectura.ts`: la leen la pantalla, el motor del PVC y su guardián.

**Datos** — **Primera tanda: ninguno.** El modelo se ARMA con lo que ya existe (el embudo, las constantes, la cotización de
empaque que el owner marque como «la vigente»). Segunda tanda, si el owner quiere editar parámetros sin desplegar: una tabla
`produccion_parametros` versionada como las ediciones del PVC (un juego de parámetros rige desde una fecha; el anterior no se borra).

**IA** — Ninguna.

**Contratos que toca** — **Grados** (el formato de empaque depende del grado) · **el PVC y su paridad**: `paridad.json` es el
contrato entre CUATRO motores (Python, Excel, `motor.ts` y el tablero). Partir `params.proc` en dos parámetros es un cambio en
los cuatro a la vez, o `qa-pvc-motor` (tolerancia 1e-4) se rompe. Es el riesgo de este brief.

**Guardián previsto** — `qa-produccion-check`: (1) el factor de rendimiento y los kilos garantizados tienen UNA fuente —hoy el
94 está en `escala.ts` como tope y en `lectura.ts` como texto—; (2) el embudo reproduce la tabla de colchones del plan §11.3,
grado por grado; (3) los parámetros de empaque que consume el motor salen de este modelo, no de un literal; (4) cada etapa con
costo dice de dónde sale la cifra (una cotización emitida, una tarifa del socio, o «supuesto del owner, fecha»).

**Primera tanda** — La pantalla de SOLO LECTURA que junta lo disperso y **enseña el hueco**: Procesamiento pinta el embudo por
grado con su colchón y las cuatro etapas de costo, marcando cuáles tienen cifra con fuente y cuáles son un valor por defecto de
un HTML; Empacado pinta los dos estándares, el del vacío con la cotización vigente y el de GrainPro como «sin estimador». Enlaza
`mermas-detallada.html`. No cambia ningún precio: enseña con qué se están calculando hoy.

**Decisiones del owner**
1. **¿De dónde salen las cifras de trilla y selección óptica?** ¿Hay tarifa del Centro de Calidad / CIR, o son un supuesto tuyo
   hasta que la haya? El modelo las marca distinto.
2. **El estándar GrainPro + yute de 35 kg**: ¿le hacemos su estimador (bolsa, costal, llenado y cosido), o basta un costo por
   kilo que tú fijes?
3. **¿El «Cotizador de lotes» se viene a este modelo?** Es el único que modela mermas, y hoy cuelga del Modelo Económico.
4. **¿Parámetros editables desde la consola (segunda tanda), o en código con despliegue?** El PVC eligió ediciones versionadas.
5. **El 82 % de tostado**: ¿entra aquí (producción llega hasta el tostado) o se queda en Cherry Picked Roast?
