import { useState } from 'react';
import { App, Button, Flex, Popconfirm, Space, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { createObject, deleteObject, fetchObjects, updateObject } from '@/api/objects';
import type { CrmObject } from '@/api/database.types';
import { useProfile } from '@/auth/useAuth';
import { useAsync } from '@/hooks/useAsync';
import { ObjectFormModal } from '@/components/ObjectFormModal';
import { LoadError } from '@/components/LoadError';

export function ObjectsPage() {
  const profile = useProfile();
  const isManager = profile.role === 'manager';
  const { message } = App.useApp();
  const { data, loading, error, reload } = useAsync(fetchObjects, []);
  const [editing, setEditing] = useState<CrmObject | null | undefined>(undefined);

  const save = async (values: { name: string; address: string }) => {
    try {
      if (editing) await updateObject(editing.id, values);
      else await createObject(values);
      message.success('Сохранено');
      setEditing(undefined);
      reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteObject(id);
      message.success('Объект удалён');
      reload();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  if (error) return <LoadError message={error} onRetry={reload} />;

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Объекты
        </Typography.Title>
        {isManager && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing(null)}>
            Добавить объект
          </Button>
        )}
      </Flex>
      {!isManager && (
        <Typography.Paragraph type="secondary">Показаны объекты, на которых у вас есть задачи.</Typography.Paragraph>
      )}

      <Table<CrmObject>
        rowKey="id"
        loading={loading}
        dataSource={data ?? []}
        pagination={false}
        locale={{ emptyText: isManager ? 'Объектов пока нет' : 'У вас пока нет задач ни на одном объекте' }}
        columns={[
          { title: 'Название', dataIndex: 'name', render: (name, o) => <Link to={`/objects/${o.id}`}>{name}</Link> },
          { title: 'Адрес', dataIndex: 'address' },
          ...(isManager
            ? [
                {
                  title: '',
                  key: 'actions',
                  width: 220,
                  render: (_: unknown, o: CrmObject) => (
                    <Space>
                      <Button size="small" onClick={() => setEditing(o)}>
                        Изменить
                      </Button>
                      <Popconfirm
                        title="Удалить объект?"
                        description="Объект с задачами удалить нельзя."
                        okText="Удалить"
                        cancelText="Отмена"
                        onConfirm={() => remove(o.id)}
                      >
                        <Button size="small" danger>
                          Удалить
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]
            : []),
        ]}
      />

      <ObjectFormModal
        open={editing !== undefined}
        initial={editing ? { name: editing.name, address: editing.address } : undefined}
        onCancel={() => setEditing(undefined)}
        onSubmit={save}
      />
    </>
  );
}
