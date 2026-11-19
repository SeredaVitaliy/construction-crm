import { Card, Col, Empty, Flex, Row, Skeleton, Tag } from 'antd';
import { Link } from 'react-router-dom';
import { fetchProfiles } from '@/api/profiles';
import { fetchTasks } from '@/api/tasks';
import { STATUS_HEX, STATUS_LABEL, TASK_STATUSES } from '@/api/statuses';
import { useAsync } from '@/hooks/useAsync';
import { isOverdue } from '@/lib/format';
import { LoadError } from '@/components/LoadError';
import { PageHeader } from '@/components/PageHeader';
import { UserAvatar } from '@/components/UserAvatar';

export function TeamPage() {
  const data = useAsync(async () => {
    const [profiles, tasks] = await Promise.all([fetchProfiles(), fetchTasks()]);
    return { profiles: profiles ?? [], tasks: tasks ?? [] };
  }, []);

  if (data.error) return <LoadError message={data.error} onRetry={data.reload} />;

  const profiles = data.data?.profiles ?? [];
  const tasks = data.data?.tasks ?? [];
  const managers = profiles.filter((p) => p.role === 'manager');
  const executors = profiles.filter((p) => p.role === 'executor');

  return (
    <>
      <PageHeader title="Команда" sub="Загрузка исполнителей и контакты" />
      {data.loading ? (
        <Skeleton active />
      ) : executors.length === 0 ? (
        <Empty description="Исполнителей пока нет. Учётные записи создаёт администратор в Supabase." />
      ) : (
        <Row gutter={[16, 16]}>
          {executors.map((p) => {
            const mine = tasks.filter((t) => t.assignee_id === p.id);
            const open = mine.filter((t) => t.status !== 'accepted');
            const overdue = open.filter(isOverdue).length;
            return (
              <Col key={p.id} xs={24} md={12} xl={8}>
                <Card style={{ height: '100%' }}>
                  <Flex gap={12} align="center">
                    <UserAvatar name={p.full_name || p.email} size={44} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 16 }}>{p.full_name || p.email}</div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {p.position || 'Исполнитель'}
                      </div>
                    </div>
                  </Flex>
                  <div style={{ fontSize: 13, margin: '14px 0' }}>
                    <div>
                      <a href={`mailto:${p.email}`}>{p.email}</a>
                    </div>
                    {p.phone && (
                      <div>
                        <a href={`tel:${p.phone.replace(/[^\d+]/g, '')}`}>{p.phone}</a>
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      height: 8,
                      borderRadius: 2,
                      overflow: 'hidden',
                      background: 'var(--track)',
                    }}
                  >
                    {TASK_STATUSES.map((s) => {
                      const n = mine.filter((t) => t.status === s).length;
                      return n ? (
                        <span
                          key={s}
                          title={`${STATUS_LABEL[s]}: ${n}`}
                          style={{ flex: n, background: STATUS_HEX[s] }}
                        />
                      ) : null;
                    })}
                  </div>
                  <Flex justify="space-between" align="center" style={{ marginTop: 10, fontSize: 13 }}>
                    <Link to={`/tasks?assignee=${p.id}`}>
                      {open.length} открыто, {mine.length - open.length} принято
                    </Link>
                    {overdue > 0 && <Tag color="error">просрочено: {overdue}</Tag>}
                  </Flex>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
      {managers.length > 0 && (
        <div className="muted" style={{ marginTop: 24, fontSize: 13 }}>
          Постановщики: {managers.map((m) => m.full_name || m.email).join(', ')}
        </div>
      )}
    </>
  );
}
