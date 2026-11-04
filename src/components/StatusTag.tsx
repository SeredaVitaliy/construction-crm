import { Tag } from 'antd';
import type { TaskStatus } from '@/api/database.types';
import { STATUS_COLOR, STATUS_LABEL } from '@/api/statuses';

export function StatusTag({ status }: { status: TaskStatus }) {
  return <Tag color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Tag>;
}
