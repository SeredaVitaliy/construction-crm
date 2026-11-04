import { Table } from 'antd';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import type { TaskListItem } from '@/api/tasks';
import { StatusTag } from './StatusTag';

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
      pagination={false}
      locale={{ emptyText }}
      columns={[
        { title: 'Задача', dataIndex: 'title', render: (t, task) => <Link to={`/tasks/${task.id}`}>{t}</Link> },
        ...(showObject
          ? [{ title: 'Объект', key: 'object', render: (_: unknown, t: TaskListItem) => t.object?.name ?? '—' }]
          : []),
        ...(showAssignee
          ? [{ title: 'Исполнитель', key: 'assignee', render: (_: unknown, t: TaskListItem) => t.assignee?.full_name ?? '—' }]
          : []),
        { title: 'Статус', dataIndex: 'status', width: 150, render: (s) => <StatusTag status={s} /> },
        {
          title: 'Создана',
          dataIndex: 'created_at',
          width: 140,
          render: (d: string) => dayjs(d).format('DD.MM.YYYY'),
        },
      ]}
    />
  );
}
