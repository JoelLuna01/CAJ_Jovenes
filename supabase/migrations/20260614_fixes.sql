-- ============================================================
-- FIXES: Prayer Joins, RLS for roles update, Events insert
-- Ejecutar en: Supabase > SQL Editor
-- ============================================================

-- 1. Crear tabla prayer_joins (para "unirse en oración")
CREATE TABLE IF NOT EXISTS public.prayer_joins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prayer_request_id UUID REFERENCES public.prayer_requests(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(prayer_request_id, user_id)
);
ALTER TABLE public.prayer_joins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Prayer joins viewable by everyone" ON public.prayer_joins FOR SELECT USING (true);
CREATE POLICY "Users can join prayers" ON public.prayer_joins FOR INSERT WITH CHECK (
    auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = user_id)
);
CREATE POLICY "Users can unjoin prayers" ON public.prayer_joins FOR DELETE USING (
    auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = user_id)
);

-- 2. Hacer description de prayer_requests opcional (nullable)
ALTER TABLE public.prayer_requests ALTER COLUMN description DROP NOT NULL;

-- 3. Permitir a Admins actualizar el role_id de cualquier perfil
DROP POLICY IF EXISTS "Admins can update any profile role" ON public.profiles;
CREATE POLICY "Admins can update any profile role" ON public.profiles 
    FOR UPDATE 
    USING (
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name = 'ADMIN'
        )
    );

-- 4. Permitir a Admins/Lideres insertar eventos
DROP POLICY IF EXISTS "Admins and Liders can manage events" ON public.events;
CREATE POLICY "Admins and Liders can manage events" ON public.events FOR ALL
    USING (
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name IN ('ADMIN', 'LIDER')
        )
    );
