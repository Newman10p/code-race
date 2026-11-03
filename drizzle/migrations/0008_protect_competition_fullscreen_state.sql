CREATE OR REPLACE FUNCTION public.guard_competition_fullscreen_state() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF auth.uid() IS NULL OR public.is_staff() OR current_setting('app.grading',true)='1' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
  NEW.fullscreen_exits := 0; NEW.fullscreen_warning_at := NULL; NEW.disqualified_at := NULL;
 ELSE
  NEW.fullscreen_exits := OLD.fullscreen_exits; NEW.fullscreen_warning_at := OLD.fullscreen_warning_at; NEW.disqualified_at := OLD.disqualified_at;
  IF OLD.disqualified_at IS NOT NULL THEN RAISE EXCEPTION 'This attempt is disqualified'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_competition_fullscreen_state BEFORE INSERT OR UPDATE ON public.competition_submissions FOR EACH ROW EXECUTE FUNCTION public.guard_competition_fullscreen_state();