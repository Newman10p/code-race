CREATE OR REPLACE FUNCTION public.accept_patron_invite(_org uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _ok boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT lower(email) INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN
    RETURN false;
  END IF;

  UPDATE public.organizations
     SET patron_user_id = auth.uid(),
         status = 'active',
         accepted_at = now()
   WHERE id = _org
     AND lower(patron_email) = _email
     AND patron_user_id IS NULL;

  _ok := FOUND;

  IF _ok THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'patron')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN _ok;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_patron_invite(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_patron_invite(uuid) TO authenticated;
