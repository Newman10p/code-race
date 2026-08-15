-- Light Academy Setup & Access Control Migration

-- 1. Create Light Academy organization if it doesn't exist
INSERT INTO organisations (name, slug)
SELECT 'Light Academy', 'light-academy'
WHERE NOT EXISTS (
  SELECT 1 FROM organisations WHERE slug = 'light-academy'
);

-- 2. Get the organisation ID
DO $$
DECLARE
  light_academy_id UUID;
BEGIN
  SELECT id INTO light_academy_id FROM organisations WHERE slug = 'light-academy';
  
  -- 3. Move all non-staff users under Light Academy's patron
  UPDATE profiles 
  SET patron_id = (
    SELECT id FROM profiles 
    WHERE organisation_id = light_academy_id 
    AND role = 'patron'
    LIMIT 1
  )
  WHERE role NOT IN ('patron', 'admin', 'staff')
  AND patron_id IS NULL;
  
  -- 4. Auto-enroll new signups into Light Academy
  -- This is handled by a trigger in production, but we'll set defaults here
  UPDATE auth.users 
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('default_org', 'light-academy')
  WHERE raw_user_meta_data IS NULL 
  OR NOT raw_user_meta_data ? 'default_org';
END $$;

-- 5. Strengthen Row Level Security policies
-- Ensure users can ONLY access resources their patron has permitted

-- Flashcards: Only accessible to users in same organisation or explicitly shared
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org flashcards" ON flashcards;
CREATE POLICY "Users can view own org flashcards"
  ON flashcards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND (p.organisation_id = flashcards.organisation_id OR p.patron_id = flashcards.created_by)
    )
  );

-- Lessons: Restrict to organisation members
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org lessons" ON lessons;
CREATE POLICY "Users can view own org lessons"
  ON lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.organisation_id = lessons.organisation_id
    )
  );

-- Quizzes: Restrict to organisation members
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org quizzes" ON quizzes;
CREATE POLICY "Users can view own org quizzes"
  ON quizzes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.organisation_id = quizzes.organisation_id
    )
  );

-- Game Sessions: Only visible to participants and organisers
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own game sessions" ON game_sessions;
CREATE POLICY "Users can view own game sessions"
  ON game_sessions FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM game_participants gp 
      WHERE gp.session_id = game_sessions.id 
      AND gp.user_id = auth.uid()
    )
  );

-- Profiles: Limit visibility based on organisation/patron relationship
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles in same org" ON profiles;
CREATE POLICY "Users can view profiles in same org"
  ON profiles FOR SELECT
  USING (
    id = auth.uid()
    OR organisation_id = (SELECT organisation_id FROM profiles WHERE id = auth.uid())
    OR patron_id = (SELECT patron_id FROM profiles WHERE id = auth.uid())
  );

-- Collab Groups: Members only access
ALTER TABLE collab_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Group members can view groups" ON collab_groups;
CREATE POLICY "Group members can view groups"
  ON collab_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM collab_group_members cgm 
      WHERE cgm.group_id = collab_groups.id 
      AND cgm.user_id = auth.uid()
    )
  );

-- DM Conversations: Only participants can access
ALTER TABLE dm_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversations" ON dm_conversations;
CREATE POLICY "Users can view own conversations"
  ON dm_conversations FOR SELECT
  USING (
    user_a = auth.uid() OR user_b = auth.uid()
  );

-- DM Messages: Only conversation participants can view
ALTER TABLE dm_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON dm_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON dm_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dm_conversations dc 
      WHERE dc.id = dm_messages.conversation_id 
      AND (dc.user_a = auth.uid() OR dc.user_b = auth.uid())
    )
  );

COMMENT ON THIS MIGRATION IS 'Sets up Light Academy as default org, moves users under Light Academy patron, and strengthens RLS policies for access control';
