
-- Add round support to questions
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS round_number integer NOT NULL DEFAULT 1;

-- Add tournament fields to game_sessions
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS tournament_mode boolean NOT NULL DEFAULT false;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS current_round integer NOT NULL DEFAULT 1;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS round_started_at timestamptz;
ALTER TABLE public.game_sessions ADD COLUMN IF NOT EXISTS round_paused boolean NOT NULL DEFAULT true;

-- Add disqualification + round tracking to participants
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS is_disqualified boolean NOT NULL DEFAULT false;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS strike_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS round_reached integer NOT NULL DEFAULT 1;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS eliminated_round integer;
ALTER TABLE public.participants ADD COLUMN IF NOT EXISTS dq_reason text;

-- Round configuration table (per quiz)
CREATE TABLE IF NOT EXISTS public.quiz_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  round_number integer NOT NULL,
  name text NOT NULL DEFAULT '',
  duration_seconds integer NOT NULL DEFAULT 300,
  cutoff_type text NOT NULL DEFAULT 'top_n', -- 'top_n' or 'top_pct'
  cutoff_value integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, round_number)
);

ALTER TABLE public.quiz_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rounds for own quizzes"
  ON public.quiz_rounds FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.folders f ON f.id = q.folder_id
    WHERE q.id = quiz_rounds.quiz_id AND f.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view rounds in active sessions"
  ON public.quiz_rounds FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.game_sessions gs
    WHERE gs.quiz_id = quiz_rounds.quiz_id AND gs.status IN ('active', 'lobby')
  ));

CREATE POLICY "Users can manage rounds for own quizzes"
  ON public.quiz_rounds FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.folders f ON f.id = q.folder_id
    WHERE q.id = quiz_rounds.quiz_id AND f.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quizzes q
    JOIN public.folders f ON f.id = q.folder_id
    WHERE q.id = quiz_rounds.quiz_id AND f.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS idx_questions_quiz_round ON public.questions (quiz_id, round_number, order_index);
CREATE INDEX IF NOT EXISTS idx_participants_session_score ON public.participants (session_id, current_score DESC);
