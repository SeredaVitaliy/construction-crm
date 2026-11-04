import { App as AntApp, ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { AuthProvider } from '@/auth/AuthProvider';
import { ExecutorOnly, PrivateRoute } from '@/components/PrivateRoute';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { ObjectsPage } from '@/pages/ObjectsPage';
import { ObjectPage } from '@/pages/ObjectPage';
import { TaskPage } from '@/pages/TaskPage';
import { MyTasksPage } from '@/pages/MyTasksPage';

dayjs.locale('ru');

export function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <AntApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<PrivateRoute />}>
                <Route element={<AppLayout />}>
                  <Route path="/objects" element={<ObjectsPage />} />
                  <Route path="/objects/:id" element={<ObjectPage />} />
                  <Route path="/tasks/:id" element={<TaskPage />} />
                  <Route element={<ExecutorOnly />}>
                    <Route path="/my-tasks" element={<MyTasksPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/objects" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
