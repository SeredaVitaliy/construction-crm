import { useState } from 'react';
import { Alert, Button, Divider, Flex, Form, Input } from 'antd';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { Brand } from '@/components/Brand';

type FormValues = { email: string; password: string };

const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD;
const DEMO_USERS = [
  { email: 'manager@example.com', label: 'Постановщик' },
  { email: 'ivanov@example.com', label: 'Исполнитель' },
];

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [form] = Form.useForm<FormValues>();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';
  if (session) return <Navigate to={from} replace />;

  const enter = async ({ email, password }: FormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <aside className="login-art">
        <Brand />
        <div>
          <h1>Стройка под контролем</h1>
          <p>
            Объекты, задачи бригадам, сроки и расходы в одном окне. Исполнитель видит только свою работу, постановщик —
            всю картину и деньги.
          </p>
        </div>
        <Flex gap={32} wrap style={{ color: '#AAB6BD', fontSize: 14 }}>
          <span>Приёмка работ с историей</span>
          <span>Права на уровне базы</span>
          <span>Бюджет и факт по объектам</span>
        </Flex>
        <div className="login-stripe hazard" />
      </aside>

      <main className="login-form">
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 className="page-title" style={{ fontSize: 28 }}>
            Вход
          </h2>
          <p className="page-sub" style={{ margin: '6px 0 24px' }}>
            Учётную запись выдаёт администратор компании.
          </p>
          {error && <Alert type="error" showIcon title={error} style={{ marginBottom: 16 }} />}
          <Form<FormValues> form={form} layout="vertical" onFinish={enter} requiredMark={false} size="large">
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Введите email' }]}>
              <Input autoComplete="username" autoFocus />
            </Form.Item>
            <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Введите пароль' }]}>
              <Input.Password autoComplete="current-password" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={submitting}>
              Войти
            </Button>
          </Form>
          {DEMO_PASSWORD && (
            <>
              <Divider plain style={{ fontSize: 13 }}>
                или посмотрите демо
              </Divider>
              <Flex gap={8}>
                {DEMO_USERS.map((u) => (
                  <Button
                    key={u.email}
                    block
                    disabled={submitting}
                    onClick={() => enter({ email: u.email, password: DEMO_PASSWORD })}
                  >
                    {u.label}
                  </Button>
                ))}
              </Flex>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
