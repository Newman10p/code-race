
-- ============ enums ============
CREATE TYPE public.collab_group_role AS ENUM ('owner','moderator','member','patron');
CREATE TYPE public.collab_group_privacy AS ENUM ('invite_only','request_to_join','discoverable','private');
CREATE TYPE public.collab_group_status AS ENUM ('pending','active','frozen','archived');
CREATE TYPE public.collab_request_status AS ENUM ('pending','accepted','declined');
CREATE TYPE public.collab_report_status AS ENUM ('new','under_review','escalated','action_taken','resolved','dismissed');

-- ============ helper: is staff ============
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'setter')
$$;

-- ============ groups ============
CREATE TABLE public.collab_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  avatar_url text,
  banner_url text,
  privacy public.collab_group_privacy NOT NULL DEFAULT 'invite_only',
  status public.collab_group_status NOT NULL DEFAULT 'active',
  is_default boolean NOT NULL DEFAULT false,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  patron_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_groups TO authenticated;
GRANT ALL ON public.collab_groups TO service_role;
ALTER TABLE public.collab_groups ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.collab_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.collab_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.collab_group_role NOT NULL DEFAULT 'member',
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_group_members TO authenticated;
GRANT ALL ON public.collab_group_members TO service_role;
ALTER TABLE public.collab_group_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_group_member(_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.collab_group_members WHERE group_id=_group AND user_id=auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.is_group_manager(_group uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.collab_group_members
    WHERE group_id=_group AND user_id=auth.uid() AND role IN ('owner','moderator','patron')
  ) OR public.is_staff()
$$;

CREATE POLICY "read groups" ON public.collab_groups FOR SELECT TO authenticated
  USING (public.is_group_member(id) OR privacy='discoverable' OR public.is_staff());
CREATE POLICY "create groups" ON public.collab_groups FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "manage groups" ON public.collab_groups FOR UPDATE TO authenticated
  USING (public.is_group_manager(id)) WITH CHECK (public.is_group_manager(id));
CREATE POLICY "delete groups" ON public.collab_groups FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_staff());

CREATE POLICY "read members" ON public.collab_group_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(group_id) OR public.is_staff());
CREATE POLICY "join or add members" ON public.collab_group_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_group_manager(group_id));
CREATE POLICY "update members" ON public.collab_group_members FOR UPDATE TO authenticated
  USING (public.is_group_manager(group_id)) WITH CHECK (public.is_group_manager(group_id));
CREATE POLICY "remove members" ON public.collab_group_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_group_manager(group_id));

-- ============ group messages ============
CREATE TABLE public.collab_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.collab_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  kind text NOT NULL DEFAULT 'text',
  body text NOT NULL,
  code_language text,
  code_filename text,
  attachment_url text,
  reply_to_id uuid REFERENCES public.collab_messages(id) ON DELETE SET NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collab_messages TO authenticated;
GRANT ALL ON public.collab_messages TO service_role;
ALTER TABLE public.collab_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read group messages" ON public.collab_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id) OR public.is_staff());
CREATE POLICY "send group messages" ON public.collab_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND public.is_group_member(group_id)
    AND EXISTS (SELECT 1 FROM public.collab_groups g WHERE g.id=group_id AND g.status='active')
  );
CREATE POLICY "edit group messages" ON public.collab_messages FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR public.is_group_manager(group_id))
  WITH CHECK (sender_id = auth.uid() OR public.is_group_manager(group_id));
CREATE POLICY "delete group messages" ON public.collab_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR public.is_group_manager(group_id));

CREATE TABLE public.collab_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.collab_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.collab_reactions TO authenticated;
GRANT ALL ON public.collab_reactions TO service_role;
ALTER TABLE public.collab_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read reactions" ON public.collab_reactions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collab_messages m WHERE m.id=message_id AND public.is_group_member(m.group_id)));
CREATE POLICY "add reactions" ON public.collab_reactions FOR INSERT TO authenticated
  WITH CHECK (user_id=auth.uid() AND EXISTS (SELECT 1 FROM public.collab_messages m WHERE m.id=message_id AND public.is_group_member(m.group_id)));
CREATE POLICY "remove reactions" ON public.collab_reactions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ============ blocks ============
CREATE TABLE public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own blocks" ON public.user_blocks FOR SELECT TO authenticated
  USING (blocker_id = auth.uid() OR public.is_staff());
CREATE POLICY "create own blocks" ON public.user_blocks FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());
CREATE POLICY "delete own blocks" ON public.user_blocks FOR DELETE TO authenticated
  USING (blocker_id = auth.uid());

CREATE OR REPLACE FUNCTION public.blocked_between(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id=_a AND blocked_id=_b) OR (blocker_id=_b AND blocked_id=_a)
  )
$$;

-- ============ chat requests ============
CREATE TABLE public.chat_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name text NOT NULL,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name text,
  reason text NOT NULL DEFAULT '',
  status public.collab_request_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.chat_requests TO authenticated;
GRANT ALL ON public.chat_requests TO service_role;
ALTER TABLE public.chat_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own requests" ON public.chat_requests FOR SELECT TO authenticated
  USING (requester_id=auth.uid() OR recipient_id=auth.uid() OR public.is_staff());
CREATE POLICY "send requests" ON public.chat_requests FOR INSERT TO authenticated
  WITH CHECK (requester_id=auth.uid() AND NOT public.blocked_between(auth.uid(), recipient_id));
CREATE POLICY "respond to requests" ON public.chat_requests FOR UPDATE TO authenticated
  USING (recipient_id=auth.uid()) WITH CHECK (recipient_id=auth.uid());

-- ============ e2ee keys + private conversations ============
CREATE TABLE public.user_public_keys (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  public_key jsonb NOT NULL,
  algorithm text NOT NULL DEFAULT 'ECDH-P256',
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_public_keys TO authenticated;
GRANT ALL ON public.user_public_keys TO service_role;
ALTER TABLE public.user_public_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read public keys" ON public.user_public_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "publish own key" ON public.user_public_keys FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid());
CREATE POLICY "update own key" ON public.user_public_keys FOR UPDATE TO authenticated
  USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

CREATE TABLE public.dm_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_a_name text,
  user_b_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b)
);
GRANT SELECT, INSERT, UPDATE ON public.dm_conversations TO authenticated;
GRANT ALL ON public.dm_conversations TO service_role;
ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own conversations" ON public.dm_conversations FOR SELECT TO authenticated
  USING (user_a=auth.uid() OR user_b=auth.uid());
CREATE POLICY "create conversation" ON public.dm_conversations FOR INSERT TO authenticated
  WITH CHECK (
    (user_a=auth.uid() OR user_b=auth.uid())
    AND NOT public.blocked_between(user_a, user_b)
    AND EXISTS (
      SELECT 1 FROM public.chat_requests r WHERE r.status='accepted'
        AND ((r.requester_id=user_a AND r.recipient_id=user_b) OR (r.requester_id=user_b AND r.recipient_id=user_a))
    )
  );
CREATE POLICY "touch own conversation" ON public.dm_conversations FOR UPDATE TO authenticated
  USING (user_a=auth.uid() OR user_b=auth.uid()) WITH CHECK (user_a=auth.uid() OR user_b=auth.uid());

CREATE OR REPLACE FUNCTION public.in_conversation(_conv uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dm_conversations c WHERE c.id=_conv AND (c.user_a=auth.uid() OR c.user_b=auth.uid()))
$$;

-- ciphertext only: the server never stores plaintext private messages
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ciphertext text NOT NULL,
  iv text NOT NULL,
  sender_ephemeral_key jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.dm_messages TO authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own dm" ON public.dm_messages FOR SELECT TO authenticated USING (public.in_conversation(conversation_id));
CREATE POLICY "send dm" ON public.dm_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id=auth.uid() AND public.in_conversation(conversation_id));
CREATE POLICY "delete own dm" ON public.dm_messages FOR DELETE TO authenticated USING (sender_id=auth.uid());

-- ============ reports / moderation / audit ============
CREATE TABLE public.collab_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_name text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_name text,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  description text,
  evidence text,
  evidence_submitted_by_reporter boolean NOT NULL DEFAULT false,
  status public.collab_report_status NOT NULL DEFAULT 'new',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.collab_reports TO authenticated;
GRANT ALL ON public.collab_reports TO service_role;
ALTER TABLE public.collab_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read reports" ON public.collab_reports FOR SELECT TO authenticated
  USING (reporter_id=auth.uid() OR public.is_staff() OR public.has_role(auth.uid(),'patron'));
CREATE POLICY "file reports" ON public.collab_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id=auth.uid());
CREATE POLICY "moderate reports" ON public.collab_reports FOR UPDATE TO authenticated
  USING (public.is_staff() OR public.has_role(auth.uid(),'patron'))
  WITH CHECK (public.is_staff() OR public.has_role(auth.uid(),'patron'));

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name text NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  target_label text,
  reason text NOT NULL,
  result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read audit" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_staff());
CREATE POLICY "staff write audit" ON public.admin_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id=auth.uid() AND (public.is_staff() OR public.has_role(auth.uid(),'patron')));

-- ============ platform policy ============
CREATE TABLE public.collab_settings (
  id boolean PRIMARY KEY DEFAULT true,
  allow_student_groups boolean NOT NULL DEFAULT true,
  require_admin_approval boolean NOT NULL DEFAULT false,
  allow_discoverable_groups boolean NOT NULL DEFAULT true,
  allow_private_chat boolean NOT NULL DEFAULT true,
  require_mutual_approval boolean NOT NULL DEFAULT true,
  request_policy text NOT NULL DEFAULT 'same_school',
  allow_blocking boolean NOT NULL DEFAULT true,
  allow_reporting boolean NOT NULL DEFAULT true,
  max_requests_per_hour integer NOT NULL DEFAULT 5,
  freeze_group_messaging boolean NOT NULL DEFAULT false,
  freeze_group_creation boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collab_settings_singleton CHECK (id)
);
GRANT SELECT ON public.collab_settings TO authenticated;
GRANT ALL ON public.collab_settings TO service_role;
ALTER TABLE public.collab_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read settings" ON public.collab_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff update settings" ON public.collab_settings FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());
GRANT UPDATE ON public.collab_settings TO authenticated;
INSERT INTO public.collab_settings (id) VALUES (true);

-- ============ chat appearance ============
CREATE TABLE public.chat_appearance (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'modern_dark',
  wallpaper text NOT NULL DEFAULT 'solid',
  density text NOT NULL DEFAULT 'normal',
  bubble_style text NOT NULL DEFAULT 'rounded',
  accent text NOT NULL DEFAULT '#00D4FF',
  animations text NOT NULL DEFAULT 'full',
  sound text NOT NULL DEFAULT 'mentions',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.chat_appearance TO authenticated;
GRANT ALL ON public.chat_appearance TO service_role;
ALTER TABLE public.chat_appearance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own appearance" ON public.chat_appearance FOR ALL TO authenticated
  USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

-- triggers
CREATE TRIGGER trg_collab_groups_updated BEFORE UPDATE ON public.collab_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_collab_reports_updated BEFORE UPDATE ON public.collab_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.collab_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
