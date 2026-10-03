CREATE TABLE public.competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','school_restricted')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  appearance_at timestamptz NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
  scoring_mode text NOT NULL DEFAULT 'points_and_speed' CHECK (scoring_mode IN ('points_and_speed','strict_points')),
  show_leaderboard_during boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (appearance_at <= starts_at AND starts_at < ends_at)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitions TO authenticated;
GRANT ALL ON public.competitions TO service_role;

CREATE TABLE public.competition_allowed_orgs (
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  PRIMARY KEY (competition_id, organization_id)
);
GRANT SELECT, INSERT, DELETE ON public.competition_allowed_orgs TO authenticated;
GRANT ALL ON public.competition_allowed_orgs TO service_role;

CREATE TABLE public.competition_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  type text NOT NULL CHECK (type IN ('mcq','code','short_text')),
  content text NOT NULL,
  points integer NOT NULL DEFAULT 10 CHECK (points >= 0),
  options jsonb,
  language text NOT NULL DEFAULT 'javascript',
  starter_code text,
  test_mode text NOT NULL DEFAULT 'io',
  visible_test_cases jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.competition_questions(competition_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_questions TO authenticated;
GRANT ALL ON public.competition_questions TO service_role;

-- Answer keys kept separate so contestants can never read them
CREATE TABLE public.competition_question_keys (
  question_id uuid PRIMARY KEY REFERENCES public.competition_questions(id) ON DELETE CASCADE,
  correct_option integer,
  accepted_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  solution text,
  hidden_test_cases jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competition_question_keys TO authenticated;
GRANT ALL ON public.competition_question_keys TO service_role;

CREATE TABLE public.competition_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_score numeric NOT NULL DEFAULT 0,
  test_cases_passed integer NOT NULL DEFAULT 0,
  strikes_count integer NOT NULL DEFAULT 0,
  graded_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.competition_submissions TO authenticated;
GRANT ALL ON public.competition_submissions TO service_role;

CREATE OR REPLACE FUNCTION public.can_see_competition(_comp uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_staff() OR EXISTS (
    SELECT 1 FROM public.competitions c
    WHERE c.id = _comp AND c.status = 'published' AND c.appearance_at <= now()
      AND (c.visibility = 'public' OR EXISTS (
        SELECT 1 FROM public.competition_allowed_orgs a
        WHERE a.competition_id = c.id AND a.organization_id IN (SELECT public.my_org_ids())))
  )
$$;

CREATE OR REPLACE FUNCTION public.competition_is_live(_comp uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = _comp
    AND c.status = 'published' AND now() >= c.starts_at AND now() < c.ends_at)
$$;

CREATE OR REPLACE FUNCTION public.competition_has_started(_comp uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = _comp AND now() >= c.starts_at)
$$;

CREATE OR REPLACE FUNCTION public.competition_results_visible(_comp uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.competitions c WHERE c.id = _comp
    AND (now() >= c.ends_at OR (c.show_leaderboard_during AND now() >= c.starts_at)))
$$;

-- Contestants may only change their answers while the window is open; scores are server-set
CREATE OR REPLACE FUNCTION public.guard_competition_submission()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_staff() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.started_at := now();
    NEW.total_score := 0; NEW.test_cases_passed := 0; NEW.graded_at := NULL; NEW.submitted_at := NULL;
    IF NOT public.competition_is_live(NEW.competition_id) THEN
      RAISE EXCEPTION 'This competition is not open right now';
    END IF;
  ELSE
    IF OLD.submitted_at IS NOT NULL THEN RAISE EXCEPTION 'Already submitted'; END IF;
    IF NOT public.competition_is_live(OLD.competition_id) THEN
      RAISE EXCEPTION 'This competition has closed';
    END IF;
    NEW.user_id := OLD.user_id; NEW.competition_id := OLD.competition_id;
    NEW.started_at := OLD.started_at; NEW.total_score := OLD.total_score;
    NEW.test_cases_passed := OLD.test_cases_passed; NEW.graded_at := OLD.graded_at;
    NEW.strikes_count := GREATEST(NEW.strikes_count, OLD.strikes_count);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_competition_submission BEFORE INSERT OR UPDATE ON public.competition_submissions
FOR EACH ROW EXECUTE FUNCTION public.guard_competition_submission();
CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON public.competitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_allowed_orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_question_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage competitions" ON public.competitions FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff() AND created_by = auth.uid());
CREATE POLICY "Eligible users see competitions" ON public.competitions FOR SELECT TO authenticated
  USING (public.can_see_competition(id));

CREATE POLICY "Staff manage allowed orgs" ON public.competition_allowed_orgs FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Patrons see own allocations" ON public.competition_allowed_orgs FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.my_org_ids()));

CREATE POLICY "Staff manage questions" ON public.competition_questions FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "Contestants see questions once started" ON public.competition_questions FOR SELECT TO authenticated
  USING (public.can_see_competition(competition_id) AND public.competition_has_started(competition_id));

CREATE POLICY "Staff manage keys" ON public.competition_question_keys FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE POLICY "Own submission" ON public.competition_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());
CREATE POLICY "Patrons see their students" ON public.competition_submissions FOR SELECT TO authenticated
  USING (public.is_my_org_member(user_id));
CREATE POLICY "Leaderboard when visible" ON public.competition_submissions FOR SELECT TO authenticated
  USING (public.can_see_competition(competition_id) AND public.competition_results_visible(competition_id));
CREATE POLICY "Eligible users enter" ON public.competition_submissions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_see_competition(competition_id));
CREATE POLICY "Update own open submission" ON public.competition_submissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff()) WITH CHECK (user_id = auth.uid() OR public.is_staff());