-- ============================================================
-- MIGRACIÓN: Agregar match_started_at a matches
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS match_started_at TIMESTAMPTZ;

-- Verificar
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'matches' 
AND column_name = 'match_started_at';
