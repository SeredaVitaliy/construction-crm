import { Card, Col, Empty, Flex, Row, Skeleton, Typography } from 'antd';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { fetchObjectsWithSummary } from '@/api/objects';
import { fetchRecentComments, fetchRecentHistory, fetchTasks, type TaskListItem } from '@/api/tasks';
import { STATUS_HEX, STATUS_LABEL, TASK_STATUSES } from '@/api/statuses';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { dueLabel, formatMoneyShort, formatRelative, isOverdue, plural } from '@/lib/format';
import { BuildBar } from '@/components/BuildBar';
import { LoadError } from '@/components/LoadError';
import { ObjectStatusTag, PriorityMark, StatusTag } from '@/components/Tags';
import { UserAvatar } from '@/components/UserAvatar';

function greeting() {
  const h = dayjs().hour();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

function TaskLine({ t, showAssignee }: { t: TaskListItem; showAssignee?: boolean }) {
  const due = dueLabel(t);
  return (
    <Link
      to={`/tasks/${t.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderTop: '1px solid var(--line)',
        color: 'inherit',
      }}
    >
      <PriorityMark priority={t.priority} withLabel={false} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {t.title}
        </span>
        <span className="muted" style={{ fontSize: 13 }}>
          {t.object?.name}
          {showAssignee && t.assignee ? `, ${t.assignee.full_name}` : ''}
        </span>
      </span>
      {due && (
        <Typography.Text type={isOverdue(t) ? 'danger' : 'secondary'} style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          {due}
        </Typography.Text>
      )}
      <span className="hide-sm">
        <StatusTag status={t.status} />
      </span>
    </Link>
  );
}

export function DashboardPage() {
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const tasks = useAsync(fetchTasks, []);
  const objects = useAsync(fetchObjectsWithSummary, []);
  const feed = useAsync(async () => {
    const [history, comments] = await Promise.all([fetchRecentHistory(14), fetchRecentComments(8)]);
    return [
      ...(history ?? []).map((h) => ({
        key: `h${h.id}`,
        at: h.created_at,
        who: h.author?.full_name ?? '—',
        taskId: h.task?.id,
        taskTitle: h.task?.title ?? 'задача',
        text: h.from_status === null ? 'поставил(а) задачу' : `перевёл(а) в «${STATUS_LABEL[h.to_status]}»`,
        quote: h.comment,
      })),
      ...(comments ?? []).map((c) => ({
        key: `c${c.id}`,
        at: c.created_at,
        who: c.author?.full_name ?? '—',
        taskId: c.task?.id,
        taskTitle: c.task?.title ?? 'задача',
        text: 'прокомментировал(а)',
        quote: c.body,
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);
  }, []);

  if (tasks.error) return <LoadError message={tasks.error} onRetry={tasks.reload} />;

  const all = tasks.data ?? [];
  const open = all.filter((t) => t.status !== 'accepted');
  const overdue = open.filter(isOverdue);
  const review = all.filter((t) => t.status === 'review');
  const rework = all.filter((t) => t.status === 'rework');
  const activeObjects = (objects.data ?? []).filter((o) => o.status === 'active' || o.status === 'paused');

  const focus = isManager
    ? review
    : open
        .filter((t) => t.status !== 'review')
        .sort((a, b) => (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999'));

  const firstName = (profile.full_name || '').split(' ')[0];

  const metrics = isManager
    ? [
        {
          to: '/objects?status=active',
          value: (objects.data ?? []).filter((o) => o.status === 'active').length,
          label: 'объектов в работе',
        },
        { to: '/tasks', value: open.length, label: 'открытых задач' },
        { to: '/tasks?status=review', value: review.length, label: 'ждут проверки' },
        { to: '/tasks?overdue=1', value: overdue.length, label: 'просрочено', danger: overdue.length > 0 },
      ]
    : [
        { to: '/tasks', value: open.length, label: 'открытых задач у вас' },
        { to: '/tasks?status=rework', value: rework.length, label: 'вернули на доработку', danger: rework.length > 0 },
        { to: '/tasks?status=review', value: review.length, label: 'на проверке' },
        { to: '/tasks?overdue=1', value: overdue.length, label: 'просрочено', danger: overdue.length > 0 },
      ];

  return (
    <Flex vertical gap={20}>
      <div>
        <h1 className="page-title">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </h1>
        <div className="page-sub">{dayjs().format('dddd, D MMMM')}</div>
      </div>

      <nav className="metric-strip" aria-label="Ключевые показатели">
        {metrics.map((m) => (
          <Link key={m.label} to={m.to}>
            <div className="metric-value num" style={m.danger ? { color: 'var(--rebar)' } : undefined}>
              {tasks.loading ? '…' : m.value}
            </div>
            <div className="metric-label">{m.label}</div>
          </Link>
        ))}
      </nav>

      <Row gutter={[20, 20]}>
        <Col xs={24} xl={15}>
          <Flex vertical gap={20}>
            <Card
              title={isManager ? 'Ждут вашей проверки' : 'Ваши задачи по срокам'}
              extra={<Link to={isManager ? '/tasks?status=review' : '/tasks'}>Все задачи</Link>}
            >
              {tasks.loading ? (
                <Skeleton active />
              ) : focus.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={isManager ? 'Всё проверено — новых сдач нет' : 'Открытых задач нет'}
                />
              ) : (
                <div style={{ marginTop: -10 }}>
                  {focus.slice(0, 6).map((t) => (
                    <TaskLine key={t.id} t={t} showAssignee={isManager} />
                  ))}
                </div>
              )}
            </Card>

            <Card title="Объекты в работе" extra={<Link to="/objects">Все объекты</Link>}>
              {objects.loading ? (
                <Skeleton active />
              ) : activeObjects.length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Активных объектов нет" />
              ) : (
                <Flex vertical gap={18}>
                  {activeObjects.map((o) => {
                    const s = o.summary;
                    return (
                      <Link key={o.id} to={`/objects/${o.id}`} style={{ color: 'inherit' }}>
                        <Flex justify="space-between" align="baseline" gap={12} style={{ marginBottom: 6 }}>
                          <span style={{ fontWeight: 550 }}>{o.name}</span>
                          <Flex gap={10} align="center" style={{ flexShrink: 0 }}>
                            {s.tasks_overdue > 0 && (
                              <Typography.Text type="danger" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
                                {s.tasks_overdue} {plural(s.tasks_overdue, 'просрочена', 'просрочены', 'просрочено')}
                              </Typography.Text>
                            )}
                            <span className="hide-sm">
                              <ObjectStatusTag status={o.status} />
                            </span>
                          </Flex>
                        </Flex>
                        <BuildBar value={s.tasks_done} total={s.tasks_total} label={`Готовность ${o.name}`} />
                        <Flex
                          justify="space-between"
                          wrap
                          gap={4}
                          className="muted"
                          style={{ fontSize: 13, marginTop: 6 }}
                        >
                          <span className="num">
                            {s.tasks_done} из {s.tasks_total} {plural(s.tasks_total, 'задачи', 'задач', 'задач')}{' '}
                            принято
                          </span>
                          {isManager && o.budget > 0 && (
                            <span className="num">
                              освоено {formatMoneyShort(s.spent)} из {formatMoneyShort(o.budget)}
                            </span>
                          )}
                        </Flex>
                      </Link>
                    );
                  })}
                </Flex>
              )}
            </Card>
          </Flex>
        </Col>

        <Col xs={24} xl={9}>
          <Flex vertical gap={20}>
            <Card title={isManager ? 'Задачи по статусам' : 'Мои задачи по статусам'}>
              {tasks.loading ? (
                <Skeleton active paragraph={{ rows: 3 }} />
              ) : (
                <>
                  <div
                    style={{
                      display: 'flex',
                      height: 12,
                      borderRadius: 3,
                      overflow: 'hidden',
                      background: 'var(--track)',
                    }}
                  >
                    {TASK_STATUSES.map((s) => {
                      const n = all.filter((t) => t.status === s).length;
                      return n ? (
                        <span
                          key={s}
                          title={`${STATUS_LABEL[s]}: ${n}`}
                          style={{ flex: n, background: STATUS_HEX[s] }}
                        />
                      ) : null;
                    })}
                  </div>
                  <div style={{ marginTop: 14 }}>
                    {TASK_STATUSES.map((s) => (
                      <Link
                        key={s}
                        to={`/tasks?status=${s}`}
                        style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'inherit' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_HEX[s] }} />
                          {STATUS_LABEL[s]}
                        </span>
                        <span className="num muted">{all.filter((t) => t.status === s).length}</span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </Card>

            <Card title="Последние события">
              {feed.loading ? (
                <Skeleton active avatar />
              ) : feed.error ? (
                <LoadError message={feed.error} onRetry={feed.reload} />
              ) : (feed.data ?? []).length === 0 ? (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Пока тихо" />
              ) : (
                (feed.data ?? []).map((e) => (
                  <div key={e.key} className="feed-item">
                    <UserAvatar name={e.who} />
                    <div style={{ minWidth: 0, fontSize: 13.5, lineHeight: 1.45 }}>
                      <strong style={{ fontWeight: 600 }}>{e.who}</strong> {e.text}{' '}
                      {e.taskId ? <Link to={`/tasks/${e.taskId}`}>{e.taskTitle}</Link> : e.taskTitle}
                      {e.quote && (
                        <div
                          className="muted"
                          style={{ marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          «{e.quote}»
                        </div>
                      )}
                      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                        {formatRelative(e.at)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </Card>
          </Flex>
        </Col>
      </Row>
    </Flex>
  );
}
