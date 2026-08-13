CREATE TABLE public.collab_competitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.collab_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  creator_name text NOT NULL DEFAULT 'Student',
  title text NOT NULL,
  brief text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'javascript',
  starter_code text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL DEFAULT 15,
  status text NOT NULL DEFAULT 'draft',
  started_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_competitions TO authenticated;
GRANT ALL ON public.collab_competitions TO service_role;
ALTER TABLE public.collab_competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view competitions" ON public.collab_competitions
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id) OR public.is_staff());
CREATE POLICY "Managers create competitions" ON public.collab_competitions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (public.is_group_manager(group_id) OR public.is_staff()));
CREATE POLICY "Managers update competitions" ON public.collab_competitions
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_group_manager(group_id) OR public.is_staff())
  WITH CHECK (created_by = auth.uid() OR public.is_group_manager(group_id) OR public.is_staff());
CREATE POLICY "Managers delete competitions" ON public.collab_competitions
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_group_manager(group_id) OR public.is_staff());

CREATE TABLE public.collab_competition_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid NOT NULL REFERENCES public.collab_competitions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT 'Student',
  code text NOT NULL DEFAULT '',
  output text,
  passed boolean NOT NULL DEFAULT false,
  score integer NOT NULL DEFAULT 0,
  elapsed_seconds integer NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (competition_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_competition_entries TO authenticated;
GRANT ALL ON public.collab_competition_entries TO service_role;
ALTER TABLE public.collab_competition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view entries" ON public.collab_competition_entries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.collab_competitions c
    WHERE c.id = competition_id AND (public.is_group_member(c.group_id) OR public.is_staff())
  ));
CREATE POLICY "Own entry insert" ON public.collab_competition_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.collab_competitions c
    WHERE c.id = competition_id AND public.is_group_member(c.group_id)
  ));
CREATE POLICY "Own entry update" ON public.collab_competition_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own entry delete" ON public.collab_competition_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

CREATE TABLE public.collab_points (
  user_id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT 'Student',
  xp integer NOT NULL DEFAULT 0,
  badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.collab_points TO authenticated;
GRANT ALL ON public.collab_points TO service_role;
ALTER TABLE public.collab_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in users view points" ON public.collab_points
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own points insert" ON public.collab_points
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own points update" ON public.collab_points
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_collab_competitions_updated_at BEFORE UPDATE ON public.collab_competitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_collab_competition_entries_updated_at BEFORE UPDATE ON public.collab_competition_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_collab_points_updated_at BEFORE UPDATE ON public.collab_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();