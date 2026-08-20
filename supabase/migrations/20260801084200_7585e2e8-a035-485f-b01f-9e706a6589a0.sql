CREATE TABLE public.criteria_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  project_description text NOT NULL DEFAULT '',
  dimensions jsonb NOT NULL DEFAULT '[]'::jsonb,
  passing_score integer NOT NULL DEFAULT 60,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.criteria_rubrics TO authenticated;
GRANT ALL ON public.criteria_rubrics TO service_role;
ALTER TABLE public.criteria_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Setters manage own rubrics" ON public.criteria_rubrics
  FOR ALL TO authenticated USING (auth.uid() = setter_id) WITH CHECK (auth.uid() = setter_id);
CREATE POLICY "Learners view published rubrics" ON public.criteria_rubrics
  FOR SELECT TO authenticated USING (is_published = true);

CREATE TRIGGER update_criteria_rubrics_updated_at
  BEFORE UPDATE ON public.criteria_rubrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.criteria_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rubric_id uuid NOT NULL REFERENCES public.criteria_rubrics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  learner_name text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  link_url text,
  dimension_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric NOT NULL DEFAULT 0,
  feedback text NOT NULL DEFAULT '',
  scored_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.criteria_submissions TO authenticated;
GRANT ALL ON public.criteria_submissions TO service_role;
ALTER TABLE public.criteria_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners insert own submissions" ON public.criteria_submissions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Learners view own submissions" ON public.criteria_submissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Setters view submissions to own rubrics" ON public.criteria_submissions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.criteria_rubrics r WHERE r.id = rubric_id AND r.setter_id = auth.uid())
  );
CREATE POLICY "Setters score submissions to own rubrics" ON public.criteria_submissions
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.criteria_rubrics r WHERE r.id = rubric_id AND r.setter_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.criteria_rubrics r WHERE r.id = rubric_id AND r.setter_id = auth.uid())
  );
CREATE POLICY "Setters delete submissions to own rubrics" ON public.criteria_submissions
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.criteria_rubrics r WHERE r.id = rubric_id AND r.setter_id = auth.uid())
  );

CREATE TRIGGER update_criteria_submissions_updated_at
  BEFORE UPDATE ON public.criteria_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();