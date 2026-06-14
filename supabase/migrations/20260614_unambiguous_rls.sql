-- ============================================================
-- SQL de Políticas RLS Unambiguas (Sin nombres de columna duplicados)
-- Ejecuta esto en Supabase -> SQL Editor
-- ============================================================

-- 1. Asegurar que la tabla prayer_joins existe
CREATE TABLE IF NOT EXISTS public.prayer_joins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_request_id UUID REFERENCES public.prayer_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(prayer_request_id, user_id)
);

-- Habilitar RLS
ALTER TABLE public.prayer_joins ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "Prayer joins viewable by everyone" ON public.prayer_joins;
DROP POLICY IF EXISTS "Users can join prayers" ON public.prayer_joins;
DROP POLICY IF EXISTS "Users can unjoin prayers" ON public.prayer_joins;

-- Políticas usando referencias completamente explícitas
CREATE POLICY "Prayer joins viewable by everyone" ON public.prayer_joins 
    FOR SELECT USING (true);

CREATE POLICY "Users can join prayers" ON public.prayer_joins 
    FOR INSERT WITH CHECK (
        auth.uid() = (
            SELECT p.user_id 
            FROM public.profiles p 
            WHERE p.id = prayer_joins.user_id
        )
    );

CREATE POLICY "Users can unjoin prayers" ON public.prayer_joins 
    FOR DELETE USING (
        auth.uid() = (
            SELECT p.user_id 
            FROM public.profiles p 
            WHERE p.id = prayer_joins.user_id
        )
    );

-- 2. Asegurar descripción opcional en prayer_requests
ALTER TABLE public.prayer_requests ALTER COLUMN description DROP NOT NULL;

-- 3. Políticas explícitas para prayer_requests
DROP POLICY IF EXISTS "Users can create prayer requests" ON public.prayer_requests;
CREATE POLICY "Users can create prayer requests" ON public.prayer_requests 
    FOR INSERT WITH CHECK (
        auth.uid() = (
            SELECT p.user_id 
            FROM public.profiles p 
            WHERE p.id = prayer_requests.user_id
        )
    );

DROP POLICY IF EXISTS "Users can update own prayer requests" ON public.prayer_requests;
CREATE POLICY "Users can update own prayer requests" ON public.prayer_requests 
    FOR UPDATE USING (
        auth.uid() = (
            SELECT p.user_id 
            FROM public.profiles p 
            WHERE p.id = prayer_requests.user_id
        )
    );
