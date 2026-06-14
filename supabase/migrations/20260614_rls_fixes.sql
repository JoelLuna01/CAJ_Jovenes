-- ============================================================
-- FIX: Politicas RLS correctas para prayer_requests y prayer_joins
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Crear tabla prayer_joins si no existe
CREATE TABLE IF NOT EXISTS public.prayer_joins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_request_id UUID REFERENCES public.prayer_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(prayer_request_id, user_id)
);
ALTER TABLE public.prayer_joins ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas viejas de prayer_joins
DROP POLICY IF EXISTS "Prayer joins viewable by everyone" ON public.prayer_joins;
DROP POLICY IF EXISTS "Users can join prayers" ON public.prayer_joins;
DROP POLICY IF EXISTS "Users can unjoin prayers" ON public.prayer_joins;

-- Políticas correctas para prayer_joins
CREATE POLICY "Prayer joins viewable by everyone" ON public.prayer_joins FOR SELECT USING (true);
CREATE POLICY "Users can join prayers" ON public.prayer_joins FOR INSERT 
    WITH CHECK (auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = user_id));
CREATE POLICY "Users can unjoin prayers" ON public.prayer_joins FOR DELETE 
    USING (auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = user_id));

-- 2. Hacer description de prayer_requests opcional
ALTER TABLE public.prayer_requests ALTER COLUMN description DROP NOT NULL;

-- 3. FIX CRÍTICO: Corregir políticas RLS de prayer_requests
-- El problema: auth.uid() devuelve el ID de auth.users, 
-- pero user_id en prayer_requests referencia profiles.id (¡son distintos!)
DROP POLICY IF EXISTS "Users can create prayer requests" ON public.prayer_requests;
CREATE POLICY "Users can create prayer requests" ON public.prayer_requests FOR INSERT 
    WITH CHECK (auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = user_id));

DROP POLICY IF EXISTS "Users can update own prayer requests" ON public.prayer_requests;
CREATE POLICY "Users can update own prayer requests" ON public.prayer_requests FOR UPDATE 
    USING (auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = user_id));

-- 4. Permisos para que los jóvenes puedan insertar en quiz_responses
DROP POLICY IF EXISTS "Users can submit responses" ON public.quiz_responses;
CREATE POLICY "Users can submit responses" ON public.quiz_responses FOR INSERT 
    WITH CHECK (auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = profile_id));

-- 5. Permitir a Admins actualizar roles de perfiles
DROP POLICY IF EXISTS "Admins can update any profile role" ON public.profiles;
CREATE POLICY "Admins can update any profile role" ON public.profiles FOR UPDATE 
    USING (
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name = 'ADMIN'
        )
    );

-- 6. Política INSERT para eventos
DROP POLICY IF EXISTS "Admins and Liders can manage events" ON public.events;
CREATE POLICY "Admins and Liders can manage events" ON public.events FOR ALL
    USING (
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name IN ('ADMIN', 'LIDER')
        )
    );
