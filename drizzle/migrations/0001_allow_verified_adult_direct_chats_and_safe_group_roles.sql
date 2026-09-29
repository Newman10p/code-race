-- Adult-initiated chats bypass student request approval, but never blocks.
CREATE POLICY "verified adults can start permitted conversations" ON public.dm_conversations
FOR INSERT TO authenticated WITH CHECK (
  (user_a = auth.uid() OR user_b = auth.uid())
  AND user_a <> user_b
  AND NOT public.blocked_between(user_a, user_b)
  AND (
    public.is_staff()
    OR (
      public.has_role(auth.uid(), 'patron')
      AND public.is_my_org_member(CASE WHEN user_a = auth.uid() THEN user_b ELSE user_a END)
    )
  )
);

-- Membership roles are assigned from trusted database roles, never arbitrary client input.
CREATE OR REPLACE FUNCTION public.safe_group_member_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id = auth.uid() THEN
    IF NEW.role = 'patron' AND NOT public.has_role(auth.uid(), 'patron') THEN
      RAISE EXCEPTION 'Only verified patrons may use the patron role';
    END IF;
    IF NEW.role IN ('owner', 'moderator') AND NOT public.is_staff() AND
       NOT (NEW.role = 'owner' AND EXISTS (
         SELECT 1 FROM public.collab_groups g WHERE g.id = NEW.group_id AND g.created_by = auth.uid()
       )) THEN
      RAISE EXCEPTION 'Only the creator or staff may assign this role';
    END IF;
  ELSIF NOT public.is_group_manager(NEW.group_id) THEN
    RAISE EXCEPTION 'Only group managers may add members';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER safe_group_member_insert BEFORE INSERT ON public.collab_group_members
FOR EACH ROW EXECUTE FUNCTION public.safe_group_member_insert();

CREATE OR REPLACE FUNCTION public.safe_group_member_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id <> OLD.user_id OR NEW.group_id <> OLD.group_id THEN
    RAISE EXCEPTION 'Membership identity cannot change';
  END IF;
  IF NEW.role <> OLD.role AND NOT public.is_staff() THEN
    IF OLD.role = 'owner' OR NEW.role IN ('owner', 'patron') OR NOT EXISTS (
      SELECT 1 FROM public.collab_group_members m WHERE m.group_id = OLD.group_id
      AND m.user_id = auth.uid() AND m.role = 'owner'
    ) THEN
      RAISE EXCEPTION 'Only owners may assign moderators';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER safe_group_member_update BEFORE UPDATE ON public.collab_group_members
FOR EACH ROW EXECUTE FUNCTION public.safe_group_member_update();

CREATE OR REPLACE FUNCTION public.chat_role_label(_user uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN NULL
    WHEN public.has_role(_user, 'admin') OR public.has_role(_user, 'setter') THEN 'Platform Setter'
    WHEN public.has_role(_user, 'patron') THEN
      'Patron · ' || COALESCE((SELECT o.school_name FROM public.organizations o
        WHERE o.patron_user_id = _user AND o.status = 'active'
        ORDER BY o.created_at LIMIT 1), 'School')
    ELSE NULL END
$$;
REVOKE EXECUTE ON FUNCTION public.chat_role_label(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.chat_role_label(uuid) TO authenticated;