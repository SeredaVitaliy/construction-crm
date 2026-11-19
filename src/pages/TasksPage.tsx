import { useState } from 'react';
import { App, Button, Card, Checkbox, Empty, Flex, Input, Segmented, Select, Skeleton } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useSearchParams } from 'react-router-dom';
import { createTask, fetchTasks, type TaskInput } from '@/api/tasks';
import type { TaskPriority, TaskStatus } from '@/api/database.types';
import { PRIORITIES, PRIORITY_LABEL, STATUS_LABEL, TASK_STATUSES } from '@/api/statuses';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { isOverdue } from '@/lib/format';
import { LoadError } from '@/components/LoadError';
import { PageHeader } from '@/components/PageHeader';
import { TaskBoard } from '@/components/TaskBoard';
import { TaskFormModal } from '@/components/TaskFormModal';
import { TaskTable } from '@/components/TaskTable';

export function TasksPage() {
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useAsync(fetchTasks, []);
  const [creating, setCreating] = useState(false);

  const view = params.get('view') === 'board' ? 'board' : 'table';
  const status = params.get('status') as TaskStatus | null;
  const objectId = params.get('object');
  const assignee = params.get('assignee');
  const priority = params.get('priority') as TaskPriority | null;
  const overdue = params.get('overdue') === '1';
  const q = params.get('q') ?? '';

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const create = async (values: TaskInput) => {
    try {
      await createTask(values);
      message.success('Задача создана');
      setCreating(false);
      reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  if (error) return <LoadError message={error} onRetry={reload} />;

  const all = data ?? [];
  const needle = q.trim().toLowerCase();
  const visible = all.filter(
    (t) =>
      (!status || view === 'board' || t.status === status) &&
      (!objectId || t.object_id === objectId) &&
      (!assignee || t.assignee_id === assignee) &&
      (!priority || t.priority === priority) &&
      (!overdue || isOverdue(t)) &&
      (!needle || t.title.toLowerCase().includes(needle)),
  );

  const objectOptions = [...new Map(all.filter((t) => t.object).map((t) => [t.object!.id, t.object!.name])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const assigneeOptions = [
    ...new Map(
      all.filter((t) => t.assignee).map((t) => [t.assignee!.id, t.assignee!.full_name || t.assignee!.email]),
    ).entries(),
  ]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const filtered = !!(status || objectId || assignee || priority || overdue || q);

  return (
    <>
      <PageHeader
        title={isManager ? 'Задачи' : 'Мои задачи'}
        sub={isManager ? 'Все задачи по всем объектам' : 'Задачи, назначенные на вас'}
        extra={
          isManager && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
              Новая задача
            </Button>
          )
        }
      />

      <Flex gap={8} wrap align="center" style={{ marginBottom: 16 }}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Поиск по названию"
          value={q}
          onChange={(e) => setParam('q', e.target.value || null)}
          style={{ width: 220 }}
        />
        {view === 'table' && (
          <Select
            allowClear
            placeholder="Статус"
            value={status ?? undefined}
            onChange={(v) => setParam('status', v ?? null)}
            options={TASK_STATUSES.map((s) => ({
              value: s,
              label: `${STATUS_LABEL[s]} (${all.filter((t) => t.status === s).length})`,
            }))}
            style={{ width: 180 }}
          />
        )}
        <Select
          allowClear
          showSearch={{ optionFilterProp: 'label' }}
          placeholder="Объект"
          value={objectId ?? undefined}
          onChange={(v) => setParam('object', v ?? null)}
          options={objectOptions}
          style={{ width: 200 }}
        />
        {isManager && (
          <Select
            allowClear
            showSearch={{ optionFilterProp: 'label' }}
            placeholder="Исполнитель"
            value={assignee ?? undefined}
            onChange={(v) => setParam('assignee', v ?? null)}
            options={assigneeOptions}
            style={{ width: 180 }}
          />
        )}
        <Select
          allowClear
          placeholder="Приоритет"
          value={priority ?? undefined}
          onChange={(v) => setParam('priority', v ?? null)}
          options={PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
          style={{ width: 140 }}
        />
        <Checkbox checked={overdue} onChange={(e) => setParam('overdue', e.target.checked ? '1' : null)}>
          Только просроченные
        </Checkbox>
        {filtered && (
          <Button type="link" onClick={() => setParams(view === 'board' ? { view: 'board' } : {}, { replace: true })}>
            Сбросить
          </Button>
        )}
        <Segmented
          style={{ marginLeft: 'auto' }}
          value={view}
          onChange={(v) => setParam('view', v === 'board' ? 'board' : null)}
          options={[
            { value: 'table', label: 'Список' },
            { value: 'board', label: 'Доска' },
          ]}
        />
      </Flex>

      {view === 'board' ? (
        loading ? (
          <Skeleton active />
        ) : visible.length === 0 ? (
          <Empty description={filtered ? 'Под фильтр ничего не попало' : 'Задач пока нет'} />
        ) : (
          <TaskBoard tasks={visible} profile={profile} showObject showAssignee={isManager} onChanged={reload} />
        )
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <TaskTable
            tasks={visible}
            loading={loading}
            showObject
            showAssignee={isManager}
            emptyText={filtered ? 'Под фильтр ничего не попало' : 'Задач пока нет'}
          />
        </Card>
      )}

      <TaskFormModal
        open={creating}
        objectId={objectId ?? undefined}
        lockObject={false}
        onCancel={() => setCreating(false)}
        onSubmit={create}
      />
    </>
  );
}
