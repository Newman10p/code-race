-- ORGANIZATIONS -------------------------------------------------------------
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_name text NOT NULL,
  patron_name text NOT NULL,
  patron_email text NOT NULL,
  patron_phone text,
  location text,
  notes text,
  patron_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_organizations_patron_email ON public.organizations (lower(patron_email));
CREATE INDEX idx_organizations_patron_user ON public.organizations (patron_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ORGANIZATION MEMBERS -------------------------------------------------------
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);
CREATE INDEX idx_org_members_email ON public.organization_members (lower(email));
CREATE INDEX idx_org_members_user ON public.organization_members (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- SHARED RESOURCES -----------------------------------------------------------
CREATE TABLE public.shared_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('flashcard_set','lesson_course','quiz')),
  resource_id uuid NOT NULL,
  title text NOT NULL,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, resource_type, resource_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_resources TO authenticated;
GRANT ALL ON public.shared_resources TO service_role;
ALTER TABLE public.shared_resources ENABLE ROW LEVEL SECURITY;

-- CHAT -----------------------------------------------------------------------
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  sender_role text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_created ON public.chat_messages (created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS -----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.my_org_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.organizations WHERE patron_user_id = auth.uid()
  UNION
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_org_patron(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org AND patron_user_id = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_org_creator(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations WHERE id = _org AND created_by = auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_shared_with_me(_type text, _id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_resources sr
    WHERE sr.resource_type = _type AND sr.resource_id = _id
      AND sr.organization_id IN (SELECT public.my_org_ids())
  )
$$;

CREATE OR REPLACE FUNCTION public.is_my_org_member(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.user_id = _user AND o.patron_user_id = auth.uid()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.my_org_ids() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_patron(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_org_creator(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_shared_with_me(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_my_org_member(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_patron(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_shared_with_me(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_org_member(uuid) TO authenticated;

-- POLICIES: organizations ----------------------------------------------------
CREATE POLICY "Setters create organizations" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'setter'));

CREATE POLICY "View own or invited organizations" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR patron_user_id = auth.uid()
    OR lower(patron_email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR id IN (SELECT public.my_org_ids())
  );

CREATE POLICY "Setter creator updates organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Invited patron accepts organization" ON public.organizations
  FOR UPDATE TO authenticated
  USING (lower(patron_email) = lower(COALESCE(auth.jwt() ->> 'email', '')))
  WITH CHECK (patron_user_id = auth.uid());

CREATE POLICY "Setter creator deletes organization" ON public.organizations
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- POLICIES: organization_members ---------------------------------------------
CREATE POLICY "View org members" ON public.organization_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
    OR public.is_org_patron(organization_id)
    OR public.is_org_creator(organization_id)
  );

CREATE POLICY "Patron adds org members" ON public.organization_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_org_patron(organization_id) OR public.is_org_creator(organization_id));

CREATE POLICY "Patron or self updates org member" ON public.organization_members
  FOR UPDATE TO authenticated
  USING (
    public.is_org_patron(organization_id)
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  )
  WITH CHECK (
    public.is_org_patron(organization_id)
    OR lower(email) = lower(COALESCE(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "Patron removes org members" ON public.organization_members
  FOR DELETE TO authenticated
  USING (public.is_org_patron(organization_id) OR public.is_org_creator(organization_id));

-- POLICIES: shared_resources --------------------------------------------------
CREATE POLICY "View shared resources" ON public.shared_resources
  FOR SELECT TO authenticated
  USING (shared_by = auth.uid() OR organization_id IN (SELECT public.my_org_ids()));

CREATE POLICY "Setters share resources" ON public.shared_resources
  FOR INSERT TO authenticated
  WITH CHECK (shared_by = auth.uid() AND public.has_role(auth.uid(), 'setter'));

CREATE POLICY "Sharer removes shared resource" ON public.shared_resources
  FOR DELETE TO authenticated
  USING (shared_by = auth.uid() OR public.is_org_creator(organization_id));

-- POLICIES: chat_messages -----------------------------------------------------
CREATE POLICY "Patrons and setters read chat" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'patron')
    OR public.has_role(auth.uid(), 'setter')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Patrons and setters post chat" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      public.has_role(auth.uid(), 'patron')
      OR public.has_role(auth.uid(), 'setter')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "Authors delete own chat messages" ON public.chat_messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- Patrons can read their members' profiles
CREATE POLICY "Patrons view member profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_my_org_member(user_id));

-- Published rubric results visible to everyone signed in
CREATE POLICY "Anyone views results of published rubrics" ON public.criteria_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.criteria_rubrics r
    WHERE r.id = criteria_submissions.rubric_id AND r.is_published = true
  ));

-- Shared resource visibility for org members
CREATE POLICY "Org members view shared flashcard sets" ON public.flashcard_sets
  FOR SELECT TO authenticated
  USING (public.is_shared_with_me('flashcard_set', id));

CREATE POLICY "Org members view shared courses" ON public.lesson_courses
  FOR SELECT TO authenticated
  USING (public.is_shared_with_me('lesson_course', id));

-- updated_at trigger
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
