-- ============================================================
-- SQL de Políticas RLS para Administradores, Líderes y Usuarios
-- Ejecuta esto en Supabase -> SQL Editor
-- ============================================================

-- 1. FIX: Roles table RLS policies
-- La tabla roles tiene RLS activo pero sin ninguna política de SELECT,
-- lo que hace que cualquier consulta que intente unir roles (JOIN) para verificar
-- el rol de un usuario devuelva 0 filas.
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;
CREATE POLICY "Roles are viewable by everyone" ON public.roles FOR SELECT USING (true);

-- 2. FIX: Notes table RLS policies
-- Originalmente usaba: auth.uid() = user_id, pero notes.user_id apunta a profiles.id (que es un uuid aleatorio),
-- y auth.uid() devuelve el id de auth.users. Esto hacía imposible leer/escribir notas.
DROP POLICY IF EXISTS "Notes are private" ON public.notes;
CREATE POLICY "Notes are private" ON public.notes FOR ALL USING (
    auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = notes.user_id)
);

-- 3. FIX: Devotional completions table RLS policies
-- Tiene RLS activo pero no tiene políticas para poder registrar devocionales completados.
DROP POLICY IF EXISTS "Users can manage own devotional completions" ON public.devotional_completions;
CREATE POLICY "Users can manage own devotional completions" ON public.devotional_completions FOR ALL USING (
    auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = devotional_completions.user_id)
);

-- 4. Políticas RLS para que Admins y Lideres puedan actualizar y eliminar peticiones de oración
DROP POLICY IF EXISTS "Admins and Liders can update all prayer requests" ON public.prayer_requests;
CREATE POLICY "Admins and Liders can update all prayer requests" ON public.prayer_requests 
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name IN ('ADMIN', 'LIDER')
        )
    );

DROP POLICY IF EXISTS "Admins and Liders can delete all prayer requests" ON public.prayer_requests;
CREATE POLICY "Admins and Liders can delete all prayer requests" ON public.prayer_requests 
    FOR DELETE USING (
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name IN ('ADMIN', 'LIDER')
        )
    );

-- 5. Políticas RLS para que Admins y Lideres puedan gestionar todos los devocionales
DROP POLICY IF EXISTS "Admins and Liders can manage devotionals" ON public.devotionals;
CREATE POLICY "Admins and Liders can manage devotionals" ON public.devotionals 
    FOR ALL USING (
        auth.uid() IN (
            SELECT p.user_id FROM public.profiles p 
            JOIN public.roles r ON p.role_id = r.id 
            WHERE r.name IN ('ADMIN', 'LIDER')
        )
    );
