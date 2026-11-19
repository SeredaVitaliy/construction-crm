import { Table, Typography } from 'antd';
import { Link } from 'react-router-dom';
import type { TaskListItem } from '@/api/tasks';
import { PRIORITY_RANK, STATUS_LABEL, TASK_STATUSES } from '@/api/statuses';
import { dueLabel, isOverdue } from '@/lib/format';
import { PriorityMark, StatusTag } from './Tags';
import { UserAvatar } from './UserAvatar';

type Props = {
  tasks: TaskListItem[];
  loading: boolean;
  showObject?: boolean;
  showAssignee?: boolean;
  emptyText: string;
};

export function TaskTable({ tasks, loading, showObject, showAssignee, emptyText }: Props) {
  return (
    <Table<TaskListItem>
      rowKey="id"
      loading={loading}
      dataSource={tasks}
      pagination={tasks.length > 20 ? { pageSize: 20, showSizeChanger: false } : false}
      locale={{ emptyText }}
      scroll={{ x: 760 }}
      columns={[
        {
          title: 'Задача',
          dataIndex: 'title',
          render: (t, task) => (
            <Link to={`/tasks/${task.id}`} style={{ fontWeight: 500 }}>
              {t}
            </Link>
          ),
        },
        ...(showObject
          ? [
              {
                title: 'Объект',
                key: 'object',
                render: (_: unknown, t: TaskListItem) =>
                  t.object ? (
                    <Link to={`/objects/${t.object.id}`} className="muted">
                      {t.object.name}
                    </Link>
                  ) : (
                    '—'
                  ),
              },
            ]
          : []),
        ...(showAssignee
          ? [
              {
                title: 'Исполнитель',
                key: 'assignee',
                render: (_: unknown, t: TaskListItem) =>
                  t.assignee ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
                      <UserAvatar name={t.assignee.full_name || t.assignee.email} size={24} />
                      {t.assignee.full_name || t.assignee.email}
                    </span>
                  ) : (
                    '—'
                  ),
              },
            ]
          : []),
        {
          title: 'Приоритет',
          dataIndex: 'priority',
          width: 130,
          sorter: (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
          render: (p) => <PriorityMark priority={p} />,
        },
        {
          title: 'Срок',
          dataIndex: 'due_date',
          width: 160,
          sorter: (a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'),
          render: (_: unknown, t) => {
            const label = dueLabel(t);
            if (!label) return <Typography.Text type="secondary">—</Typography.Text>;
            return isOverdue(t) ? <Typography.Text type="danger">{label}</Typography.Text> : label;
          },
        },
        {
          title: 'Статус',
          dataIndex: 'status',
          width: 140,
          sorter: (a, b) => TASK_STATUSES.indexOf(a.status) - TASK_STATUSES.indexOf(b.status),
          render: (s) => <StatusTag status={s} />,
          filters: TASK_STATUSES.map((s) => ({ text: STATUS_LABEL[s], value: s })),
          onFilter: (v, t) => t.status === v,
        },
      ]}
    />
  );
}
