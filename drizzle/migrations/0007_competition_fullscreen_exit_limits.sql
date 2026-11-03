ALTER TABLE public.competition_submissions ADD COLUMN IF NOT EXISTS fullscreen_exits integer NOT NULL DEFAULT 0;
ALTER TABLE public.competition_submissions ADD COLUMN IF NOT EXISTS fullscreen_warning_at timestamptz;
ALTER TABLE public.competition_submissions ADD COLUMN IF NOT EXISTS disqualified_at timestamptz;
CREATE OR REPLACE FUNCTION public.record_competition_fullscreen(_comp uuid, _event text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.competition_submissions%ROWTYPE; dq boolean := false;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
 SELECT * INTO s FROM public.competition_submissions WHERE competition_id=_comp AND user_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'No entry found'; END IF;
 IF s.submitted_at IS NOT NULL THEN RETURN jsonb_build_object('exits',s.fullscreen_exits,'disqualified',s.disqualified_at IS NOT NULL); END IF;
 IF _event NOT IN ('exit','return','timeout') THEN RAISE EXCEPTION 'Invalid event'; END IF;
 IF _event='exit' THEN
  s.fullscreen_exits := s.fullscreen_exits + 1;
  dq := s.fullscreen_exits >= 2;
  s.fullscreen_warning_at := now();
 ELSE
  dq := s.fullscreen_warning_at IS NOT NULL AND now() >= s.fullscreen_warning_at + interval '10 seconds';
  IF _event='return' AND NOT dq THEN s.fullscreen_warning_at := NULL; END IF;
 END IF;
 PERFORM set_config('app.grading','1',true);
 UPDATE public.competition_submissions SET fullscreen_exits=s.fullscreen_exits, fullscreen_warning_at=s.fullscreen_warning_at,
  disqualified_at=CASE WHEN dq THEN now() ELSE disqualified_at END,
  strikes_count=CASE WHEN dq THEN greatest(strikes_count,3) ELSE strikes_count END, updated_at=now() WHERE id=s.id;
 IF dq THEN PERFORM public.submit_competition(_comp); END IF;
 PERFORM set_config('app.grading','0',true);
 RETURN jsonb_build_object('exits',s.fullscreen_exits,'disqualified',dq,'warning_at',s.fullscreen_warning_at);
END $$;
REVOKE ALL ON FUNCTION public.record_competition_fullscreen(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_competition_fullscreen(uuid,text) TO authenticated;