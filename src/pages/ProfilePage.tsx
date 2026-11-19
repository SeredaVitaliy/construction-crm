import { useState } from 'react';
import { App, Button, Card, Col, Flex, Form, Input, Row, Segmented } from 'antd';
import { updateProfile, type ProfileInput } from '@/api/profiles';
import { useAuth, useProfile } from '@/auth/useAuth';
import { useThemeMode } from '@/theme/useThemeMode';
import { PageHeader } from '@/components/PageHeader';
import { UserAvatar } from '@/components/UserAvatar';

export function ProfilePage() {
  const profile = useProfile();
  const { setProfile, signOut } = useAuth();
  const { mode, toggle } = useThemeMode();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);

  const save = async (values: ProfileInput) => {
    setSaving(true);
    try {
      const next = await updateProfile(profile.id, {
        full_name: values.full_name.trim(),
        phone: (values.phone ?? '').trim(),
        position: (values.position ?? '').trim(),
      });
      if (next) setProfile(next);
      message.success('Профиль сохранён');
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Профиль" />
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card>
            <Flex gap={16} align="center" style={{ marginBottom: 24 }}>
              <UserAvatar name={profile.full_name || profile.email} size={56} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{profile.full_name || profile.email}</div>
                <div className="muted">
                  {profile.email}, {profile.role === 'manager' ? 'постановщик' : 'исполнитель'}
                </div>
              </div>
            </Flex>
            <Form<ProfileInput>
              layout="vertical"
              requiredMark={false}
              initialValues={{ full_name: profile.full_name, phone: profile.phone, position: profile.position }}
              onFinish={save}
            >
              <Form.Item
                name="full_name"
                label="Имя и фамилия"
                rules={[{ required: true, whitespace: true, message: 'Введите имя' }]}
              >
                <Input maxLength={100} />
              </Form.Item>
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item name="position" label="Должность">
                    <Input maxLength={80} placeholder="Прораб" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="phone" label="Телефон">
                    <Input maxLength={32} placeholder="+7 900 000-00-00" />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" htmlType="submit" loading={saving}>
                Сохранить
              </Button>
            </Form>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Оформление" style={{ marginBottom: 20 }}>
            <Segmented
              value={mode}
              onChange={(v) => v !== mode && toggle()}
              options={[
                { value: 'light', label: 'Светлая' },
                { value: 'dark', label: 'Тёмная' },
              ]}
            />
          </Card>
          <Card title="Доступ">
            <p className="muted" style={{ marginTop: 0 }}>
              Роль и email меняет администратор. Пароль сбрасывается через администратора.
            </p>
            <Button onClick={signOut}>Выйти из аккаунта</Button>
          </Card>
        </Col>
      </Row>
    </>
  );
}
