# Brief · Configuración de Plataformas de Pagos  (componente: consolas · slug: `plataformas-de-pagos` · 2026-09-19)

> Fase 6 del overhaul (`docs/OVERHAUL_CONSOLAS_PLAN.md`, D9: «el rail no promete lo que no hay; cada entrada entra con su
> brief»). En el cuadro del owner es la quinta entrada de **ECP · Herramientas Internas**. Estado: **en scoping — espera al owner.**
> Dueño propuesto: `consolas` y no `herramientas-internas`, porque no es un modelo: es configuración que gobierna a tres
> superficies (Kaffetal Regal, Cherry Picked, las consolas). Si el owner lo quiere en el otro charter, se cambia una línea.

**Qué es** — El sitio donde la casa declara **por qué carriles entra y sale el dinero, y para qué se usa cada uno**. Hoy eso
no existe como cosa: son once puntos sueltos con un pago a mano o una instrucción escrita a mano (inventario abajo). No es una
pasarela ni un libro contable: es el **registro de carriles** (Nequi · Zulu · transferencia · Stripe, aplazado), su estado
(configurado · pendiente · aplazado), lo que ve quien tiene que pagar, y el **mapa uso → carril**.

**Para quién** — El **owner** (lo configura; es `ownerOnly`) y el **equipo CTC** que confirma pagos. Indirectamente el
**productor** y el **comprador**: lo que aquí se escribe es lo que ellos leen como «cómo pagar».

**Lo que ya hay (hechos, 2026-09-19)**
- `src/lib/arena/payment.ts`: `NEQUI = {number:"", holder:""}` — **vacío**. `nequiConfigured()` esconde las instrucciones y el
  productor cae al «escríbanos a info@». Cambiar el número hoy exige **un despliegue**.
- Cinco usos de dinero, ninguno con carril declarado: **tarifa de evaluación** (entra; `confirmInscriptionPayment` la confirma
  a mano con una referencia de texto libre) · **reembolso al rechazado** (sale; `markCashbackPaid`, referencia a mano) ·
  **liberaciones al productor** (sale; `contract_releases.payment_confirmed_at` es **una fecha**: sin método, sin referencia,
  sin comprobante) · **tienda Cherry Picked** (entra; `place_order()` crea el pedido **sin cobrar**) · **subasta Tyrian** (entra; nada).
- Decidido: **se integran los dos, Nequi y Zulu**; Stripe sigue aplazado; la **entidad legal** bloquea cobrar (`ALINEACION` §1,
  O-3 del plan de narrativa). Stripe: cero código; arquitectura aceptada «dos carriles, sin Connect» (`STRIPE_PLUGIN_SETUP.md`,
  `connect-recommend-plan.md`, que ya propone `payout_method` y `payout_reference` en `contract_releases`).
- No hay tabla ni clave de `platform_settings` de pagos, ni una sola variable de entorno de pago leída por el código.

**Dónde vivirá** — Módulo de consola: **`/ecp/pagos`**, grupo «ECP · Plataforma» (junto a Automatizaciones), `ownerOnly`.
Lógica en `src/lib/pagos/` (puro: los USOS y el mapa; servidor: leer y guardar). `payment.ts` deja de tener constantes: lee de ahí.

**Datos** — Una tabla, patrón de la casa (RLS + cero políticas): **`payment_rails`** — `key` (nequi · zulu · transferencia ·
stripe), `label`, `direction` (entra · sale · ambos), `status` (configurado · pendiente · aplazado), `currency`,
`public_instructions` jsonb (lo que ve quien paga: titular, número o enlace, pasos), `updated_by`, `updated_at`. Los **usos** son
código (`USOS_DE_PAGO`, cinco hoy), no filas: un uso nuevo es una decisión de producto, no un dato.
⚠️ **Ningún secreto en la base.** Las claves de API (Zulu, Stripe) van en variables de entorno; el módulo solo enseña
«clave presente: sí/no». El número de Nequi NO es secreto (es público de cara al productor por diseño), pero lo escribe el
owner **en la consola, nunca por chat ni en el repo** (el repo es público).
Segunda tanda, DDL aditivo: `contract_releases.payout_method · payout_reference · payout_proof_asset_id`, y lo mismo en el reembolso.

**IA** — Ninguna.

**Contratos que toca** — Moneda (`lib/precios/moneda.ts`: US$ tienda, EUR subasta hasta CN-4, COP al productor a la TRM del
día del pago) · niveles por consola (guardar un carril es `emite`: cambia lo que ve un productor) · la regla del backstage
(lo que aquí cambia se ve en Kaffetal Regal y Cherry Picked en la misma tanda).

**Guardián previsto** — `qa-pagos-check`: (1) **ninguna instrucción de pago escrita a mano fuera del módulo** — la palabra
«Nequi» en copy de cara al productor sale de `payment_rails`, no de un literal; (2) la tabla no tiene ninguna columna que
pueda guardar una clave (lista blanca de columnas); (3) cada uno de los cinco usos tiene UN carril o dice «sin cobro» en voz
alta; (4) un carril `pendiente` o `aplazado` nunca enseña instrucciones.

**Primera tanda** — La tabla, la pantalla y `payment.ts` leyendo de ella. Resultado verificable en vivo: el owner escribe el
Nequi en `/ecp/pagos` y **el bloque «Cómo pagar» de Kaffetal Regal se enciende sin desplegar** — hoy apagado desde el
2026-07-16. No cobra nada, no integra ninguna API: deja el sistema listo para que la entidad legal sea lo único que falte.

**Decisiones del owner**
1. **¿Qué es Zulu para CTC, exactamente?** ¿Una API que se integra (hay documentación, credenciales de prueba) o un enlace de
   pago que se pega? De eso depende si su carril es «instrucciones» (como Nequi) o «integración» (como Stripe).
2. **¿Qué carril para cada uso?** Propuesta: evaluación y reembolso → Nequi · liberaciones al productor → Nequi/transferencia
   en COP · tienda y subasta → Zulu (y Stripe cuando haya entidad). ¿Correcto?
3. **La tarifa de evaluación**: el código dice **$80.000**; la narrativa (CN-5) dice **$200.000 con coinversión de CTCx del
   30–70 %**. ¿Cuál rige hoy? (No se cambia aquí: se anota para no configurar un cobro con la cifra equivocada.)
4. **¿Quién confirma pagos?** Hoy cualquier `admin` del OCP. ¿Se queda así, o confirmar un pago pasa a ser solo del owner?
5. **Entidad legal** (O-3): sin ella la tienda no cobra. ¿Hay fecha? Decide si la segunda tanda es «referencias de pago al
   productor» (no depende de la entidad) o «cobro en la tienda» (sí depende).
