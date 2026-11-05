import { Card, Segmented, Typography } from 'antd';
import { useSearchParams } from 'react-router-dom';
import { fetchTasksByAssignee } from '@/api/tasks';
import type { TaskStatus } from '@/api/database.types';
import { STATUS_LABEL } from '@/api/statuses';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { LoadError } from '@/components/LoadError';
import { TaskTable } from '@/components/TaskTable';

const FILTERS: { value: 'all' | TaskStatus; label: string }[] = [
  { value: 'all', label: 'Все' },
  ...(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
];

export function MyTasksPage() {
  const profile = useProfile();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') ?? 'all') as 'all' | TaskStatus;

  const { data, loading, error, reload } = useAsync(() => fetchTasksByAssignee(profile.id), [profile.id]);
  const visible = (data ?? []).filter((t) => status === 'all' || t.status === status);

  const count = (s: 'all' | TaskStatus) => (data ?? []).filter((t) => s === 'all' || t.status === s).length;

  return (
    <>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Мои задачи
      </Typography.Title>
      <Card>
        <Segmented
          style={{ marginBottom: 16 }}
          value={status}
          onChange={(v) => setParams(v === 'all' ? {} : { status: v })}
          options={FILTERS.map((f) => ({ value: f.value, label: `${f.label} (${count(f.value)})` }))}
        />
        {error ? (
          <LoadError message={error} onRetry={reload} />
        ) : (
          <TaskTable tasks={visible} loading={loading} showObject emptyText="Задач нет" />
        )}
      </Card>
    </>
  );
}
