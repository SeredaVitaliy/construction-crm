import type { TaskStatus } from './database.types';

export const STATUS_LABEL: Record<TaskStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  review: 'На проверке',
  accepted: 'Принята',
  rework: 'На доработке',
};

// Цвета для antd <Tag color=...>
export const STATUS_COLOR: Record<TaskStatus, string> = {
  new: 'default',
  in_progress: 'processing',
  review: 'warning',
  accepted: 'success',
  rework: 'error',
};
