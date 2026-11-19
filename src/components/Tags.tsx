import { Tag } from 'antd';
import type { ObjectStatus, TaskPriority, TaskStatus } from '@/api/database.types';
import { OBJECT_STATUS_COLOR, OBJECT_STATUS_LABEL, PRIORITY_LABEL, STATUS_COLOR, STATUS_LABEL } from '@/api/statuses';

export function StatusTag({ status }: { status: TaskStatus }) {
  return (
    <Tag color={STATUS_COLOR[status]} style={{ marginInlineEnd: 0 }}>
      {STATUS_LABEL[status]}
    </Tag>
  );
}

export function ObjectStatusTag({ status }: { status: ObjectStatus }) {
  return (
    <Tag color={OBJECT_STATUS_COLOR[status]} style={{ marginInlineEnd: 0 }}>
      {OBJECT_STATUS_LABEL[status]}
    </Tag>
  );
}

const PRIORITY_STYLE: Record<TaskPriority, { color: string; bars: number }> = {
  urgent: { color: '#B4532A', bars: 4 },
  high: { color: '#D08A00', bars: 3 },
  medium: { color: '#255E8C', bars: 2 },
  low: { color: '#8A969D', bars: 1 },
};

export function PriorityMark({ priority, withLabel = true }: { priority: TaskPriority; withLabel?: boolean }) {
  const { color, bars } = PRIORITY_STYLE[priority];
  return (
    <span
      title={`Приоритет: ${PRIORITY_LABEL[priority]}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
    >
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            style={{
              width: 3,
              height: 3 + i * 2.25,
              borderRadius: 1,
              background: i <= bars ? color : 'var(--track)',
            }}
          />
        ))}
      </span>
      {withLabel && (
        <span style={{ color: priority === 'urgent' ? color : undefined }}>{PRIORITY_LABEL[priority]}</span>
      )}
    </span>
  );
}
