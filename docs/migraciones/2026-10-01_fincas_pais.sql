-- ── Acta · 2026-10-01 · V5.127 · fincas.pais ─────────────────────────────────────────────────────────────────────
-- Aplicada con `apply_migration` (nombre `fincas_pais`) en el proyecto sjznkzvefqfcysczllli.
--
-- Owner (2026-10-01): en Kaffetal Regal, al registrar una finca, «agreguemos un toggle que diga "Fuera de Colombia",
-- congelando el Departamento y permitiendo ingresar un país entre: Perú, Ecuador, Venezuela, Panamá, Costa Rica,
-- Guatemala, El Salvador». `pais` null = Colombia (todas las fincas existentes, sin migración de datos); con país, el
-- `departamento` se guarda vacío. La lista de países y la de los 32 departamentos + Bogotá D.C. viven en
-- `src/lib/geo/departamentos.ts`. No entra en `guard_finca_protected_columns`: es un dato general, como la vereda.

alter table public.fincas add column if not exists pais text;
comment on column public.fincas.pais is 'V5.127: país de la finca cuando está FUERA de Colombia; null = Colombia. Con país, departamento queda null.';
