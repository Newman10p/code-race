
-- 1. Add code editor fields to questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS language TEXT NOT NULL DEFAULT 'javascript',
  ADD COLUMN IF NOT EXISTS test_mode TEXT NOT NULL DEFAULT 'io',
  ADD COLUMN IF NOT EXISTS test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS visible_test_count INT NOT NULL DEFAULT 1;

-- 2. Add test results to participant_answers
ALTER TABLE public.participant_answers
  ADD COLUMN IF NOT EXISTS test_results JSONB;

-- 3. Lesson courses
CREATE TABLE IF NOT EXISTS public.lesson_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_courses TO authenticated;
GRANT ALL ON public.lesson_courses TO service_role;
ALTER TABLE public.lesson_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Setters manage own courses" ON public.lesson_courses
  FOR ALL TO authenticated USING (auth.uid() = setter_id) WITH CHECK (auth.uid() = setter_id);
CREATE POLICY "Anyone can view public courses" ON public.lesson_courses
  FOR SELECT TO authenticated USING (is_public = true);
CREATE TRIGGER update_lesson_courses_updated_at BEFORE UPDATE ON public.lesson_courses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Lessons
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.lesson_courses(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  concept_markdown TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  objective TEXT NOT NULL DEFAULT '',
  hint TEXT,
  language TEXT NOT NULL DEFAULT 'javascript',
  starter_code TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  test_mode TEXT NOT NULL DEFAULT 'io',
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Setters manage lessons of own courses" ON public.lessons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_courses c WHERE c.id = lessons.course_id AND c.setter_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lesson_courses c WHERE c.id = lessons.course_id AND c.setter_id = auth.uid()));
CREATE POLICY "Anyone can view lessons of public courses" ON public.lessons
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lesson_courses c WHERE c.id = lessons.course_id AND c.is_public = true));
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Lesson progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own progress" ON public.lesson_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Learner saved courses
CREATE TABLE IF NOT EXISTS public.learner_saved_courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.lesson_courses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learner_saved_courses TO authenticated;
GRANT ALL ON public.learner_saved_courses TO service_role;
ALTER TABLE public.learner_saved_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved courses" ON public.learner_saved_courses
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
