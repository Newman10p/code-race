ALTER TABLE public.competition_questions ADD COLUMN IF NOT EXISTS time_limit_seconds integer;
CREATE OR REPLACE FUNCTION public.server_now() RETURNS timestamptz LANGUAGE sql STABLE AS $$ select now() $$;
GRANT EXECUTE ON FUNCTION public.server_now() TO anon, authenticated;
CREATE OR REPLACE FUNCTION public.record_competition_strike(_comp uuid) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n integer;
BEGIN
  PERFORM set_config('app.grading','1',true);
  UPDATE public.competition_submissions SET strikes_count = coalesce(strikes_count,0)+1
   WHERE competition_id=_comp AND user_id=auth.uid() AND submitted_at IS NULL RETURNING strikes_count INTO n;
  RETURN coalesce(n,0);
END $$;
REVOKE EXECUTE ON FUNCTION public.record_competition_strike(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_competition_strike(uuid) TO authenticated;
CREATE POLICY "Staff see all competition submissions" ON public.competition_submissions FOR SELECT TO authenticated USING (public.is_staff());