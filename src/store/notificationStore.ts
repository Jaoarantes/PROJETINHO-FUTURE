import { create } from 'zustand';
import { supabase } from '../supabase';
import {
  requestNotificationPermission,
  scheduleWorkoutReminders,
  scheduleMealReminders,
  scheduleWaterReminders,
  scheduleStreakWarning,
  cancelAllReminders,
} from '../services/localNotificationService';

export interface NotificationSettings {
  workoutRemindersEnabled: boolean;
  workoutDays: number[];
  workoutTime: string;

  mealRemindersEnabled: boolean;
  mealTimes: {
    cafeManha: string;
    almoco: string;
    lanche: string;
    jantar: string;
  };

  waterRemindersEnabled: boolean;
  waterInterval: 1 | 2 | 3;
  waterStartHour: number;
  waterEndHour: number;

  streakWarningEnabled: boolean;

  pushLikes: boolean;
  pushComments: boolean;
  pushFollows: boolean;
}

interface NotificationState {
  uid: string | null;
  settings: NotificationSettings;
  loading: boolean;
  carregar: (uid: string) => Promise<void>;
  salvar: (updates: Partial<NotificationSettings>) => Promise<void>;
  aplicarNotificacoes: () => Promise<void>;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  workoutRemindersEnabled: false,
  workoutDays: [1, 3, 5], // Mon, Wed, Fri
  workoutTime: '07:00',
  mealRemindersEnabled: false,
  mealTimes: { cafeManha: '07:30', almoco: '12:00', lanche: '16:00', jantar: '20:00' },
  waterRemindersEnabled: false,
  waterInterval: 2,
  waterStartHour: 7,
  waterEndHour: 22,
  streakWarningEnabled: true,
  pushLikes: true,
  pushComments: true,
  pushFollows: true,
};

function parseTime(t: string): { hour: number; minute: number } {
  const [h, m] = t.split(':').map(Number);
  return { hour: h, minute: m };
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  uid: null,
  settings: { ...DEFAULT_SETTINGS },
  loading: false,

  carregar: async (uid: string) => {
    set({ uid, loading: true });

    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', uid)
      .single();

    if (data) {
      const s: NotificationSettings = {
        workoutRemindersEnabled: data.workout_reminders_enabled ?? false,
        workoutDays: data.workout_days ?? [1, 3, 5],
        workoutTime: data.workout_time ?? '07:00',
        mealRemindersEnabled: data.meal_reminders_enabled ?? false,
        mealTimes: data.meal_times ?? DEFAULT_SETTINGS.mealTimes,
        waterRemindersEnabled: data.water_reminders_enabled ?? false,
        waterInterval: data.water_interval ?? 2,
        waterStartHour: data.water_start_hour ?? 7,
        waterEndHour: data.water_end_hour ?? 22,
        streakWarningEnabled: data.streak_warning_enabled ?? true,
        pushLikes: data.push_likes ?? true,
        pushComments: data.push_comments ?? true,
        pushFollows: data.push_follows ?? true,
      };
      set({ settings: s, loading: false });
    } else {
      // Insert defaults
      await supabase.from('notification_settings').upsert({
        user_id: uid,
        workout_reminders_enabled: false,
        workout_days: [1, 3, 5],
        workout_time: '07:00',
        meal_reminders_enabled: false,
        meal_times: DEFAULT_SETTINGS.mealTimes,
        water_reminders_enabled: false,
        water_interval: 2,
        water_start_hour: 7,
        water_end_hour: 22,
        streak_warning_enabled: true,
        push_likes: true,
        push_comments: true,
        push_follows: true,
      });
      set({ settings: { ...DEFAULT_SETTINGS }, loading: false });
    }
  },

  salvar: async (updates: Partial<NotificationSettings>) => {
    const { uid, settings } = get();
    if (!uid) return;

    const newSettings = { ...settings, ...updates };
    set({ settings: newSettings });

    // Map to DB columns
    const dbData: Record<string, unknown> = { user_id: uid, updated_at: new Date().toISOString() };
    if (updates.workoutRemindersEnabled !== undefined) dbData.workout_reminders_enabled = updates.workoutRemindersEnabled;
    if (updates.workoutDays !== undefined) dbData.workout_days = updates.workoutDays;
    if (updates.workoutTime !== undefined) dbData.workout_time = updates.workoutTime;
    if (updates.mealRemindersEnabled !== undefined) dbData.meal_reminders_enabled = updates.mealRemindersEnabled;
    if (updates.mealTimes !== undefined) dbData.meal_times = updates.mealTimes;
    if (updates.waterRemindersEnabled !== undefined) dbData.water_reminders_enabled = updates.waterRemindersEnabled;
    if (updates.waterInterval !== undefined) dbData.water_interval = updates.waterInterval;
    if (updates.waterStartHour !== undefined) dbData.water_start_hour = updates.waterStartHour;
    if (updates.waterEndHour !== undefined) dbData.water_end_hour = updates.waterEndHour;
    if (updates.streakWarningEnabled !== undefined) dbData.streak_warning_enabled = updates.streakWarningEnabled;
    if (updates.pushLikes !== undefined) dbData.push_likes = updates.pushLikes;
    if (updates.pushComments !== undefined) dbData.push_comments = updates.pushComments;
    if (updates.pushFollows !== undefined) dbData.push_follows = updates.pushFollows;

    await supabase.from('notification_settings').upsert(dbData);
    await get().aplicarNotificacoes();
  },

  aplicarNotificacoes: async () => {
    const { settings } = get();

    await cancelAllReminders();

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    if (settings.workoutRemindersEnabled) {
      const { hour, minute } = parseTime(settings.workoutTime);
      await scheduleWorkoutReminders(settings.workoutDays, hour, minute);
    }

    if (settings.mealRemindersEnabled) {
      const meals = [
        { type: 'cafeManha', label: 'Café da manhã', ...parseTime(settings.mealTimes.cafeManha) },
        { type: 'almoco', label: 'Almoço', ...parseTime(settings.mealTimes.almoco) },
        { type: 'lanche', label: 'Lanche', ...parseTime(settings.mealTimes.lanche) },
        { type: 'jantar', label: 'Jantar', ...parseTime(settings.mealTimes.jantar) },
      ];
      await scheduleMealReminders(meals);
    }

    if (settings.waterRemindersEnabled) {
      await scheduleWaterReminders(settings.waterInterval, settings.waterStartHour, settings.waterEndHour);
    }

    if (settings.streakWarningEnabled) {
      await scheduleStreakWarning();
    }
  },
}));
