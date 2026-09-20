# Brief · Compañeros de Finca  (componente: `kaffetal-regal` · slug: `companeros-finca` · 2026-09-20)

> Pedido por el owner el 2026-09-20, dentro de la tanda de interfaz de la V5.64; **aplazado por él
> mismo a tanda propia** en el mismo acto, porque no es interfaz: es control de acceso.

**Qué es** — Atar una finca —y los lotes que cuelgan de ella— a **otros productores colaboradores**.
Un solo productor es el **admin** de la finca y sus lotes; los demás **colaboran**: agregan
información, pero no borran nada ni dan ningún paso final. La conexión se crea desde un botón nuevo
junto a «+ Agregar Finca», llamado **«Agregar compañero de finca»**: se elige una de las fincas donde
uno es admin y se pega el **pasaporte del productor** (`CTC-P-…`) del compañero.

**Para quién** — El productor. Detrás de la petición hay un hecho de campo: una finca la trabajan
varias personas (familia, socios, administrador), y hoy la Ficha la llena una sola cuenta o no la
llena nadie.

**Dónde vivirá** — `src/components/kaffetal-regal/` (panel · Mi Perfil) más la capa de datos. No es
una app nueva ni un módulo de consola.

---

## La regla que manda sobre todo lo demás

> «IMPORTANTE: para la trazabilidad, **solo el admin figura**, por lo cual debe asegurarse que el
> colaborador es de confianza y revisar en cada gate.» — owner, 2026-09-20.

Eso tiene dos consecuencias que hay que escribir antes de tocar una tabla:

1. **La trazabilidad no cambia.** `fincas.producer_id` y `lots.producer_id` siguen siendo el admin, y
   son lo que leen el dossier EUDR, el KML, la DDS, el catálogo público y el OCP. La colaboración es
   una capa **encima** del dueño, nunca un segundo dueño. Nada aguas abajo tiene que enterarse.
2. **«Revisar en cada gate» es literal**: cada compuerta de escritura del productor tiene que
   preguntarse si la está cruzando un admin o un colaborador. Hoy ninguna se lo pregunta, porque hoy
   `auth.uid() = producer_id` respondía las dos cosas a la vez — quién eres y qué puedes.

---

## Datos

Una tabla nueva, con el patrón de la casa (RLS encendida, políticas estrechas, guard trigger):

```
finca_collaborators
  id            uuid pk
  finca_id      uuid fk → fincas(id) on delete cascade
  producer_id   uuid fk → profiles(id)      -- el COLABORADOR
  invited_by    uuid fk → profiles(id)      -- el admin que lo ató (auditoría)
  status        text  -- 'invitado' | 'activo' | 'revocado'
  created_at, updated_at
  unique (finca_id, producer_id)
```

**Por qué una tabla y no una columna array en `fincas`**: hace falta guardar quién invitó y cuándo, y
hace falta poder revocar sin reescribir la fila de la finca (que está congelada en cuanto la finca
queda `approved` — lo hace `guard_finca_protected_columns`).

**Lo que NO se toca**: `fincas.producer_id`, `lots.producer_id`, y las políticas `*_own` que ya
existen. Las de colaborador se **añaden** al lado, para que quitar la tabla deje el sistema exactamente
como está hoy.

## Lo que hay que abrir, tabla por tabla

| Tabla | Hoy | Con colaborador |
|---|---|---|
| `fincas` | select/update `own` | **select** sí · **update** de campos de contenido sí · **delete** NO |
| `finca_parcelas` | own vía finca | select/insert/update sí · **delete** NO |
| `finca_certificates` | own vía finca | select/insert/update sí · **delete** NO |
| `lots` | own | select sí · update del `datasheet` sí · **`intake_step`/`stage` NO** · **delete** NO |
| `lot_contributions` | own vía lote | select/insert/update sí · delete NO |
| `media_assets` | ruta `{producer_id}/…` | ⚠️ **el problema duro, abajo** |
| `producer_comm_*` | own | **NO** — los hilos son del admin |
| `arena_inscriptions`, `lot_offers`, `purchase_contracts` | select-own | **NO** — dinero y compromiso son del admin |

**Los «pasos finales» que el colaborador no da**, explícitamente: cerrar una sub-etapa del intake
(`intake_step`), pasar el lote a `ficha_completa`, pedir la evaluación, pagar, declarar el envío de la
muestra, **responder una oferta**, firmar un contrato, borrar finca/lote/parcela/certificado, y pedir
revisión de datos a CTC.

## ⚠️ Los tres problemas que hay que resolver ANTES de escribir código

1. **Storage.** Las políticas del bucket `kaffetal-media` exigen la ruta `{producer_id}/…` y ese
   `producer_id` es **quien sube**. Si un colaborador sube la foto de un lote, o bien escribe bajo SU
   prefijo (y entonces el admin no puede volver a bajarla, porque la re-descarga firma por dueño), o
   bien hay que dejarle escribir bajo el prefijo ajeno (y eso es precisamente lo que la política vino
   a impedir). **Esto es lo que más trabajo tiene de todo el brief**, y probablemente obliga a una
   tabla de resolución (`media_assets.owner_producer_id` ≠ `uploaded_by`).
2. **La finca congelada.** En `status = 'approved'` el guard bloquea las declaraciones EUDR del
   *productor*. Hay que decidir si el colaborador queda igualmente bloqueado (recomendación: **sí**,
   sin excepción — es la misma finca y la misma congelación).
3. **El contrato de Identidad** (`ALINEACION` §1, `src/lib/identidad/matriz.ts`) dice hoy «productor ⊕
   comprador» y una cuenta por persona. Un productor que colabora en la finca de otro **no** rompe
   eso, pero sí añade un eje que la matriz no contempla: *qué* finca puedes tocar, no solo *qué* eres.
   Toca `matriz.ts` y por tanto **necesita el visto bueno del owner y línea en §3**.

## Lo que ve el OCP

Nada nuevo en la trazabilidad, por diseño. Pero la vista completa de `/ocp/kr` (`?finca=`) debería
**listar los colaboradores** en un renglón, porque el día que CTCx pregunte «¿quién llenó esto?» la
respuesta honesta no es solo el admin. Eso es una fila para el charter de `consolas`, no código de KR.

**Contratos que toca** — **Identidad** (§1) · el **patrón Supabase** (§1, políticas y guards). No toca
grados, ni subdominios, ni vocabulario, ni el libro de IA.

**Guardián previsto** — `qa-companeros-finca-check.mjs`, y lo que tiene que morder es **la lista de
negativas**: que un colaborador no pueda borrar, ni mover `intake_step`/`stage`, ni responder una
oferta, ni firmar; y que `producer_id` siga intacto después de cada escritura suya. Es decir: un
guardián de **lo que NO pasa**, que es la clase de guardián que esta casa no tiene todavía y la que
más falta hace aquí. Se prueba haciéndolo morder, con dos cuentas `prueba-*`.

**Primera tanda** — La tabla, las políticas, el guard trigger, el botón «Agregar compañero de finca»
con el pasaporte, y **solo lectura** para el colaborador. Escritura en la segunda tanda, cuando el
guardián de negativas ya esté verde. Motivo: una política de escritura mal puesta se descubre cuando
alguien borró algo.

---

## Decisiones del owner (bloquean)

1. **¿El colaborador ve el dinero?** Propuesta: **no** — ni tarifa de evaluación, ni oferta, ni precio,
   ni contrato. Solo el café. ¿Se confirma?
2. **¿Puede un colaborador ser también admin de sus propias fincas?** Propuesta: **sí**, son ejes
   independientes.
3. **¿Cuántos colaboradores por finca?** Propuesta: **sin tope**, pero visibles todos en la tarjeta.
4. **¿El colaborador acepta la invitación, o queda atado al pegar el pasaporte?** El texto del owner
   dice «con lo cual queda hecha la conexión» — o sea, **inmediata**. Propuesta: inmediata pero
   **notificada** al colaborador y **revocable por él**, porque atar la cuenta de alguien a una finca
   ajena sin que se entere es una sorpresa desagradable el día que algo sale mal.
5. **El caso Storage (problema 1)**: ¿los archivos que sube un colaborador son **del admin** (ruta del
   admin, el colaborador no los re-descarga) o **suyos** (ruta propia, el admin no los ve)? Ninguna de
   las dos es cómoda; hay una tercera —`media_assets` con dueño y subidor separados— que cuesta más
   pero es la única que deja a los dos bajar el mismo PDF.
