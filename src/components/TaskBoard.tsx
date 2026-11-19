import { useState, type DragEvent } from 'react';
import { Badge, Flex, Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { Profile, TaskStatus } from '@/api/database.types';
import type { TaskListItem } from '@/api/tasks';
import { PRIORITY_RANK, STATUS_HEX, STATUS_LABEL, TASK_STATUSES } from '@/api/statuses';
import { getAvailableActions } from '@/lib/taskActions';
import { dueLabel, isOverdue } from '@/lib/format';
import { useStatusChange } from '@/hooks/useStatusChange';
import { PriorityMark } from './Tags';
import { UserAvatar } from './UserAvatar';

type Props = {
  tasks: TaskListItem[];
  profile: Pick<Profile, 'id' | 'role'>;
  showObject?: boolean;
  showAssignee?: boolean;
  onChanged: () => void;
};

export function TaskBoard({ tasks, profile, showObject, showAssignee, onChanged }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<TaskStatus | null>(null);
  const { start, modal } = useStatusChange(onChanged);

  const dragged = tasks.find((t) => t.id === dragId);
  const allowed = dragged ? getAvailableActions(dragged, profile) : [];

  const drop = (status: TaskStatus) => (e: DragEvent) => {
    e.preventDefault();
    setOver(null);
    const action = allowed.find((a) => a.to === status);
    if (dragged && action) start(dragged.id, action);
    setDragId(null);
  };

  return (
    <>
      <div className="board" role="list" aria-label="Доска задач">
        {TASK_STATUSES.map((status) => {
          const column = tasks
            .filter((t) => t.status === status)
            .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
          const canDrop = allowed.some((a) => a.to === status);
          return (
            <section
              key={status}
              role="listitem"
              aria-label={STATUS_LABEL[status]}
              className={`board-col${canDrop ? ' can-drop' : ''}${canDrop && over === status ? ' over' : ''}`}
              onDragOver={(e) => {
                if (!canDrop) return;
                e.preventDefault();
                setOver(status);
              }}
              onDragLeave={() => setOver((o) => (o === status ? null : o))}
              onDrop={drop(status)}
            >
              <div className="board-col-head">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_HEX[status] }} />
                  {STATUS_LABEL[status]}
                </span>
                <Badge
                  count={column.length}
                  showZero
                  color="var(--track)"
                  style={{ color: 'inherit', boxShadow: 'none' }}
                />
              </div>
              {column.map((t) => {
                const draggable = getAvailableActions(t, profile).length > 0;
                const due = dueLabel(t);
                return (
                  <Link
                    key={t.id}
                    to={`/tasks/${t.id}`}
                    className={`board-card${dragId === t.id ? ' dragging' : ''}`}
                    draggable={draggable}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      setDragId(t.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOver(null);
                    }}
                  >
                    <div className="board-card-title">{t.title}</div>
                    {showObject && t.object && (
                      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                        {t.object.name}
                      </Typography.Text>
                    )}
                    <Flex justify="space-between" align="center" gap={8}>
                      <PriorityMark priority={t.priority} withLabel={false} />
                      <Flex align="center" gap={8}>
                        {due && (
                          <Typography.Text type={isOverdue(t) ? 'danger' : 'secondary'} style={{ fontSize: 12 }}>
                            {due}
                          </Typography.Text>
                        )}
                        {showAssignee && t.assignee && (
                          <UserAvatar name={t.assignee.full_name || t.assignee.email} size={22} />
                        )}
                      </Flex>
                    </Flex>
                  </Link>
                );
              })}
              {column.length === 0 && (
                <Typography.Text type="secondary" style={{ display: 'block', padding: '8px 4px', fontSize: 13 }}>
                  {canDrop ? 'Перетащите сюда' : 'Пусто'}
                </Typography.Text>
              )}
            </section>
          );
        })}
      </div>
      {modal}
    </>
  );
}
