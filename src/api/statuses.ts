import type { ExpenseCategory, ObjectStatus, TaskPriority, TaskStatus } from './database.types';

export const TASK_STATUSES: TaskStatus[] = ['new', 'in_progress', 'rework', 'review', 'accepted'];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
};

export const STATUS_COLOR: Record<TaskStatus, string> = {
  new: 'default',
  in_progress: 'processing',
  review: 'warning',
  accepted: 'success',
  rework: 'error',
};

export const STATUS_HEX: Record<TaskStatus, string> = {
  new: '#8A969D',
  in_progress: '#255E8C',
  review: '#D08A00',
  accepted: '#3F7D4E',
  rework: '#B4532A',
};

export const PRIORITIES: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Обычный',
  high: 'Высокий',
  urgent: 'Срочно',
};

export const PRIORITY_RANK: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

export const OBJECT_STATUSES: ObjectStatus[] = ['active', 'planning', 'paused', 'completed'];

export const OBJECT_STATUS_LABEL: Record<ObjectStatus, string> = {
  planning: 'Подготовка',
  active: 'Идут работы',
  paused: 'Приостановлен',
  completed: 'Сдан',
};

export const OBJECT_STATUS_COLOR: Record<ObjectStatus, string> = {
  planning: 'default',
  active: 'processing',
  paused: 'warning',
  completed: 'success',
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['materials', 'labor', 'equipment', 'transport', 'other'];

export const EXPENSE_LABEL: Record<ExpenseCategory, string> = {
  materials: 'Материалы',
  labor: 'Работы',
  equipment: 'Техника',
  transport: 'Доставка',
  other: 'Прочее',
};

export const EXPENSE_HEX: Record<ExpenseCategory, string> = {
  materials: '#255E8C',
  labor: '#F2B300',
  equipment: '#3F7D4E',
  transport: '#8A969D',
  other: '#B4532A',
};
