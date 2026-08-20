-- 1. ROLES SYSTEM
CREATE TYPE public.app_role AS ENUM ('setter', 'learner', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- 2. THEME PREFERENCE
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_color text NOT NULL DEFAULT 'cyan';

-- 3. FLASHCARD SETS
CREATE TABLE public.flashcard_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  subject text DEFAULT '',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view public sets"
  ON public.flashcard_sets FOR SELECT
  TO authenticated
  USING (is_public = true OR setter_id = auth.uid());

CREATE POLICY "Setters can create their own sets"
  ON public.flashcard_sets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = setter_id AND public.has_role(auth.uid(), 'setter'));

CREATE POLICY "Setters can update their own sets"
  ON public.flashcard_sets FOR UPDATE
  TO authenticated
  USING (auth.uid() = setter_id);

CREATE POLICY "Setters can delete their own sets"
  ON public.flashcard_sets FOR DELETE
  TO authenticated
  USING (auth.uid() = setter_id);

CREATE TRIGGER update_flashcard_sets_updated_at
  BEFORE UPDATE ON public.flashcard_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. FLASHCARDS
CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cards in accessible sets"
  ON public.flashcards FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flashcard_sets fs
    WHERE fs.id = flashcards.set_id
      AND (fs.is_public = true OR fs.setter_id = auth.uid())
  ));

CREATE POLICY "Setters manage cards in own sets"
  ON public.flashcards FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flashcard_sets fs
    WHERE fs.id = flashcards.set_id AND fs.setter_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flashcard_sets fs
    WHERE fs.id = flashcards.set_id AND fs.setter_id = auth.uid()
  ));

-- 5. SAVED SETS
CREATE TABLE public.learner_saved_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, set_id)
);

ALTER TABLE public.learner_saved_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own saved sets"
  ON public.learner_saved_sets FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. AUTO-ASSIGN LEARNER ROLE
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'learner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE INDEX idx_flashcards_set_id ON public.flashcards(set_id);
CREATE INDEX idx_flashcard_sets_setter ON public.flashcard_sets(setter_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);