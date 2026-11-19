import dayjs from 'dayjs';
import type { TaskStatus } from '@/api/database.types';

const money = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 });

export const formatMoney = (v: number) => money.format(v);
export const formatMoneyShort = (v: number) => `${compact.format(v)} ₽`;
export const formatDate = (d: string | null | undefined) => (d ? dayjs(d).format('D MMM YYYY') : '—');
export const formatDateTime = (d: string) => dayjs(d).format('D MMM, HH:mm');

export function formatRelative(d: string) {
  const diff = dayjs().diff(dayjs(d), 'minute');
  if (diff < 1) return 'только что';
  if (diff < 60) return `${diff} мин назад`;
  const hours = Math.floor(diff / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'вчера';
  if (days < 7) return `${days} дн назад`;
  return dayjs(d).format('D MMM');
}

export function isOverdue(t: { due_date: string | null; status: TaskStatus }) {
  return !!t.due_date && t.status !== 'accepted' && dayjs(t.due_date).isBefore(dayjs(), 'day');
}

export function dueLabel(t: { due_date: string | null; status: TaskStatus }) {
  if (!t.due_date) return null;
  if (t.status === 'accepted') return formatDate(t.due_date);
  const days = dayjs(t.due_date).startOf('day').diff(dayjs().startOf('day'), 'day');
  if (days < 0) return `просрочено на ${-days} дн`;
  if (days === 0) return 'сегодня';
  if (days === 1) return 'завтра';
  if (days < 7) return `через ${days} дн`;
  return dayjs(t.due_date).format('D MMM');
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';

export function plural(n: number, one: string, few: string, many: string) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
