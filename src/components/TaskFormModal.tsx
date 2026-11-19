import { useEffect } from 'react';
import { Col, DatePicker, Form, Input, Modal, Row, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { TaskPriority } from '@/api/database.types';
import type { TaskInput } from '@/api/tasks';
import { fetchExecutors } from '@/api/profiles';
import { fetchObjects } from '@/api/objects';
import { PRIORITIES, PRIORITY_LABEL } from '@/api/statuses';
import { useAsync } from '@/hooks/useAsync';
import { validate } from '@/lib/form';
import { PriorityMark } from './Tags';

type Props = {
  open: boolean;
  objectId?: string;
  lockObject?: boolean;
  initial?: TaskInput;
  onCancel: () => void;
  onSubmit: (values: TaskInput) => Promise<void>;
};

type FormValues = Omit<TaskInput, 'due_date'> & { due_date: Dayjs | null };

export function TaskFormModal({ open, objectId, lockObject = true, initial, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>();
  const executors = useAsync(() => (open ? fetchExecutors() : Promise.resolve([])), [open]);
  const objects = useAsync(() => (open ? fetchObjects() : Promise.resolve([])), [open]);
  const objectLocked = lockObject && !!objectId && !initial;

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      initial
        ? { ...initial, due_date: initial.due_date ? dayjs(initial.due_date) : null }
        : {
            title: '',
            description: '',
            object_id: objectId,
            assignee_id: undefined,
            priority: 'medium' as TaskPriority,
            due_date: null,
          },
    );
  }, [open, initial, objectId, form]);

  return (
    <Modal
      open={open}
      title={initial ? 'Изменить задачу' : 'Новая задача'}
      okText={initial ? 'Сохранить' : 'Создать задачу'}
      cancelText="Отмена"
      width={600}
      onCancel={onCancel}
      onOk={async () => {
        const v = await validate(form);
        if (!v) return;
        await onSubmit({
          ...v,
          title: v.title.trim(),
          description: (v.description ?? '').trim(),
          due_date: v.due_date ? v.due_date.format('YYYY-MM-DD') : null,
        });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="title"
          label="Название"
          rules={[{ required: true, whitespace: true, message: 'Введите название' }]}
        >
          <Input placeholder="Что нужно сделать" />
        </Form.Item>
        <Form.Item name="description" label="Описание">
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 8 }}
            placeholder="Объём работ, требования, ссылки на документы"
          />
        </Form.Item>
        <Form.Item
          name="object_id"
          label="Объект"
          hidden={objectLocked}
          rules={[{ required: true, message: 'Выберите объект' }]}
        >
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            loading={objects.loading}
            placeholder="Выберите объект"
            options={(objects.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
          />
        </Form.Item>
        <Form.Item name="assignee_id" label="Исполнитель" rules={[{ required: true, message: 'Выберите исполнителя' }]}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            loading={executors.loading}
            placeholder="Выберите исполнителя"
            options={(executors.data ?? []).map((e) => ({ value: e.id, label: e.full_name || e.email }))}
          />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="priority" label="Приоритет">
              <Select
                options={PRIORITIES.map((p) => ({
                  value: p,
                  label: <PriorityMark priority={p} />,
                  title: PRIORITY_LABEL[p],
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="due_date" label="Срок" style={{ marginBottom: 0 }}>
              <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} placeholder="Без срока" />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
