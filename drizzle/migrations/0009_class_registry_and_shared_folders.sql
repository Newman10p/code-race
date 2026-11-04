ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS class_name text, ADD COLUMN IF NOT EXISTS admission_no text;

CREATE OR REPLACE FUNCTION public.patron_can_use_quiz(_quiz uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_resources sr
    JOIN public.organizations o ON o.id = sr.organization_id
    LEFT JOIN public.quizzes q ON q.id = _quiz
    WHERE o.patron_user_id = auth.uid() AND o.status = 'active'
      AND ((sr.resource_type = 'quiz' AND sr.resource_id = _quiz)
        OR (sr.resource_type = 'folder' AND sr.resource_id = q.folder_id))
  )
$$;
CREATE OR REPLACE FUNCTION public.patron_can_use_folder(_folder uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_resources sr
    JOIN public.organizations o ON o.id = sr.organization_id
    WHERE o.patron_user_id = auth.uid() AND o.status = 'active'
      AND sr.resource_type = 'folder' AND sr.resource_id = _folder
  )
$$;
REVOKE EXECUTE ON FUNCTION public.patron_can_use_quiz(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.patron_can_use_folder(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.patron_can_use_quiz(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.patron_can_use_folder(uuid) TO authenticated;

CREATE POLICY "Patrons view shared folders" ON public.folders FOR SELECT TO authenticated USING (public.patron_can_use_folder(id));
CREATE POLICY "Patrons view shared quizzes" ON public.quizzes FOR SELECT TO authenticated USING (public.patron_can_use_quiz(id));
CREATE POLICY "Patrons view shared quiz questions" ON public.questions FOR SELECT TO authenticated USING (public.patron_can_use_quiz(quiz_id));