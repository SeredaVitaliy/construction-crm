import { useEffect, useState } from 'react';
import { Button, Drawer, Dropdown, Flex, Grid, Layout, Menu, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  BuildOutlined,
  CheckSquareOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useProfile } from '@/auth/useAuth';
import { useThemeMode } from '@/theme/useThemeMode';
import { Brand } from './Brand';
import { UserAvatar } from './UserAvatar';

export function AppLayout() {
  const profile = useProfile();
  const { signOut } = useAuth();
  const { mode, toggle } = useThemeMode();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { lg } = Grid.useBreakpoint();
  const [drawer, setDrawer] = useState(false);
  const isManager = profile.role === 'manager';

  useEffect(() => setDrawer(false), [pathname]);

  const items = [
    { key: '/', icon: <AppstoreOutlined />, label: <Link to="/">Сводка</Link> },
    { key: '/objects', icon: <BuildOutlined />, label: <Link to="/objects">Объекты</Link> },
    {
      key: '/tasks',
      icon: <CheckSquareOutlined />,
      label: <Link to="/tasks">{isManager ? 'Задачи' : 'Мои задачи'}</Link>,
    },
    ...(isManager
      ? [
          { key: '/finance', icon: <WalletOutlined />, label: <Link to="/finance">Финансы</Link> },
          { key: '/team', icon: <TeamOutlined />, label: <Link to="/team">Команда</Link> },
        ]
      : []),
  ];
  const selected = pathname === '/' ? '/' : items.find((i) => i.key !== '/' && pathname.startsWith(i.key))?.key;

  const nav = (
    <Flex vertical style={{ height: '100%' }}>
      <div style={{ padding: '22px 20px 18px' }}>
        <Link to="/" aria-label="СтройТрек — на главную">
          <Brand />
        </Link>
      </div>
      <Menu
        className="side-nav"
        theme="dark"
        mode="inline"
        items={items}
        selectedKeys={selected ? [selected] : []}
        style={{ background: 'transparent', borderInlineEnd: 0, flex: 1 }}
      />
      <Link
        to="/profile"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          color: '#E4E8EA',
        }}
      >
        <UserAvatar name={profile.full_name || profile.email} />
        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: 'block',
              fontWeight: 550,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {profile.full_name || profile.email}
          </span>
          <span style={{ display: 'block', fontSize: 12, color: '#8D9AA2' }}>
            {isManager ? 'Постановщик' : 'Исполнитель'}
          </span>
        </span>
      </Link>
    </Flex>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {lg ? (
        <Layout.Sider width={236} style={{ position: 'sticky', top: 0, height: '100vh' }}>
          {nav}
        </Layout.Sider>
      ) : (
        <Drawer
          open={drawer}
          onClose={() => setDrawer(false)}
          placement="left"
          closable={false}
          styles={{ body: { padding: 0, background: '#1E2A32' }, wrapper: { width: 260 } }}
        >
          {nav}
        </Drawer>
      )}
      <Layout>
        <Flex align="center" justify="space-between" gap={8} style={{ padding: lg ? '14px 32px 0' : '12px 16px 0' }}>
          {lg ? (
            <span />
          ) : (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawer(true)} aria-label="Меню" />
          )}
          <Flex gap={4} align="center">
            <Tooltip title={mode === 'dark' ? 'Светлая тема' : 'Тёмная тема'}>
              <Button
                type="text"
                icon={mode === 'dark' ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggle}
                aria-label="Сменить тему"
              />
            </Tooltip>
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  { key: 'profile', icon: <UserOutlined />, label: 'Профиль', onClick: () => navigate('/profile') },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', onClick: signOut },
                ],
              }}
            >
              <Button type="text" aria-label="Меню пользователя" style={{ paddingInline: 4 }}>
                <UserAvatar name={profile.full_name || profile.email} size={28} />
              </Button>
            </Dropdown>
          </Flex>
        </Flex>
        <Layout.Content
          style={{ padding: lg ? '12px 32px 40px' : '8px 16px 32px', maxWidth: 1320, width: '100%', margin: '0 auto' }}
        >
          <Outlet />
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
