CREATE OR REPLACE FUNCTION public.guard_competition_submission()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.is_staff() OR current_setting('app.grading', true) = '1' THEN RETURN NEW; END IF;
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
    NEW.submitted_at := NULL;
    NEW.strikes_count := GREATEST(NEW.strikes_count, OLD.strikes_count);
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.submit_competition(_comp uuid)
 RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  s public.competition_submissions%ROWTYPE;
  c public.competitions%ROWTYPE;
  q record; a jsonb; total numeric := 0; passed int := 0; tp int; tt int;
BEGIN
  SELECT * INTO s FROM public.competition_submissions WHERE competition_id=_comp AND user_id=auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'No entry found'; END IF;
  IF s.submitted_at IS NOT NULL THEN RETURN s.total_score; END IF;
  SELECT * INTO c FROM public.competitions WHERE id=_comp;
  IF now() > c.ends_at + interval '2 minutes' THEN RAISE EXCEPTION 'Submission window closed'; END IF;
  FOR q IN SELECT cq.id, cq.type, cq.points, k.correct_option, k.accepted_answers
           FROM public.competition_questions cq LEFT JOIN public.competition_question_keys k ON k.question_id=cq.id
           WHERE cq.competition_id=_comp LOOP
    a := s.answers -> q.id::text;
    IF a IS NULL THEN CONTINUE; END IF;
    IF q.type='mcq' AND (a->>'choice') IS NOT NULL AND (a->>'choice')::int = q.correct_option THEN
      total := total + q.points;
    ELSIF q.type='short_text' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(q.accepted_answers) x
          WHERE lower(trim(x)) = lower(trim(coalesce(a->>'text','')))) THEN
      total := total + q.points;
    ELSIF q.type='code' THEN
      tp := greatest(coalesce((a->>'passed')::int,0),0); tt := greatest(coalesce((a->>'total')::int,0),0);
      IF tt > 0 THEN tp := least(tp, tt); total := total + round(q.points * tp::numeric / tt, 2); passed := passed + tp; END IF;
    END IF;
  END LOOP;
  PERFORM set_config('app.grading','1',true);
  UPDATE public.competition_submissions SET total_score=total, test_cases_passed=passed,
    submitted_at=now(), graded_at=now(),
    time_spent_seconds=greatest(0, extract(epoch from (now()-s.started_at))::int), updated_at=now()
  WHERE id=s.id;
  PERFORM set_config('app.grading','0',true);
  RETURN total;
END $function$;

REVOKE ALL ON FUNCTION public.submit_competition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_competition(uuid) TO authenticated;