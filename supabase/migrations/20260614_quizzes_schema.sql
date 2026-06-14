-- supabase/migrations/20260614_quizzes_schema.sql

-- 1. Tabla principal de Cuestionarios
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scheduled_start_at TIMESTAMP WITH TIME ZONE, -- NULL si es manual en vivo; fecha/hora si es programado (ej: 9:00 PM en casa)
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabla de Preguntas
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    options JSONB NOT NULL, -- Array de strings: ["Opción A", "Opción B", ...]
    correct_option_index INTEGER NOT NULL, -- Índice (0, 1, 2, 3) de la opción correcta
    time_limit INTEGER DEFAULT 20, -- Tiempo en segundos para responder
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabla de Sesiones de Juego (tanto para multijugador en vivo como para programados)
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL UNIQUE, -- Código de acceso (ej: 481920)
    status VARCHAR(20) DEFAULT 'LOBBY' CHECK (status IN ('LOBBY', 'PLAYING', 'FINISHED')),
    current_question_index INTEGER DEFAULT -1,
    current_question_started_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabla de Respuestas de Usuarios
CREATE TABLE IF NOT EXISTS public.quiz_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    selected_option_index INTEGER NOT NULL,
    is_correct BOOLEAN NOT NULL,
    response_time_ms INTEGER NOT NULL, -- Tiempo tardado para desempatar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, profile_id, question_id)
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Políticas de Lectura
DROP POLICY IF EXISTS "Quizzes are viewable by everyone" ON public.quizzes;
CREATE POLICY "Quizzes are viewable by everyone" ON public.quizzes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Questions are viewable by everyone" ON public.quiz_questions;
CREATE POLICY "Questions are viewable by everyone" ON public.quiz_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON public.quiz_sessions;
CREATE POLICY "Sessions are viewable by everyone" ON public.quiz_sessions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Responses are viewable by everyone" ON public.quiz_responses;
CREATE POLICY "Responses are viewable by everyone" ON public.quiz_responses FOR SELECT USING (true);

-- Políticas de Modificación para Líderes y Administradores
DROP POLICY IF EXISTS "Admins and Liders can manage quizzes" ON public.quizzes;
CREATE POLICY "Admins and Liders can manage quizzes" ON public.quizzes FOR ALL 
    USING (auth.uid() IN (SELECT p.user_id FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE r.name IN ('ADMIN', 'LIDER')));

DROP POLICY IF EXISTS "Admins and Liders can manage questions" ON public.quiz_questions;
CREATE POLICY "Admins and Liders can manage questions" ON public.quiz_questions FOR ALL 
    USING (auth.uid() IN (SELECT p.user_id FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE r.name IN ('ADMIN', 'LIDER')));

DROP POLICY IF EXISTS "Admins and Liders can manage sessions" ON public.quiz_sessions;
CREATE POLICY "Admins and Liders can manage sessions" ON public.quiz_sessions FOR ALL 
    USING (auth.uid() IN (SELECT p.user_id FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE r.name IN ('ADMIN', 'LIDER')));

-- Política para que los jóvenes puedan enviar sus respuestas
DROP POLICY IF EXISTS "Users can submit responses" ON public.quiz_responses;
CREATE POLICY "Users can submit responses" ON public.quiz_responses FOR INSERT 
    WITH CHECK (auth.uid() = (SELECT p.user_id FROM public.profiles p WHERE p.id = profile_id));
