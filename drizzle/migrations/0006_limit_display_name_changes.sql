CREATE OR REPLACE FUNCTION public.enforce_display_name_change_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    IF OLD.name_window_started_at IS NULL OR OLD.name_window_started_at < now() - interval '1 year' THEN
      NEW.name_window_started_at := now();
      NEW.name_changes_used := 1;
    ELSE
      IF OLD.name_changes_used >= 2 THEN
        RAISE EXCEPTION 'You can only change your display name twice a year.';
      END IF;
      NEW.name_changes_used := OLD.name_changes_used + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_display_name_limit ON public.profiles;
CREATE TRIGGER profiles_display_name_limit
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_display_name_change_limit();