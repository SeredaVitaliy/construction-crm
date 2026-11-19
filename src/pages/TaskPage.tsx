import { useState } from 'react';
import { App, Button, Card, Col, Flex, Popconfirm, Result, Row, Timeline, Typography } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteTask, fetchTask, fetchTaskHistory, updateTask, type TaskInput } from '@/api/tasks';
import { STATUS_HEX, STATUS_LABEL } from '@/api/statuses';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { useStatusChange } from '@/hooks/useStatusChange';
import { getAvailableActions } from '@/lib/taskActions';
import { dueLabel, formatDate, formatDateTime, isOverdue } from '@/lib/format';
import { CommentThread } from '@/components/CommentThread';
import { LoadError } from '@/components/LoadError';
import { PageSpinner } from '@/components/PageSpinner';
import { PriorityMark, StatusTag } from '@/components/Tags';
import { TaskFormModal } from '@/components/TaskFormModal';
import { UserAvatar } from '@/components/UserAvatar';

function Row2({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}

export function TaskPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const { message } = App.useApp();

  const task = useAsync(() => fetchTask(id), [id]);
  const history = useAsync(() => fetchTaskHistory(id), [id]);
  const [editing, setEditing] = useState(false);

  const reloadAll = () => {
    task.reload();
    history.reload();
  };
  const status = useStatusChange(reloadAll);

  const save = async (values: TaskInput) => {
    try {
      await updateTask(id, values);
      message.success('Задача сохранена');
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
    return (
      <Result
        status="404"
        title="Задача не найдена"
        subTitle="Возможно, её удалили или она назначена не на вас."
        extra={<Link to="/tasks">К задачам</Link>}
      />
    );
  }

  const t = task.data;
  const actions = getAvailableActions(t, profile);
  const due = dueLabel(t);

  return (
    <>
      <div style={{ marginBottom: 8 }}>
        <Link to={t.object ? `/objects/${t.object.id}` : '/objects'}>← {t.object?.name ?? 'Объекты'}</Link>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={15}>
          <Flex vertical gap={20}>
            <Card className="task-main">
              <Flex justify="space-between" align="flex-start" gap={16} wrap>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Flex gap={10} align="center" wrap style={{ marginBottom: 10 }}>
                    <StatusTag status={t.status} />
                    <PriorityMark priority={t.priority} />
                  </Flex>
                  <h1 className="page-title" style={{ fontSize: 24 }}>
                    {t.title}
                  </h1>
                </div>
                {isManager && (
                  <Flex gap={8}>
                    <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
                      Изменить
                    </Button>
                    <Popconfirm
                      title="Удалить задачу?"
                      description="История и комментарии удалятся вместе с задачей."
                      okText="Удалить"
                      cancelText="Отмена"
                      onConfirm={() => remove(t.object_id)}
                    >
                      <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
                    </Popconfirm>
                  </Flex>
                )}
              </Flex>

              <Typography.Paragraph
                type={t.description ? undefined : 'secondary'}
                style={{ whiteSpace: 'pre-wrap', margin: '16px 0 0', maxWidth: '75ch', lineHeight: 1.6 }}
              >
                {t.description || 'Описания нет'}
              </Typography.Paragraph>

              {actions.length > 0 && (
                <Flex gap={8} wrap style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
                  {actions.map((a) => (
                    <Button
                      key={a.to}
                      type={a.danger ? 'default' : 'primary'}
                      danger={a.danger}
                      size="large"
                      loading={status.pending === `${t.id}:${a.to}`}
                      disabled={status.pending !== null && status.pending !== `${t.id}:${a.to}`}
                      onClick={() => status.start(t.id, a)}
                    >
                      {a.label}
                    </Button>
                  ))}
                </Flex>
              )}
            </Card>

            <Card title="Обсуждение">
              <CommentThread taskId={t.id} currentUserId={profile.id} />
            </Card>
          </Flex>
        </Col>

        <Col xs={24} lg={9}>
          <Flex vertical gap={20}>
            <Card title="Детали" styles={{ body: { paddingBlock: 8 } }}>
              <Row2 label="Объект">
                {t.object ? (
                  <>
                    <Link to={`/objects/${t.object.id}`}>{t.object.name}</Link>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {t.object.address}
                    </div>
                  </>
                ) : (
                  '—'
                )}
              </Row2>
              <Row2 label="Исполнитель">
                {t.assignee ? (
                  <Flex gap={8} align="center">
                    <UserAvatar name={t.assignee.full_name || t.assignee.email} size={24} />
                    <span>
                      {t.assignee.full_name || t.assignee.email}
                      {t.assignee.position && (
                        <span className="muted" style={{ fontSize: 13 }}>
                          , {t.assignee.position.toLowerCase()}
                        </span>
                      )}
                    </span>
                  </Flex>
                ) : (
                  '—'
                )}
              </Row2>
              {t.assignee?.phone && (
                <Row2 label="Телефон">
                  <a href={`tel:${t.assignee.phone.replace(/[^\d+]/g, '')}`}>{t.assignee.phone}</a>
                </Row2>
              )}
              <Row2 label="Срок">
                {t.due_date ? (
                  <>
                    {formatDate(t.due_date)}
                    {due && t.status !== 'accepted' && (
                      <Typography.Text
                        type={isOverdue(t) ? 'danger' : 'secondary'}
                        style={{ marginLeft: 8, fontSize: 13 }}
                      >
                        {due}
                      </Typography.Text>
                    )}
                  </>
                ) : (
                  <span className="muted">не задан</span>
                )}
              </Row2>
              <Row2 label="Поставил(а)">{t.author?.full_name ?? '—'}</Row2>
              <Row2 label="Создана">{formatDateTime(t.created_at)}</Row2>
            </Card>

            <Card title="История статусов">
              {history.error ? (
                <LoadError message={history.error} onRetry={history.reload} />
              ) : (
                <Timeline
                  style={{ marginBottom: -24 }}
                  items={(history.data ?? []).map((h) => ({
                    key: h.id,
                    color: STATUS_HEX[h.to_status],
                    content: (
                      <>
                        <div style={{ fontWeight: 550 }}>
                          {h.from_status === null
                            ? 'Задача создана'
                            : `${STATUS_LABEL[h.from_status]} → ${STATUS_LABEL[h.to_status]}`}
                        </div>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {h.author?.full_name ?? '—'}, {formatDateTime(h.created_at)}
                        </div>
                        {h.comment && (
                          <div
                            style={{
                              marginTop: 6,
                              padding: '6px 10px',
                              borderLeft: `3px solid ${STATUS_HEX[h.to_status]}`,
                              background: 'var(--track)',
                              borderRadius: '0 4px 4px 0',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {h.comment}
                          </div>
                        )}
                      </>
                    ),
                  }))}
                />
              )}
            </Card>
          </Flex>
        </Col>
      </Row>

      {status.modal}
      <TaskFormModal
        open={editing}
        objectId={t.object_id}
        initial={{
          title: t.title,
          description: t.description,
          object_id: t.object_id,
          assignee_id: t.assignee_id,
          priority: t.priority,
          due_date: t.due_date,
        }}
        onCancel={() => setEditing(false)}
        onSubmit={save}
      />
    </>
  );
}
