-- Tabela de treinos compartilhados
CREATE TABLE IF NOT EXISTS shared_workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sessao_data JSONB NOT NULL, -- snapshot completo da SessaoTreino
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_shared_workouts_to_user ON shared_workouts(to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_shared_workouts_from_user ON shared_workouts(from_user_id);

-- RLS
ALTER TABLE shared_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own shared workouts"
  ON shared_workouts FOR SELECT
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Users can insert shared workouts"
  ON shared_workouts FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Recipients can update status"
  ON shared_workouts FOR UPDATE
  USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their shared workouts"
  ON shared_workouts FOR DELETE
  USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
