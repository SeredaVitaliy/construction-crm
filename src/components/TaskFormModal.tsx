import { useEffect } from 'react';
import { Form, Input, Modal, Select } from 'antd';
import type { TaskInput } from '@/api/tasks';
import { fetchExecutors } from '@/api/profiles';
import { fetchObjects } from '@/api/objects';
import { useAsync } from '@/hooks/useAsync';
import { validate } from '@/lib/form';

type Props = {
  open: boolean;
  objectId: string;
  initial?: TaskInput;
  onCancel: () => void;
  onSubmit: (values: TaskInput) => Promise<void>;
};

export function TaskFormModal({ open, objectId, initial, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<TaskInput>();
  // Модалку открывает только постановщик, ему RLS отдаёт всех исполнителей и все объекты
  const executors = useAsync(() => (open ? fetchExecutors() : Promise.resolve([])), [open]);
  const objects = useAsync(() => (open && initial ? fetchObjects() : Promise.resolve([])), [open, !!initial]);

  useEffect(() => {
    if (open) form.setFieldsValue(initial ?? { title: '', description: '', object_id: objectId, assignee_id: undefined });
  }, [open, initial, objectId, form]);

  return (
    <Modal
      open={open}
      title={initial ? 'Редактировать задачу' : 'Новая задача'}
      okText="Сохранить"
      cancelText="Отмена"
      onCancel={onCancel}
      onOk={async () => {
        const v = await validate(form);
        if (v) await onSubmit({ ...v, title: v.title.trim(), description: (v.description ?? '').trim() });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="title" label="Название" rules={[{ required: true, whitespace: true, message: 'Введите название' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} />
        </Form.Item>
        <Form.Item name="assignee_id" label="Исполнитель" rules={[{ required: true, message: 'Выберите исполнителя' }]}>
          <Select
            loading={executors.loading}
            placeholder="Выберите исполнителя"
            options={(executors.data ?? []).map((e) => ({ value: e.id, label: e.full_name || e.email }))}
          />
        </Form.Item>
        {/* При редактировании задачу можно перенести на другой объект */}
        <Form.Item name="object_id" label="Объект" hidden={!initial} rules={[{ required: true }]}>
          <Select
            loading={objects.loading}
            options={(objects.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
