-- ── Acta · 2026-09-30 · V5.110 · finca_parcelas.requires_polygon deja de ser generada ──────────────────────────────
-- Aplicada con `apply_migration` (nombre `parcelas_requires_polygon_es_declaracion`) en el proyecto sjznkzvefqfcysczllli.
--
-- EL FALLO (el owner lo topó con «Finca La Muestra CTCx», CTC-F-9C6B8E36): «cada vez que salgo se borra la
-- geolocalización… los puntos están guardados cuando selecciono que tiene más de 4 ha, pero guardo y desaparece».
-- La migración V5.65 (`parcelas_altura_y_declaracion_area`, 2026-09-20) dijo en su COMENTARIO que `requires_polygon`
-- guarda la RESPUESTA del productor, pero la columna siguió siendo `generated always as (coalesce(area_ha,0) > 4)`.
-- Postgres rechaza cualquier valor no-DEFAULT en una columna generada, así que desde el 2026-09-20 TODO insert/update
-- de `finca_parcelas` desde Kaffetal Regal (que manda `requires_polygon`) fallaba: `mirrorParcelaUno` se lo tragaba
-- («best effort») y las fincas nuevas quedaban sin Cafetal 1; la respuesta «> 4 ha» nunca se guardaba, la pantalla
-- volvía al modo punto y el polígono (que sí estaba en `fincas`) dejaba de verse; y sin parcela, `parcelasGeoComplete`
-- daba «declaración incompleta» y el OCP no podía evaluar la finca.
--
-- LA CORRECCIÓN: la columna pasa a ser real (conserva los valores calculados); null = sin contestar (se deduce del área,
-- como decía la V5.65). En código, el espejo YA NO es silencioso (avisa con toast) — regla de la casa.

alter table public.finca_parcelas alter column requires_polygon drop expression;
alter table public.finca_parcelas alter column requires_polygon drop not null;
comment on column public.finca_parcelas.requires_polygon is
  'La respuesta del productor a «¿el área del cultivo es mayor a 4 ha?» (V5.65; columna REAL desde la V5.110 — antes era generada y ninguna escritura de KR entraba). true ⇒ el EUDR exige polígono; false ⇒ basta el punto; null ⇒ sin contestar (se deduce de area_ha > 4).';

-- Reparación de datos (SQL, 2026-09-30, service role): la parcela 1 de cada finca con geometría se puso al día con la
-- geometría de `fincas` (que es la fuente; el espejo no había podido escribirla desde el 2026-09-20), y a «Finca La
-- Muestra CTCx» se le creó su Cafetal 1 con el polígono declarado y `requires_polygon = true`.
