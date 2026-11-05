import { useState } from 'react';
import type { TaskStatus } from '@/api/database.types';
import { App, Button, Card, Descriptions, Flex, Form, Input, Modal, Popconfirm, Result, Space, Timeline, Typography } from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { changeTaskStatus, deleteTask, fetchTask, fetchTaskHistory, updateTask, type TaskInput } from '@/api/tasks';
import { STATUS_COLOR, STATUS_LABEL } from '@/api/statuses';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { getAvailableActions, type TaskAction } from '@/lib/taskActions';
import { validate } from '@/lib/form';
import { PageSpinner } from '@/components/PageSpinner';
import { LoadError } from '@/components/LoadError';
import { StatusTag } from '@/components/StatusTag';
import { TaskFormModal } from '@/components/TaskFormModal';

const TIMELINE_COLOR: Record<string, string> = { default: 'gray', processing: 'blue', warning: 'orange', success: 'green', error: 'red' };

export function TaskPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const { message } = App.useApp();

  const task = useAsync(() => fetchTask(id), [id]);
  const history = useAsync(() => fetchTaskHistory(id), [id]);

  const [pending, setPending] = useState<TaskStatus | null>(null);
  const [commentFor, setCommentFor] = useState<TaskAction | null>(null);
  const [editing, setEditing] = useState(false);
  const [commentForm] = Form.useForm<{ comment: string }>();

  const reloadAll = () => {
    task.reload();
    history.reload();
  };

  const runAction = async (action: TaskAction, comment?: string) => {
    setPending(action.to);
    try {
      await changeTaskStatus(id, action.to, comment);
      message.success(`Статус: ${STATUS_LABEL[action.to]}`);
      setCommentFor(null);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setPending(null);
      reloadAll();
    }
  };

  const save = async (values: TaskInput) => {
    try {
      await updateTask(id, values);
      message.success('Сохранено');
      setEditing(false);
      task.reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const remove = async (objectId: string) => {
    try {
      await deleteTask(id);
      message.success('Задача удалена');
      navigate(`/objects/${objectId}`);
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  if (task.loading && !task.data) return <PageSpinner />;
  if (task.error) return <LoadError message={task.error} onRetry={task.reload} />;
  if (!task.data) {
    return <Result status="404" title="Задача не найдена" extra={<Link to="/objects">К объектам</Link>} />;
  }

  const t = task.data;
  const actions = getAvailableActions(t, profile);

  return (
    <Flex vertical gap={16}>
      <Link to={t.object ? `/objects/${t.object.id}` : '/objects'}>← {t.object?.name ?? 'Объекты'}</Link>

      <Card
        title={
          <Space wrap>
            <span>{t.title}</span>
            <StatusTag status={t.status} />
          </Space>
        }
        extra={
          isManager && (
            <Space>
              <Button onClick={() => setEditing(true)}>Изменить</Button>
              <Popconfirm
                title="Удалить задачу?"
                description="История статусов будет удалена вместе с задачей."
                okText="Удалить"
                cancelText="Отмена"
                onConfirm={() => remove(t.object_id)}
              >
                <Button danger>Удалить</Button>
              </Popconfirm>
            </Space>
          )
        }
      >
        <Descriptions
          column={{ xs: 1, md: 2 }}
          items={[
            { key: 'object', label: 'Объект', children: t.object ? `${t.object.name}, ${t.object.address}` : '—' },
            { key: 'assignee', label: 'Исполнитель', children: t.assignee?.full_name ?? '—' },
            { key: 'author', label: 'Автор', children: t.author?.full_name ?? '—' },
            { key: 'created', label: 'Создана', children: dayjs(t.created_at).format('DD.MM.YYYY HH:mm') },
            {
              key: 'description',
              label: 'Описание',
              span: 'filled',
              children: t.description ? (
                <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{t.description}</Typography.Paragraph>
              ) : (
                <Typography.Text type="secondary">нет</Typography.Text>
              ),
            },
          ]}
        />

        {actions.length > 0 && (
          <Space wrap style={{ marginTop: 16 }}>
            {actions.map((a) => (
              <Button
                key={a.to}
                type={a.danger ? 'default' : 'primary'}
                danger={a.danger}
                loading={pending === a.to}
                disabled={pending !== null && pending !== a.to}
                onClick={() => (a.needsComment ? setCommentFor(a) : runAction(a))}
              >
                {a.label}
              </Button>
            ))}
          </Space>
        )}
      </Card>

      <Card title="История">
        {history.error ? (
          <LoadError message={history.error} onRetry={history.reload} />
        ) : (
          <Timeline
            items={(history.data ?? []).map((h) => ({
              key: h.id,
              color: TIMELINE_COLOR[STATUS_COLOR[h.to_status]],
              content: (
                <>
                  <Typography.Text strong>
                    {h.from_status === null
                      ? 'Задача создана'
                      : `${STATUS_LABEL[h.from_status]} → ${STATUS_LABEL[h.to_status]}`}
                  </Typography.Text>
                  <div>
                    <Typography.Text type="secondary">
                      {dayjs(h.created_at).format('DD.MM.YYYY HH:mm')} · {h.author?.full_name ?? '—'}
                    </Typography.Text>
                  </div>
                  {h.comment && (
                    <Typography.Paragraph style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>
                      «{h.comment}»
                    </Typography.Paragraph>
                  )}
                </>
              ),
            }))}
          />
        )}
      </Card>

      <Modal
        open={commentFor !== null}
        title={commentFor?.label}
        okText="Отправить"
        cancelText="Отмена"
        okButtonProps={{ danger: commentFor?.danger, loading: pending !== null }}
        onCancel={() => setCommentFor(null)}
        onOk={async () => {
          const values = await validate(commentForm);
          if (values && commentFor) await runAction(commentFor, values.comment);
        }}
        afterOpenChange={(open) => !open && commentForm.resetFields()}
        forceRender
      >
        <Form form={commentForm} layout="vertical" requiredMark={false}>
          <Form.Item
            name="comment"
            label="Что нужно исправить"
            rules={[{ required: true, whitespace: true, message: 'Комментарий обязателен' }]}
          >
            <Input.TextArea autoFocus autoSize={{ minRows: 3, maxRows: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      <TaskFormModal
        open={editing}
        objectId={t.object_id}
        initial={{ title: t.title, description: t.description, object_id: t.object_id, assignee_id: t.assignee_id }}
        onCancel={() => setEditing(false)}
        onSubmit={save}
      />
    </Flex>
  );
}
