import { Grid, Layout, Menu, Space, Typography, Button, Tag } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useProfile } from '@/auth/useAuth';

export function AppLayout() {
  const profile = useProfile();
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const { md } = Grid.useBreakpoint();

  const items = [
    { key: '/objects', label: <Link to="/objects">Объекты</Link> },
    ...(profile.role === 'executor' ? [{ key: '/my-tasks', label: <Link to="/my-tasks">Мои задачи</Link> }] : []),
  ];
  const selected = items.find((i) => pathname.startsWith(i.key))?.key;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Layout.Header style={{ display: 'flex', alignItems: 'center', gap: 16, paddingInline: md ? 24 : 12 }}>
        {md && (
          <Typography.Text strong style={{ color: '#fff', whiteSpace: 'nowrap' }}>
            Объекты и задачи
          </Typography.Text>
        )}
        <Menu
          theme="dark"
          mode="horizontal"
          items={items}
          selectedKeys={selected ? [selected] : []}
          style={{ flex: 1, minWidth: 200 }}
        />
        <Space>
          {md && (
            <Typography.Text style={{ color: '#fff', whiteSpace: 'nowrap' }}>
              {profile.full_name || profile.email}
            </Typography.Text>
          )}
          <Tag color={profile.role === 'manager' ? 'gold' : 'blue'}>
            {profile.role === 'manager' ? 'Постановщик' : 'Исполнитель'}
          </Tag>
          <Button icon={<LogoutOutlined />} onClick={signOut} aria-label="Выйти">
            {md && 'Выйти'}
          </Button>
        </Space>
      </Layout.Header>
      <Layout.Content style={{ padding: md ? 24 : 12, maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <Outlet />
      </Layout.Content>
    </Layout>
  );
}
