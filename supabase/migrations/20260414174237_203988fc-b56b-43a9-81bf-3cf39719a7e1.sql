
-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Folders
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own folders" ON public.folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create folders" ON public.folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.folders FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quizzes
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view quizzes in own folders" ON public.quizzes FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.folders WHERE folders.id = quizzes.folder_id AND folders.user_id = auth.uid())
);
CREATE POLICY "Users can create quizzes" ON public.quizzes FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.folders WHERE folders.id = folder_id AND folders.user_id = auth.uid())
);
CREATE POLICY "Users can update own quizzes" ON public.quizzes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.folders WHERE folders.id = quizzes.folder_id AND folders.user_id = auth.uid())
);
CREATE POLICY "Users can delete own quizzes" ON public.quizzes FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.folders WHERE folders.id = quizzes.folder_id AND folders.user_id = auth.uid())
);
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON public.quizzes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Questions
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'mcq',
  content TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  options JSONB DEFAULT '[]'::jsonb,
  correct_option INTEGER DEFAULT 0,
  starter_code TEXT DEFAULT '',
  solution TEXT DEFAULT '',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own questions" ON public.questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.folders f ON f.id = q.folder_id WHERE q.id = questions.quiz_id AND f.user_id = auth.uid())
);
CREATE POLICY "Users can create questions" ON public.questions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.folders f ON f.id = q.folder_id WHERE q.id = quiz_id AND f.user_id = auth.uid())
);
CREATE POLICY "Users can update questions" ON public.questions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.folders f ON f.id = q.folder_id WHERE q.id = questions.quiz_id AND f.user_id = auth.uid())
);
CREATE POLICY "Users can delete questions" ON public.questions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.quizzes q JOIN public.folders f ON f.id = q.folder_id WHERE q.id = questions.quiz_id AND f.user_id = auth.uid())
);

-- Game Sessions
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  pin_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'lobby',
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view sessions" ON public.game_sessions FOR SELECT USING (true);
CREATE POLICY "Host can create sessions" ON public.game_sessions FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Host can update sessions" ON public.game_sessions FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Host can delete sessions" ON public.game_sessions FOR DELETE USING (auth.uid() = host_id);
CREATE TRIGGER update_game_sessions_updated_at BEFORE UPDATE ON public.game_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now add questions policy for active sessions (game_sessions exists now)
CREATE POLICY "Anyone can view questions in active sessions" ON public.questions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.game_sessions gs WHERE gs.quiz_id = questions.quiz_id AND gs.status IN ('active', 'lobby'))
);

-- Participants
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  current_score INTEGER NOT NULL DEFAULT 0,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  tab_switch_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view participants" ON public.participants FOR SELECT USING (true);
CREATE POLICY "Anyone can join" ON public.participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update participant" ON public.participants FOR UPDATE USING (true);

-- Participant Answers
CREATE TABLE public.participant_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer JSONB,
  is_correct BOOLEAN DEFAULT false,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  flagged_tab_switch BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(participant_id, question_id)
);
ALTER TABLE public.participant_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view answers" ON public.participant_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can insert answers" ON public.participant_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update answers" ON public.participant_answers FOR UPDATE USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participant_answers;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
