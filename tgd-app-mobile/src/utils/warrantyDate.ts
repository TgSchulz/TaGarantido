// Funções puras de data ficam fora dos componentes para reaproveitamento e leitura mais simples.
export function formatDate(value: string | null): string {
  if (!value) return 'Data pendente';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

export type ProtectionRemaining = {
  value: number;
  unit: 'months' | 'days';
  expired: boolean;
};

export function protectionLabel(remaining: ProtectionRemaining | null): string {
  if (!remaining) return 'Prazo a confirmar';
  if (remaining.expired) return 'Garantia encerrada';
  if (remaining.unit === 'months') {
    return `Mais ${remaining.value} ${remaining.value === 1 ? 'mês' : 'meses'} de proteção`;
  }
  if (remaining.value === 0) return 'Vence hoje';
  return `Mais ${remaining.value} ${remaining.value === 1 ? 'dia' : 'dias'} de proteção`;
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DAY_IN_MS = 86_400_000;

function parseDateKey(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText)));
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function calendarDaysUntil(value: string, now = new Date()): number | null {
  const expiry = parseDateKey(value);
  if (!expiry) return null;
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((expiry.getTime() - today) / DAY_IN_MS);
}

function addCalendarMonths(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day));
}

export function protectionRemaining(value: string | null): ProtectionRemaining | null {
  if (!value) return null;

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const expiry = parseDateKey(value);
  const days = calendarDaysUntil(value, now);
  if (!expiry || days === null) return null;
  if (days < 0) return { value: days, unit: 'days', expired: true };

  let months = (expiry.getUTCFullYear() - today.getUTCFullYear()) * 12
    + expiry.getUTCMonth() - today.getUTCMonth();
  if (months > 0 && addCalendarMonths(today, months).getTime() > expiry.getTime()) months -= 1;

  return months >= 1
    ? { value: months, unit: 'months', expired: false }
    : { value: days, unit: 'days', expired: false };
}
