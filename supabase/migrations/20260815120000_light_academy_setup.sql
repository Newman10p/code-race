-- ============================================================================
-- LIGHT ACADEMY SETUP & ACCESS CONTROL ENHANCEMENTS
-- Run this migration to:
-- 1. Create "Light Academy" organization if not exists
-- 2. Assign all current signed-in users (non-setter, non-patron) to Light Academy
-- 3. Ensure new signups automatically join Light Academy
-- 4. Strengthen access control so users only see patron-permitted resources
-- ============================================================================

-- First, ensure 'patron' role type exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('setter', 'learner', 'patron', 'admin');
  ELSE
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'patron';
  END IF;
END $$;

-- ============================================================================
-- 1. CREATE LIGHT ACADEMY ORGANIZATION
-- ============================================================================

-- Get or create a default admin/setter user to be the creator
DO $$
DECLARE
  creator_id uuid;
  light_academy_org_id uuid;
BEGIN
  -- Find first admin or setter user to be the creator
  SELECT ur.user_id INTO creator_id 
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'setter')
  ORDER BY ur.created_at ASC
  LIMIT 1;
  
  -- If no admin/setter exists, use first authenticated user
  IF creator_id IS NULL THEN
    SELECT au.id INTO creator_id FROM auth.users au LIMIT 1;
  END IF;
  
  -- Check if Light Academy already exists
  SELECT o.id INTO light_academy_org_id 
  FROM public.organizations o 
  WHERE lower(o.school_name) = 'light academy';
  
  -- Create Light Academy if it doesn't exist
  IF light_academy_org_id IS NULL AND creator_id IS NOT NULL THEN
    INSERT INTO public.organizations (
      created_by, 
      school_name, 
      patron_name, 
      patron_email, 
      patron_phone, 
      location, 
      status, 
      accepted_at
    ) VALUES (
      creator_id,
      'Light Academy',
      'Light Academy Patron',
      'patron@lightacademy.edu',
      NULL,
      'Online',
      'accepted',
      now()
    ) RETURNING id INTO light_academy_org_id;
    
    RAISE NOTICE 'Created Light Academy organization with ID: %', light_academy_org_id;
  ELSE
    RAISE NOTICE 'Light Academy already exists with ID: %', COALESCE(light_academy_org_id, 'N/A');
  END IF;
END $$;

-- ============================================================================
-- 2. ASSIGN CURRENT USERS TO LIGHT ACADEMY
-- ============================================================================

-- Move all currently signed-in users (who are not setters/patrons/admins) 
-- under Light Academy's patron
DO $$
DECLARE
  light_academy_org_id uuid;
  light_patron_user_id uuid;
BEGIN
  -- Get Light Academy org
  SELECT o.id, o.patron_user_id 
  INTO light_academy_org_id, light_patron_user_id
  FROM public.organizations o 
  WHERE lower(o.school_name) = 'light academy'
  LIMIT 1;
  
  IF light_academy_org_id IS NOT NULL THEN
    -- Add all learners (non-setter, non-patron, non-admin users) to Light Academy
    INSERT INTO public.organization_members (organization_id, email, full_name, user_id, invited_by)
    SELECT 
      light_academy_org_id,
      lower(u.email),
      COALESCE(p.display_name, split_part(u.email, '@', 1)),
      u.id,
      COALESCE(light_patron_user_id, u.id)
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role IN ('setter', 'patron', 'admin')
    LEFT JOIN public.organization_members om ON om.user_id = u.id
    WHERE ur.id IS NULL  -- Not a setter, patron, or admin
      AND om.id IS NULL  -- Not already in an organization
      AND u.email NOT LIKE '%@lightacademy.edu'  -- Exclude the patron account itself
    ON CONFLICT (organization_id, email) DO NOTHING;
    
    RAISE NOTICE 'Assigned current learners to Light Academy';
  END IF;
END $$;

-- ============================================================================
-- 3. AUTO-ASSIGN NEW SIGNUPS TO LIGHT ACADEMY
-- ============================================================================

-- Create function to auto-add new users to Light Academy
CREATE OR REPLACE FUNCTION public.auto_join_light_academy()
RETURNS TRIGGER AS $$
DECLARE
  light_academy_org_id uuid;
  light_patron_user_id uuid;
BEGIN
  -- Only for learners (not setters/patrons/admins)
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = NEW.id AND role IN ('setter', 'patron', 'admin')
  ) THEN
    -- Get Light Academy org
    SELECT o.id, o.patron_user_id 
    INTO light_academy_org_id, light_patron_user_id
    FROM public.organizations o 
    WHERE lower(o.school_name) = 'light academy'
    LIMIT 1;
    
    -- Add to Light Academy if it exists
    IF light_academy_org_id IS NOT NULL THEN
      INSERT INTO public.organization_members (
        organization_id, 
        email, 
        full_name, 
        user_id, 
        invited_by
      ) VALUES (
        light_academy_org_id,
        lower(NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
        NEW.id,
        COALESCE(light_patron_user_id, NEW.id)
      ) ON CONFLICT (organization_id, email) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-add new users to Light Academy after they get their roles
CREATE TRIGGER on_auth_user_join_light_academy
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_join_light_academy();

-- ============================================================================
-- 4. STRENGTHEN ACCESS CONTROL POLICIES
-- ============================================================================

-- Drop existing weak policies and create stronger ones

-- Flashcard sets: Only visible if shared by patron's organization
DROP POLICY IF EXISTS "Anyone authenticated can view public sets" ON public.flashcard_sets;
CREATE POLICY "Users view flashcard sets" ON public.flashcard_sets
  FOR SELECT TO authenticated
  USING (
    is_public = true 
    OR setter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.shared_resources sr
      JOIN public.organizations o ON o.id = sr.organization_id
      WHERE sr.resource_type = 'flashcard_set' 
        AND sr.resource_id = flashcard_sets.id
        AND (o.patron_user_id = auth.uid() OR o.id IN (
          SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        ))
    )
  );

-- Lesson courses: Only visible if shared by patron's organization
DROP POLICY IF EXISTS "Org members view shared courses" ON public.lesson_courses;
CREATE POLICY "Users view lesson courses" ON public.lesson_courses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_resources sr
      JOIN public.organizations o ON o.id = sr.organization_id
      WHERE sr.resource_type = 'lesson_course' 
        AND sr.resource_id = lesson_courses.id
        AND (o.patron_user_id = auth.uid() OR o.id IN (
          SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        ))
    )
    OR author_id = auth.uid()
  );

-- Quizzes: Only accessible if shared by patron
DROP POLICY IF EXISTS "Org members view shared quizzes" ON public.quizzes;
CREATE POLICY "Users view quizzes" ON public.quizzes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_resources sr
      JOIN public.organizations o ON o.id = sr.organization_id
      WHERE sr.resource_type = 'quiz' 
        AND sr.resource_id = quizzes.id
        AND (o.patron_user_id = auth.uid() OR o.id IN (
          SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
        ))
    )
    OR folder_id IN (
      SELECT f.id FROM public.folders f WHERE f.user_id = auth.uid()
    )
  );

-- Participants: Only view own organization's participants
DROP POLICY IF EXISTS "Anyone can view sessions" ON public.participants;
CREATE POLICY "Users view participants" ON public.participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_sessions gs
      JOIN public.quizzes q ON q.id = gs.quiz_id
      JOIN public.folders f ON f.id = q.folder_id
      WHERE f.user_id = auth.uid()
    )
    OR session_id IN (
      SELECT gs.id FROM public.game_sessions gs
      JOIN public.quizzes q ON q.id = gs.quiz_id
      JOIN public.shared_resources sr ON sr.resource_id = q.id AND sr.resource_type = 'quiz'
      JOIN public.organizations o ON o.id = sr.organization_id
      WHERE o.patron_user_id = auth.uid() 
         OR o.id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
    )
  );

-- Profiles: Patrons can view their organization members' profiles
DROP POLICY IF EXISTS "Patrons view member profiles" ON public.profiles;
CREATE POLICY "Users view profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()  -- Own profile always visible
    OR public.is_my_org_member(user_id)  -- Patron can view their members
    OR EXISTS (  -- Members of same org can view each other
      SELECT 1 FROM public.organization_members m1
      JOIN public.organization_members m2 ON m1.organization_id = m2.organization_id
      WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.user_id
    )
  );

-- ============================================================================
-- 5. HELPER FUNCTION TO CHECK ORGANIZATION ACCESS
-- ============================================================================

-- Enhanced function to check if resource is accessible by user via their patron
CREATE OR REPLACE FUNCTION public.can_access_resource(_resource_type text, _resource_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_resources sr
    JOIN public.organizations o ON o.id = sr.organization_id
    WHERE sr.resource_type = _resource_type 
      AND sr.resource_id = _resource_id
      AND (
        o.patron_user_id = auth.uid()  -- User is the patron
        OR o.id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())  -- User is member
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_access_resource(text, uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_access_resource(text, uuid) TO authenticated;

-- ============================================================================
-- 6. UPDATE EXISTING MEMBERS TO LIGHT ACADEMY (for those already signed in)
-- ============================================================================

DO $$
DECLARE
  light_academy_org_id uuid;
BEGIN
  SELECT o.id INTO light_academy_org_id 
  FROM public.organizations o 
  WHERE lower(o.school_name) = 'light academy'
  LIMIT 1;
  
  IF light_academy_org_id IS NOT NULL THEN
    -- Update any existing organization_members without proper org to Light Academy
    UPDATE public.organization_members om
    SET organization_id = light_academy_org_id
    WHERE om.organization_id NOT IN (
      SELECT id FROM public.organizations WHERE status = 'accepted'
    )
    OR om.organization_id IS NULL;
    
    RAISE NOTICE 'Updated existing members to Light Academy';
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration:
-- ✅ Creates "Light Academy" as the default organization
-- ✅ Moves all current non-staff users under Light Academy
-- ✅ Auto-enrolls new signups into Light Academy
-- ✅ Strengthens RLS policies so users only access patron-approved resources
-- ✅ Adds helper functions for access checking
