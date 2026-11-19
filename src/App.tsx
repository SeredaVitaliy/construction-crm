import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import { AuthProvider } from '@/auth/AuthProvider';
import { ManagerOnly, PrivateRoute } from '@/components/PrivateRoute';
import { AppLayout } from '@/components/AppLayout';
import { PageSpinner } from '@/components/PageSpinner';
import { ThemeProvider } from '@/theme/ThemeProvider';
import { LoginPage } from '@/pages/LoginPage';

const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ObjectsPage = lazy(() => import('@/pages/ObjectsPage').then((m) => ({ default: m.ObjectsPage })));
const ObjectPage = lazy(() => import('@/pages/ObjectPage').then((m) => ({ default: m.ObjectPage })));
const TasksPage = lazy(() => import('@/pages/TasksPage').then((m) => ({ default: m.TasksPage })));
const TaskPage = lazy(() => import('@/pages/TaskPage').then((m) => ({ default: m.TaskPage })));
const FinancePage = lazy(() => import('@/pages/FinancePage').then((m) => ({ default: m.FinancePage })));
const TeamPage = lazy(() => import('@/pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const ProfilePage = lazy(() => import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

dayjs.locale('ru');

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<PrivateRoute />}>
                <Route element={<AppLayout />}>
                  <Route index element={<DashboardPage />} />
                  <Route path="/objects" element={<ObjectsPage />} />
                  <Route path="/objects/:id" element={<ObjectPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/tasks/:id" element={<TaskPage />} />
                  <Route path="/my-tasks" element={<Navigate to="/tasks" replace />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route element={<ManagerOnly />}>
                    <Route path="/finance" element={<FinancePage />} />
                    <Route path="/team" element={<TeamPage />} />
                  </Route>
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
