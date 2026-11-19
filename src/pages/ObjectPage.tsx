import { useState } from 'react';
import { App, Button, Card, Col, Empty, Flex, Popconfirm, Result, Row, Segmented, Tabs, Typography } from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { deleteObject, fetchObject, updateObject, type ObjectInput } from '@/api/objects';
import { createTask, fetchTasksByObject, type TaskInput } from '@/api/tasks';
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  updateExpense,
  type ExpenseInput,
  type ExpenseItem,
} from '@/api/expenses';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatMoneyShort } from '@/lib/format';
import { BuildBar } from '@/components/BuildBar';
import { ExpenseFormModal } from '@/components/ExpenseFormModal';
import { ExpensesPanel } from '@/components/ExpensesPanel';
import { LoadError } from '@/components/LoadError';
import { ObjectFormModal } from '@/components/ObjectFormModal';
import { PageHeader } from '@/components/PageHeader';
import { PageSpinner } from '@/components/PageSpinner';
import { TaskBoard } from '@/components/TaskBoard';
import { TaskFormModal } from '@/components/TaskFormModal';
import { TaskTable } from '@/components/TaskTable';
import { ObjectStatusTag } from '@/components/Tags';

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 550 }}>{children}</div>
    </div>
  );
}

export function ObjectPage() {
  const { id = '' } = useParams();
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const object = useAsync(() => fetchObject(id), [id]);
  const tasks = useAsync(() => fetchTasksByObject(id), [id]);
  const expenses = useAsync(() => (isManager ? fetchExpenses(id) : Promise.resolve([])), [id, isManager]);
  const [creatingTask, setCreatingTask] = useState(false);
  const [editingObject, setEditingObject] = useState(false);
  const [expenseModal, setExpenseModal] = useState<ExpenseItem | null | undefined>(undefined);

  const tab = params.get('tab') ?? 'tasks';
  const view = params.get('view') === 'table' ? 'table' : 'board';
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const guard = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      message.success(ok);
      return true;
    } catch (e) {
      message.error((e as Error).message);
      return false;
    }
  };

  const saveTask = async (values: TaskInput) => {
    if (await guard(() => createTask(values), 'Задача создана')) {
      setCreatingTask(false);
      tasks.reload();
      object.reload();
    }
  };

  const saveObject = async (values: ObjectInput) => {
    if (await guard(() => updateObject(id, values), 'Объект сохранён')) {
      setEditingObject(false);
      object.reload();
    }
  };

  const removeObject = async () => {
    if (await guard(() => deleteObject(id), 'Объект удалён')) navigate('/objects');
  };

  const saveExpense = async (values: ExpenseInput) => {
    const editing = expenseModal;
    const ok = await guard(
      () => (editing ? updateExpense(editing.id, values) : createExpense(values)),
      editing ? 'Расход сохранён' : 'Расход добавлен',
    );
    if (ok) {
      setExpenseModal(undefined);
      expenses.reload();
      object.reload();
    }
  };

  const removeExpense = async (expenseId: string) => {
    if (await guard(() => deleteExpense(expenseId), 'Расход удалён')) {
      expenses.reload();
      object.reload();
    }
  };

  if (object.loading && !object.data) return <PageSpinner />;
  if (object.error) return <LoadError message={object.error} onRetry={object.reload} />;
  if (!object.data) {
    return <Result status="404" title="Объект не найден" extra={<Link to="/objects">К списку объектов</Link>} />;
  }

  const o = object.data;
  const s = o.summary;
  const daysLeft = o.end_date ? dayjs(o.end_date).diff(dayjs().startOf('day'), 'day') : null;

  const reloadTasks = () => {
    tasks.reload();
    object.reload();
  };

  return (
    <>
      <PageHeader
        back={<Link to="/objects">← Все объекты</Link>}
        title={
          <Flex align="center" gap={12} wrap>
            {o.name}
            <ObjectStatusTag status={o.status} />
          </Flex>
        }
        sub={o.address}
        extra={
          isManager && (
            <>
              <Button icon={<EditOutlined />} onClick={() => setEditingObject(true)}>
                Изменить
              </Button>
              <Popconfirm
                title="Удалить объект?"
                description="Объект с задачами или расходами удалить нельзя."
                okText="Удалить"
                cancelText="Отмена"
                onConfirm={removeObject}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Удалить
                </Button>
              </Popconfirm>
            </>
          )
        }
      />

      <Card style={{ marginBottom: 20 }}>
        <Row gutter={[24, 20]}>
          <Col xs={12} lg={6}>
            <Fact label="Заказчик">{o.client || '—'}</Fact>
          </Col>
          <Col xs={12} lg={6}>
            <Fact label="Сроки">
              {o.start_date || o.end_date ? `${formatDate(o.start_date)} — ${formatDate(o.end_date)}` : 'не заданы'}
              {daysLeft !== null && o.status !== 'completed' && (
                <div style={{ fontWeight: 400, fontSize: 13 }}>
                  {daysLeft >= 0 ? (
                    <span className="muted">до сдачи {daysLeft} дн</span>
                  ) : (
                    <Typography.Text type="danger">срок сдачи прошёл {-daysLeft} дн назад</Typography.Text>
                  )}
                </div>
              )}
            </Fact>
          </Col>
          <Col xs={12} lg={6}>
            <Fact label="Готовность">
              <span className="num">
                {s.tasks_done} из {s.tasks_total} задач
              </span>
              <div style={{ marginTop: 8 }}>
                <BuildBar value={s.tasks_done} total={s.tasks_total} label="Готовность" />
              </div>
            </Fact>
          </Col>
          {isManager && (
            <Col xs={12} lg={6}>
              <Fact label="Бюджет">
                <span className="num">
                  {formatMoneyShort(s.spent)} из {o.budget ? formatMoneyShort(o.budget) : '—'}
                </span>
                {o.budget > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <BuildBar value={s.spent} total={o.budget} color="var(--steel)" label="Освоение бюджета" />
                  </div>
                )}
              </Fact>
            </Col>
          )}
        </Row>
        {o.description && (
          <Typography.Paragraph style={{ margin: '20px 0 0', whiteSpace: 'pre-wrap', maxWidth: '75ch' }}>
            {o.description}
          </Typography.Paragraph>
        )}
      </Card>

      <Tabs
        activeKey={tab}
        onChange={(k) => setParam('tab', k === 'tasks' ? null : k)}
        tabBarExtraContent={
          tab === 'tasks' ? (
            <Flex gap={8}>
              <Segmented
                value={view}
                onChange={(v) => setParam('view', v === 'table' ? 'table' : null)}
                options={[
                  { value: 'board', label: 'Доска' },
                  { value: 'table', label: 'Список' },
                ]}
              />
              {isManager && (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreatingTask(true)}>
                  Новая задача
                </Button>
              )}
            </Flex>
          ) : (
            tab === 'finance' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setExpenseModal(null)}>
                Добавить расход
              </Button>
            )
          )
        }
        items={[
          {
            key: 'tasks',
            label: isManager ? `Задачи (${s.tasks_total})` : `Мои задачи (${s.tasks_total})`,
            children: tasks.error ? (
              <LoadError message={tasks.error} onRetry={tasks.reload} />
            ) : view === 'board' ? (
              (tasks.data ?? []).length === 0 && !tasks.loading ? (
                <Empty description="Задач пока нет" />
              ) : (
                <TaskBoard
                  tasks={tasks.data ?? []}
                  profile={profile}
                  showAssignee={isManager}
                  onChanged={reloadTasks}
                />
              )
            ) : (
              <Card styles={{ body: { padding: 0 } }}>
                <TaskTable
                  tasks={tasks.data ?? []}
                  loading={tasks.loading}
                  showAssignee={isManager}
                  emptyText="Задач пока нет"
                />
              </Card>
            ),
          },
          ...(isManager
            ? [
                {
                  key: 'finance',
                  label: 'Расходы',
                  children: (
                    <Card>
                      {expenses.error ? (
                        <LoadError message={expenses.error} onRetry={expenses.reload} />
                      ) : (
                        <ExpensesPanel
                          expenses={expenses.data ?? []}
                          loading={expenses.loading}
                          onEdit={(e) => setExpenseModal(e)}
                          onDelete={removeExpense}
                        />
                      )}
                    </Card>
                  ),
                },
              ]
            : []),
        ]}
      />

      <TaskFormModal open={creatingTask} objectId={id} onCancel={() => setCreatingTask(false)} onSubmit={saveTask} />
      <ObjectFormModal
        open={editingObject}
        initial={o}
        onCancel={() => setEditingObject(false)}
        onSubmit={saveObject}
      />
      <ExpenseFormModal
        open={expenseModal !== undefined}
        objectId={id}
        initial={expenseModal ?? undefined}
        onCancel={() => setExpenseModal(undefined)}
        onSubmit={saveExpense}
      />
    </>
  );
}
