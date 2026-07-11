-- ============================================================
-- SQL: Vincular Diario Espiritual (Notas) con Devocionales
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- Agregar columna devotional_id a la tabla public.notes
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS devotional_id UUID REFERENCES public.devotionals(id) ON DELETE SET NULL;
