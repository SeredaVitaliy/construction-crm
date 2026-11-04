import { useState } from 'react';
import { App, Button, Card, Descriptions, Flex, Result, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useParams } from 'react-router-dom';
import { fetchObject } from '@/api/objects';
import { createTask, fetchTasksByObject, type TaskInput } from '@/api/tasks';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { PageSpinner } from '@/components/PageSpinner';
import { LoadError } from '@/components/LoadError';
import { TaskTable } from '@/components/TaskTable';
import { TaskFormModal } from '@/components/TaskFormModal';

export function ObjectPage() {
  const { id = '' } = useParams();
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const { message } = App.useApp();

  const object = useAsync(() => fetchObject(id), [id]);
  // Исполнителю RLS вернёт только его задачи на этом объекте
  const tasks = useAsync(() => fetchTasksByObject(id), [id]);
  const [creating, setCreating] = useState(false);

  const create = async (values: TaskInput) => {
    try {
      await createTask(values);
      message.success('Задача создана');
      setCreating(false);
      tasks.reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  if (object.loading) return <PageSpinner />;
  if (object.error) return <LoadError message={object.error} onRetry={object.reload} />;
  if (!object.data) {
    // Для исполнителя чужой объект неотличим от несуществующего — так и задумано
    return <Result status="404" title="Объект не найден" extra={<Link to="/objects">К списку объектов</Link>} />;
  }

  return (
    <Flex vertical gap={16}>
      <Link to="/objects">← Все объекты</Link>
      <Card>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          {object.data.name}
        </Typography.Title>
        <Descriptions column={1} items={[{ key: 'address', label: 'Адрес', children: object.data.address }]} />
      </Card>

      <Card
        title={isManager ? 'Задачи объекта' : 'Мои задачи на объекте'}
        extra={
          isManager && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
              Новая задача
            </Button>
          )
        }
      >
        {tasks.error ? (
          <LoadError message={tasks.error} onRetry={tasks.reload} />
        ) : (
          <TaskTable
            tasks={tasks.data ?? []}
            loading={tasks.loading}
            showAssignee={isManager}
            emptyText="Задач пока нет"
          />
        )}
      </Card>

      <TaskFormModal open={creating} objectId={id} onCancel={() => setCreating(false)} onSubmit={create} />
    </Flex>
  );
}
