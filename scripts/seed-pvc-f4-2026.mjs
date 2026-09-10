// Semilla de la primera edición del PVC (PVC-F4-2026, modelo v2.1.1).
//
//   node --experimental-strip-types --import ./scripts/ts-resolve.mjs scripts/seed-pvc-f4-2026.mjs > /tmp/seed.sql
//
// IMPRIME el SQL (no toca la base): se aplica con `execute_sql` del MCP de
// Supabase, que es el camino de este repo para datos. Idempotente: si la
// versión o la edición ya existen, no inserta.
import { PARAMS_V211, ENTRADAS_F4_2026, calcular, huella } from "../src/lib/pvc/motor.ts";

const salida = calcular(PARAMS_V211, ENTRADAS_F4_2026);
const q = (o) => "'" + JSON.stringify(o).replace(/'/g, "''") + "'::jsonb";
const e = ENTRADAS_F4_2026;
console.log(`
insert into public.pvc_model_versions (version, params, notes)
select 'v2.1.1', ${q(PARAMS_V211)}, 'Pila de precios FCA/CIP/DDP sobre 78 kg garantizados; escalera ×1,15/1,30/1,60/2,00; Tyrian en subasta 80:20; costos de la pila estimados (D0 v2.1.1, 10-sep-2026)'
where not exists (select 1 from public.pvc_model_versions where version = 'v2.1.1');

insert into public.pvc_editions (code, model_version_id, status, cut_date, publish_date, valid_from, valid_to, inputs, outputs, pvc_cop, hash, published_at, notes)
select '${e.codigo}', m.id, 'published', '${e.fecha_corte}', '${e.fecha_pub}', '${e.valid_from}', '${e.valid_to}',
       ${q(e)}, ${q(salida)}, ${salida.edicion.pvc}, '${huella(PARAMS_V211, e)}', '${e.fecha_pub}T12:00:00Z',
       'Edición de transición v2.1 (series oficiales FNC y TRM; errata al alza desde $2.470.000). Sembrada desde el motor en V5.28.'
from public.pvc_model_versions m
where m.version = 'v2.1.1' and not exists (select 1 from public.pvc_editions where code = '${e.codigo}');

select code, status, pvc_cop, hash from public.pvc_editions;
`);
