-- Learner display-name change allowance (2 per rolling year)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name_changes_used integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name_window_started_at timestamptz;

-- Learner project submissions
CREATE TABLE public.project_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  learner_name text NOT NULL,
  school_name text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  project_url text,
  repo_url text,
  extra_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  document_path text,
  document_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_submissions TO authenticated;
GRANT ALL ON public.project_submissions TO service_role;

ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners manage own project submissions"
ON public.project_submissions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff see all project submissions"
ON public.project_submissions FOR SELECT TO authenticated
USING (public.is_staff());

CREATE POLICY "Patrons see their students project submissions"
ON public.project_submissions FOR SELECT TO authenticated
USING (public.is_my_org_member(user_id));

CREATE TRIGGER project_submissions_updated_at
BEFORE UPDATE ON public.project_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Setters/patrons read learner design documents stored in the private bucket
CREATE POLICY "Owners read own project documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners upload own project documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'project-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners update own project documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'project-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Staff and patrons read project documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'project-docs' AND (public.is_staff() OR public.is_my_org_member(((storage.foldername(name))[1])::uuid)));