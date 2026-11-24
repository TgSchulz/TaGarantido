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

function addCalendarMonths(date: Date, months: number): Date {
  const targetMonth = date.getUTCMonth() + months;
  const year = date.getUTCFullYear() + Math.floor(targetMonth / 12);
  const month = ((targetMonth % 12) + 12) % 12;
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, month, day));
}

export function protectionRemaining(value: string | null): ProtectionRemaining | null {
  if (!value) return null;

  // Use the device's local calendar day, then compare UTC dates to avoid DST and time-of-day drift.
  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const expiry = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(expiry.getTime())) return null;
  const days = Math.floor((expiry.getTime() - today.getTime()) / DAY_IN_MS);
  if (days < 0) return { value: days, unit: 'days', expired: true };

  let months = (expiry.getUTCFullYear() - today.getUTCFullYear()) * 12
    + expiry.getUTCMonth() - today.getUTCMonth();
  if (months > 0 && addCalendarMonths(today, months).getTime() > expiry.getTime()) months -= 1;

  return months >= 1
    ? { value: months, unit: 'months', expired: false }
    : { value: days, unit: 'days', expired: false };
}
