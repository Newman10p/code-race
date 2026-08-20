
-- 1. Require sign-in for join: link participants to auth user, prevent duplicates
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS participants_session_user_unique
  ON public.participants(session_id, user_id) WHERE user_id IS NOT NULL;

-- 2. Announcements from setters, visible to all authenticated users, dismissible per user
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  audience text NOT NULL DEFAULT 'all', -- 'all' | 'learners' | 'setters'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view active announcements"
  ON public.announcements FOR SELECT TO authenticated
  USING (is_active = true OR setter_id = auth.uid());
CREATE POLICY "Setters manage own announcements"
  ON public.announcements FOR ALL TO authenticated
  USING (setter_id = auth.uid() AND public.has_role(auth.uid(), 'setter'))
  WITH CHECK (setter_id = auth.uid() AND public.has_role(auth.uid(), 'setter'));

CREATE TABLE IF NOT EXISTS public.announcement_dismissals (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, announcement_id)
);
GRANT SELECT, INSERT, DELETE ON public.announcement_dismissals TO authenticated;
GRANT ALL ON public.announcement_dismissals TO service_role;
ALTER TABLE public.announcement_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own dismissals"
  ON public.announcement_dismissals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_announcements_updated
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Tutorial completion tracker on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tutorial_completed_at timestamptz;
