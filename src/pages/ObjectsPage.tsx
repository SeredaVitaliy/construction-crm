import { useState } from 'react';
import { App, Button, Col, Empty, Flex, Input, Row, Segmented, Skeleton, Table, Typography } from 'antd';
import { AppstoreOutlined, PlusOutlined, SearchOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createObject, fetchObjectsWithSummary, type ObjectInput, type ObjectWithSummary } from '@/api/objects';
import type { ObjectStatus } from '@/api/database.types';
import { OBJECT_STATUSES, OBJECT_STATUS_LABEL } from '@/api/statuses';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { formatDate, formatMoneyShort, plural } from '@/lib/format';
import { BuildBar } from '@/components/BuildBar';
import { LoadError } from '@/components/LoadError';
import { ObjectFormModal } from '@/components/ObjectFormModal';
import { PageHeader } from '@/components/PageHeader';
import { ObjectStatusTag } from '@/components/Tags';

function ObjectTile({ o, isManager }: { o: ObjectWithSummary; isManager: boolean }) {
  const s = o.summary;
  const pct = s.tasks_total ? Math.round((s.tasks_done / s.tasks_total) * 100) : 0;
  return (
    <Link to={`/objects/${o.id}`} className="object-tile">
      <Flex justify="space-between" align="flex-start" gap={12}>
        <div style={{ minWidth: 0 }}>
          <h3>{o.name}</h3>
          <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
            {o.address}
          </div>
        </div>
        <ObjectStatusTag status={o.status} />
      </Flex>
      {o.client && <div style={{ fontSize: 13 }}>Заказчик: {o.client}</div>}
      <div style={{ marginTop: 'auto' }}>
        <Flex justify="space-between" style={{ fontSize: 13, marginBottom: 6 }}>
          <span>Готовность</span>
          <span className="num">{pct}%</span>
        </Flex>
        <BuildBar value={s.tasks_done} total={s.tasks_total} label="Готовность" />
        {isManager && o.budget > 0 && (
          <>
            <Flex justify="space-between" style={{ fontSize: 13, margin: '12px 0 6px' }}>
              <span>Бюджет</span>
              <span className="num">
                {formatMoneyShort(s.spent)} / {formatMoneyShort(o.budget)}
              </span>
            </Flex>
            <BuildBar value={s.spent} total={o.budget} color="var(--steel)" label="Освоение бюджета" />
          </>
        )}
      </div>
      <Flex
        justify="space-between"
        className="muted"
        style={{ fontSize: 13, borderTop: '1px solid var(--line)', paddingTop: 10 }}
      >
        <span>
          {s.tasks_total} {plural(s.tasks_total, 'задача', 'задачи', 'задач')}
          {s.tasks_overdue > 0 && <Typography.Text type="danger">, {s.tasks_overdue} просроч.</Typography.Text>}
        </span>
        <span>{o.end_date ? `сдача ${formatDate(o.end_date)}` : 'срок не задан'}</span>
      </Flex>
    </Link>
  );
}

export function ObjectsPage() {
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, reload } = useAsync(fetchObjectsWithSummary, []);
  const [creating, setCreating] = useState(false);

  const status = (params.get('status') ?? 'all') as 'all' | ObjectStatus;
  const view = params.get('view') === 'table' ? 'table' : 'cards';
  const q = params.get('q') ?? '';

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const create = async (values: ObjectInput) => {
    try {
      const created = await createObject(values);
      message.success('Объект создан');
      setCreating(false);
      navigate(created ? `/objects/${created.id}` : '/objects');
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  if (error) return <LoadError message={error} onRetry={reload} />;

  const all = data ?? [];
  const needle = q.trim().toLowerCase();
  const visible = all.filter(
    (o) =>
      (status === 'all' || o.status === status) &&
      (!needle || [o.name, o.address, o.client].some((f) => f.toLowerCase().includes(needle))),
  );

  return (
    <>
      <PageHeader
        title="Объекты"
        sub={isManager ? 'Все стройки компании' : 'Объекты, на которых у вас есть задачи'}
        extra={
          isManager && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>
              Новый объект
            </Button>
          )
        }
      />

      <Flex justify="space-between" gap={12} wrap style={{ marginBottom: 16 }}>
        <Segmented
          value={status}
          onChange={(v) => setParam('status', v === 'all' ? null : String(v))}
          options={[
            { value: 'all', label: `Все (${all.length})` },
            ...OBJECT_STATUSES.map((s) => ({
              value: s,
              label: `${OBJECT_STATUS_LABEL[s]} (${all.filter((o) => o.status === s).length})`,
            })),
          ]}
          style={{ maxWidth: '100%', overflowX: 'auto' }}
        />
        <Flex gap={8}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Название, адрес, заказчик"
            value={q}
            onChange={(e) => setParam('q', e.target.value || null)}
            style={{ width: 260 }}
          />
          <Segmented
            value={view}
            onChange={(v) => setParam('view', v === 'table' ? 'table' : null)}
            options={[
              { value: 'cards', icon: <AppstoreOutlined />, title: 'Карточки' },
              { value: 'table', icon: <UnorderedListOutlined />, title: 'Таблица' },
            ]}
          />
        </Flex>
      </Flex>

      {loading ? (
        <Skeleton active />
      ) : visible.length === 0 ? (
        <Empty
          style={{ padding: 48 }}
          description={
            all.length === 0
              ? isManager
                ? 'Объектов пока нет — добавьте первую стройку'
                : 'У вас пока нет задач ни на одном объекте'
              : 'Под фильтр ничего не попало'
          }
        >
          {isManager && all.length === 0 && (
            <Button type="primary" onClick={() => setCreating(true)}>
              Добавить объект
            </Button>
          )}
        </Empty>
      ) : view === 'cards' ? (
        <Row gutter={[16, 16]}>
          {visible.map((o) => (
            <Col key={o.id} xs={24} md={12} xxl={8}>
              <ObjectTile o={o} isManager={isManager} />
            </Col>
          ))}
        </Row>
      ) : (
        <Table<ObjectWithSummary>
          rowKey="id"
          dataSource={visible}
          pagination={false}
          scroll={{ x: 800 }}
          columns={[
            { title: 'Название', dataIndex: 'name', render: (n, o) => <Link to={`/objects/${o.id}`}>{n}</Link> },
            { title: 'Адрес', dataIndex: 'address', render: (a) => <span className="muted">{a}</span> },
            { title: 'Этап', dataIndex: 'status', width: 140, render: (s) => <ObjectStatusTag status={s} /> },
            {
              title: 'Готовность',
              key: 'progress',
              width: 160,
              render: (_: unknown, o) => <BuildBar value={o.summary.tasks_done} total={o.summary.tasks_total} />,
            },
            ...(isManager
              ? [
                  {
                    title: 'Бюджет',
                    key: 'budget',
                    width: 150,
                    align: 'right' as const,
                    render: (_: unknown, o: ObjectWithSummary) => (o.budget ? formatMoneyShort(o.budget) : '—'),
                  },
                ]
              : []),
            { title: 'Сдача', dataIndex: 'end_date', width: 130, render: (d) => formatDate(d) },
          ]}
        />
      )}

      <ObjectFormModal open={creating} onCancel={() => setCreating(false)} onSubmit={create} />
    </>
  );
}
