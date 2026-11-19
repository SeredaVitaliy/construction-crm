import { useState } from 'react';
import { App, Button, Card, Col, Flex, Row, Select, Table } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  updateExpense,
  type ExpenseInput,
  type ExpenseItem,
} from '@/api/expenses';
import { fetchObjectsWithSummary, type ObjectWithSummary } from '@/api/objects';
import { useAsync } from '@/hooks/useAsync';
import { formatMoney, formatMoneyShort } from '@/lib/format';
import { BuildBar } from '@/components/BuildBar';
import { ExpenseFormModal } from '@/components/ExpenseFormModal';
import { ExpensesPanel } from '@/components/ExpensesPanel';
import { LoadError } from '@/components/LoadError';
import { PageHeader } from '@/components/PageHeader';
import { ObjectStatusTag } from '@/components/Tags';

export function FinancePage() {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const objects = useAsync(fetchObjectsWithSummary, []);
  const expenses = useAsync(() => fetchExpenses(), []);
  const [modal, setModal] = useState<ExpenseItem | null | undefined>(undefined);
  const objectId = params.get('object');

  const reload = () => {
    objects.reload();
    expenses.reload();
  };

  const save = async (values: ExpenseInput) => {
    try {
      if (modal) await updateExpense(modal.id, values);
      else await createExpense(values);
      message.success(modal ? 'Расход сохранён' : 'Расход добавлен');
      setModal(undefined);
      reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteExpense(id);
      message.success('Расход удалён');
      reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  if (objects.error) return <LoadError message={objects.error} onRetry={objects.reload} />;

  const list = objects.data ?? [];
  const budget = list.reduce((s, o) => s + o.budget, 0);
  const spent = list.reduce((s, o) => s + o.summary.spent, 0);
  const over = list.filter((o) => o.budget > 0 && o.summary.spent > o.budget);
  const visibleExpenses = (expenses.data ?? []).filter((e) => !objectId || e.object_id === objectId);

  return (
    <>
      <PageHeader
        title="Финансы"
        sub="Бюджеты объектов и фактические расходы"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModal(null)}>
            Добавить расход
          </Button>
        }
      />

      <div className="metric-strip" style={{ marginBottom: 20 }}>
        <div>
          <div className="metric-value num">{formatMoneyShort(budget)}</div>
          <div className="metric-label">общий бюджет</div>
        </div>
        <div>
          <div className="metric-value num">{formatMoneyShort(spent)}</div>
          <div className="metric-label">израсходовано</div>
        </div>
        <div>
          <div className="metric-value num">{formatMoneyShort(Math.max(budget - spent, 0))}</div>
          <div className="metric-label">остаток</div>
        </div>
        <div>
          <div className="metric-value num" style={over.length ? { color: 'var(--rebar)' } : undefined}>
            {over.length}
          </div>
          <div className="metric-label">объектов с перерасходом</div>
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24}>
          <Card title="Бюджет по объектам" styles={{ body: { padding: 0 } }}>
            <Table<ObjectWithSummary>
              rowKey="id"
              loading={objects.loading}
              dataSource={list}
              pagination={false}
              scroll={{ x: 760 }}
              columns={[
                {
                  title: 'Объект',
                  dataIndex: 'name',
                  render: (n, o) => <Link to={`/objects/${o.id}?tab=finance`}>{n}</Link>,
                },
                { title: 'Этап', dataIndex: 'status', width: 150, render: (s) => <ObjectStatusTag status={s} /> },
                {
                  title: 'Бюджет',
                  dataIndex: 'budget',
                  width: 150,
                  align: 'right',
                  render: (b: number) => <span className="num">{b ? formatMoney(b) : '—'}</span>,
                },
                {
                  title: 'Израсходовано',
                  key: 'spent',
                  width: 150,
                  align: 'right',
                  sorter: (a, b) => a.summary.spent - b.summary.spent,
                  render: (_: unknown, o) => <span className="num">{formatMoney(o.summary.spent)}</span>,
                },
                {
                  title: 'Освоение',
                  key: 'ratio',
                  width: 220,
                  render: (_: unknown, o) =>
                    o.budget > 0 ? (
                      <Flex align="center" gap={10}>
                        <div style={{ flex: 1 }}>
                          <BuildBar value={o.summary.spent} total={o.budget} color="var(--steel)" />
                        </div>
                        <span
                          className="num"
                          style={{
                            width: 44,
                            textAlign: 'right',
                            color: o.summary.spent > o.budget ? 'var(--rebar)' : undefined,
                          }}
                        >
                          {Math.round((o.summary.spent / o.budget) * 100)}%
                        </span>
                      </Flex>
                    ) : (
                      <span className="muted">бюджет не задан</span>
                    ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24}>
          <Card
            title="Расходы"
            extra={
              <Select
                allowClear
                placeholder="Все объекты"
                value={objectId ?? undefined}
                onChange={(v) => setParams(v ? { object: v } : {}, { replace: true })}
                options={list.map((o) => ({ value: o.id, label: o.name }))}
                style={{ width: 220 }}
              />
            }
          >
            {expenses.error ? (
              <LoadError message={expenses.error} onRetry={expenses.reload} />
            ) : (
              <ExpensesPanel
                expenses={visibleExpenses}
                loading={expenses.loading}
                showObject={!objectId}
                onEdit={(e) => setModal(e)}
                onDelete={remove}
              />
            )}
          </Card>
        </Col>
      </Row>

      <ExpenseFormModal
        open={modal !== undefined}
        objectId={modal ? undefined : (objectId ?? undefined)}
        initial={modal ?? undefined}
        onCancel={() => setModal(undefined)}
        onSubmit={save}
      />
    </>
  );
}
