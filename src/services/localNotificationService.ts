import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const isNative = Capacitor.isNativePlatform();

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative) {
    const result = await LocalNotifications.requestPermissions();
    return result.display === 'granted';
  }
  // Web fallback
  if ('Notification' in window) {
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  return false;
}

// ID ranges per category
const ID_WORKOUT = 1000;
const ID_MEAL = 2000;
const ID_WATER = 3000;
const ID_STREAK = 4000;

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export async function scheduleWorkoutReminders(days: number[], hour: number, minute: number) {
  if (!isNative) return;

  // Cancel existing workout notifications
  await cancelByRange(ID_WORKOUT, ID_WORKOUT + 99);

  const notifications = days.map((day, i) => ({
    id: ID_WORKOUT + i,
    title: 'Bora treinar! 💪',
    body: `Hoje é ${DIAS_SEMANA[day]}, dia de treino!`,
    schedule: {
      on: { weekday: day === 0 ? 1 : day + 1, hour, minute }, // Capacitor uses 1=Sunday
      allowWhileIdle: true,
    },
    smallIcon: 'ic_launcher',
    largeIcon: 'ic_launcher',
  }));

  await LocalNotifications.schedule({ notifications });
}

export async function scheduleMealReminders(meals: { type: string; label: string; hour: number; minute: number }[]) {
  if (!isNative) return;

  await cancelByRange(ID_MEAL, ID_MEAL + 99);

  const notifications = meals.map((meal, i) => ({
    id: ID_MEAL + i,
    title: `Hora do ${meal.label}`,
    body: 'Não esqueça de registrar sua refeição no Valere!',
    schedule: {
      on: { hour: meal.hour, minute: meal.minute },
      allowWhileIdle: true,
    },
    smallIcon: 'ic_launcher',
    largeIcon: 'ic_launcher',
  }));

  await LocalNotifications.schedule({ notifications });
}

export async function scheduleWaterReminders(intervalHours: number, startHour: number, endHour: number) {
  if (!isNative) return;

  await cancelByRange(ID_WATER, ID_WATER + 99);

  const notifications = [];
  let id = ID_WATER;
  for (let h = startHour; h <= endHour; h += intervalHours) {
    notifications.push({
      id: id++,
      title: 'Beba água! 💧',
      body: 'Mantenha-se hidratado para melhor performance.',
      schedule: {
        on: { hour: h, minute: 0 },
        allowWhileIdle: true,
        exact: true,
      },
      smallIcon: 'ic_launcher',
      largeIcon: 'ic_launcher',
    });
  }

  await LocalNotifications.schedule({ notifications });
}

export async function scheduleStreakWarning() {
  if (!isNative) return;

  await cancelByRange(ID_STREAK, ID_STREAK + 99);

  await LocalNotifications.schedule({
    notifications: [{
      id: ID_STREAK,
      title: 'Seu streak está em risco! 🔥',
      body: 'A semana está acabando e você ainda não treinou. Não deixe o streak quebrar!',
      schedule: {
        on: { weekday: 7, hour: 10, minute: 0 }, // Saturday at 10am
        allowWhileIdle: true,
        exact: true,
      },
      smallIcon: 'ic_launcher',
      largeIcon: 'ic_launcher',
    }],
  });
}

export async function cancelAllReminders() {
  if (!isNative) return;
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({ notifications: pending.notifications.map((n) => ({ id: n.id })) });
  }
}

async function cancelByRange(from: number, to: number) {
  if (!isNative) return;
  const pending = await LocalNotifications.getPending();
  const toCancel = pending.notifications.filter((n) => n.id >= from && n.id <= to);
  if (toCancel.length > 0) {
    await LocalNotifications.cancel({ notifications: toCancel.map((n) => ({ id: n.id })) });
  }
}
