import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Result, Button } from 'antd';
import { useAuth } from '@/auth/useAuth';
import { PageSpinner } from './PageSpinner';

export function PrivateRoute() {
  const { session, profile, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <PageSpinner />;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!profile) {
    return (
      <Result
        status="warning"
        title="Профиль не найден"
        subTitle="Учётная запись есть, но профиль сотрудника не создан. Обратитесь к администратору."
        extra={<Button onClick={signOut}>Выйти</Button>}
      />
    );
  }
  return <Outlet />;
}

export function ExecutorOnly() {
  const profile = useAuth().profile;
  return profile?.role === 'executor' ? <Outlet /> : <Navigate to="/objects" replace />;
}
