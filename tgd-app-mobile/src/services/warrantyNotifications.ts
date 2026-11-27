import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { Warranty } from '../types/warranty';
import { calendarDaysUntil } from '../utils/warrantyDate';

type ReminderKind = 'one-month' | 'seven-days' | 'three-days' | 'expiration-day' | 'expired';

export type WarrantyReminder = {
  id: string;
  warrantyId: string;
  productName: string;
  kind: ReminderKind;
  date: Date;
  expiresAt: string;
  displayLabel?: string;
  title: string;
  body: string;
};

const REMINDER_SOURCE = 'tagarantido-warranty-reminder';
const REMINDER_HOUR = 9;

const reminderLabels: Record<ReminderKind, string> = {
  'one-month': 'Falta 1 mês',
  'seven-days': 'Faltam 7 dias',
  'three-days': 'Faltam 3 dias',
  'expiration-day': 'Vence hoje',
  expired: 'Garantia encerrada',
};

function parseDateKey(dateKey: string): [number, number, number] | null {
  const match = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === dateKey ? [year, month, day] : null;
}

function dateKeyInDays(dateKey: string, days: number): string | null {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function dateKeyOneMonthBefore(dateKey: string): string | null {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;
  const [year, month, day] = parts;
  const targetMonth = month - 2;
  const lastDay = new Date(Date.UTC(year, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, targetMonth, Math.min(day, lastDay))).toISOString().slice(0, 10);
}

function localReminderTime(dateKey: string): Date | null {
  const parts = parseDateKey(dateKey);
  if (!parts) return null;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day, REMINDER_HOUR, 0, 0, 0);
}

function describeReminder(
  warranty: Warranty,
  kind: ReminderKind,
  dateKey: string,
): WarrantyReminder | null {
  const date = localReminderTime(dateKey);
  if (!date) return null;
  const expiration = localReminderTime(warranty.expires_at ?? '');
  const id = `${warranty.id}:${kind}`;
  const title = kind === 'expiration-day'
    ? 'Garantia vence hoje'
    : kind === 'expired'
      ? 'Garantia encerrada'
      : 'Garantia próxima do vencimento';
  const body = kind === 'expiration-day'
    ? `A garantia de ${warranty.product_name} vence hoje.`
    : kind === 'expired'
      ? `A garantia de ${warranty.product_name} venceu em ${warranty.expires_at}.`
      : `${warranty.product_name}: ${reminderLabels[kind].toLocaleLowerCase('pt-BR')} para o vencimento.`;
  return expiration
    ? { id, warrantyId: warranty.id, productName: warranty.product_name, kind, date, expiresAt: warranty.expires_at!, title, body }
    : null;
}

export function getWarrantyReminders(warranties: Warranty[]): WarrantyReminder[] {
  const reminders: WarrantyReminder[] = [];
  for (const warranty of warranties) {
    if (!warranty.expires_at) continue;
    const expiration = parseDateKey(warranty.expires_at);
    const purchase = warranty.purchase_date ? parseDateKey(warranty.purchase_date) : null;
    if (!expiration) continue;

    const targets: Array<[ReminderKind, string | null]> = [
      ['one-month', dateKeyOneMonthBefore(warranty.expires_at)],
      ['seven-days', dateKeyInDays(warranty.expires_at, -7)],
      ['three-days', dateKeyInDays(warranty.expires_at, -3)],
      ['expiration-day', warranty.expires_at],
    ];
    for (const [kind, target] of targets) {
      if (!target || (purchase && target < warranty.purchase_date!)) continue;
      const reminder = describeReminder(warranty, kind, target);
      if (reminder) reminders.push(reminder);
    }
  }
  return reminders.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getActiveWarrantyReminders(warranties: Warranty[], now = new Date()): WarrantyReminder[] {
  const today = localDateKey(now);
  return warranties.flatMap((warranty) => {
    if (!warranty.expires_at) return [];
    const daysLeft = calendarDaysUntil(warranty.expires_at, now);
    if (daysLeft === null || daysLeft > 31) return [];

    if (daysLeft < 0) {
      const expiredReminder = describeReminder(warranty, 'expired', warranty.expires_at);
      return expiredReminder ? [{ ...expiredReminder, displayLabel: reminderLabels.expired }] : [];
    }

    const kind: ReminderKind = daysLeft === 0
      ? 'expiration-day'
      : daysLeft <= 3
        ? 'three-days'
        : daysLeft <= 7
          ? 'seven-days'
          : 'one-month';
    const reminder = getWarrantyReminders([warranty]).find((item) => item.kind === kind)
      ?? describeReminder(warranty, kind, kind === 'expiration-day'
        ? warranty.expires_at
        : kind === 'one-month'
          ? dateKeyOneMonthBefore(warranty.expires_at) ?? today
          : dateKeyInDays(warranty.expires_at, kind === 'seven-days' ? -7 : -3) ?? today);
    if (!reminder) return [];

    const displayLabel = daysLeft === 0
      ? 'Vence hoje'
      : daysLeft <= 7
        ? `Faltam ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`
        : 'Próxima do vencimento';
    return [{ ...reminder, displayLabel }];
  });
}

let permissionRequest: Promise<boolean> | undefined;
let scheduleSync = Promise.resolve();

async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (permissionRequest) return permissionRequest;

  permissionRequest = (async () => {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  })();

  try {
    return await permissionRequest;
  } catch (error) {
    permissionRequest = undefined;
    throw error;
  }
}

async function synchronizeSchedules(warranties: Warranty[]): Promise<void> {
  if (Platform.OS === 'web') return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const oldReminders = scheduled.filter(
    (request) => request.content.data?.source === REMINDER_SOURCE,
  );
  await Promise.all(oldReminders.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier)));

  const now = Date.now();
  const reminders = getWarrantyReminders(warranties).filter((reminder) => reminder.date.getTime() > now);
  if (reminders.length === 0) return;

  const permitted = await hasNotificationPermission();
  if (!permitted) return;

  for (const reminder of reminders) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: reminder.title,
          body: reminder.body,
          data: {
            source: REMINDER_SOURCE,
            warrantyId: reminder.warrantyId,
            kind: reminder.kind,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminder.date,
        },
      });
    } catch (error) {
      console.warn(`Não foi possível agendar o aviso de ${reminder.productName}.`, error);
    }
  }
}

export function syncWarrantyReminderSchedules(warranties: Warranty[]): Promise<void> {
  const snapshot = [...warranties];
  scheduleSync = scheduleSync.catch(() => undefined).then(() => synchronizeSchedules(snapshot));
  return scheduleSync;
}

