-- ============================================================
-- SQL: Sistema de Evidencias de Devocionales (Carga de Fotos y Revisión)
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Agregar columnas necesarias a la tabla devotional_completions
ALTER TABLE public.devotional_completions 
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS feedback TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Crear bucket de almacenamiento para las evidencias si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('devotionals', 'devotionals', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Limpiar políticas de storage anteriores si existieran
DROP POLICY IF EXISTS "Allow authenticated upload devotionals" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read devotionals" ON storage.objects;
DROP POLICY IF EXISTS "Allow owner manage devotionals" ON storage.objects;

-- 4. Crear políticas de RLS para el bucket de evidencias
CREATE POLICY "Allow authenticated upload devotionals" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'devotionals');

CREATE POLICY "Allow authenticated read devotionals" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'devotionals');

CREATE POLICY "Allow owner manage devotionals" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'devotionals' AND auth.uid() = owner);

-- 5. Limpiar y redefinir políticas RLS para public.devotional_completions
DROP POLICY IF EXISTS "Users can manage own devotional completions" ON public.devotional_completions;
DROP POLICY IF EXISTS "Admins and Liders can view all devotional completions" ON public.devotional_completions;
DROP POLICY IF EXISTS "Admins and Liders can update devotional completions" ON public.devotional_completions;
DROP POLICY IF EXISTS "Users can view own devotional completions" ON public.devotional_completions;
DROP POLICY IF EXISTS "Users can insert own devotional completions" ON public.devotional_completions;
DROP POLICY IF EXISTS "Users and admins can update devotional completions" ON public.devotional_completions;

-- Política de Lectura (Select): Propios usuarios e integrantes de roles ADMIN/LIDER.
CREATE POLICY "Users can view own devotional completions" ON public.devotional_completions
    FOR SELECT USING (
        auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = devotional_completions.user_id)
        OR
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name IN ('ADMIN', 'LIDER')
        )
    );

-- Política de Inserción (Insert): Únicamente el propio usuario.
CREATE POLICY "Users can insert own devotional completions" ON public.devotional_completions
    FOR INSERT WITH CHECK (
        auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = devotional_completions.user_id)
    );

-- Política de Actualización (Update): El usuario (para reenviar/cambiar foto) o ADMIN/LIDER (para evaluar).
CREATE POLICY "Users and admins can update devotional completions" ON public.devotional_completions
    FOR UPDATE USING (
        auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = devotional_completions.user_id)
        OR
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name IN ('ADMIN', 'LIDER')
        )
    );
