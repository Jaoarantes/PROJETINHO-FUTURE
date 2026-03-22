-- Tabela de configurações de notificação por usuário
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_reminders_enabled BOOLEAN DEFAULT false,
  workout_days INTEGER[] DEFAULT '{1,3,5}',
  workout_time TEXT DEFAULT '07:00',
  meal_reminders_enabled BOOLEAN DEFAULT false,
  meal_times JSONB DEFAULT '{"cafeManha":"07:30","almoco":"12:00","lanche":"16:00","jantar":"20:00"}',
  water_reminders_enabled BOOLEAN DEFAULT false,
  water_interval INTEGER DEFAULT 2,
  water_start_hour INTEGER DEFAULT 7,
  water_end_hour INTEGER DEFAULT 22,
  streak_warning_enabled BOOLEAN DEFAULT true,
  push_likes BOOLEAN DEFAULT true,
  push_comments BOOLEAN DEFAULT true,
  push_follows BOOLEAN DEFAULT true,
  fcm_token TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notification settings"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  USING (auth.uid() = user_id);
