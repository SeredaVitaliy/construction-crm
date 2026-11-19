import { useEffect } from 'react';
import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { ExpenseCategory } from '@/api/database.types';
import type { ExpenseInput } from '@/api/expenses';
import { fetchObjects } from '@/api/objects';
import { EXPENSE_CATEGORIES, EXPENSE_LABEL } from '@/api/statuses';
import { useAsync } from '@/hooks/useAsync';
import { validate } from '@/lib/form';

type Props = {
  open: boolean;
  objectId?: string;
  initial?: ExpenseInput;
  onCancel: () => void;
  onSubmit: (values: ExpenseInput) => Promise<void>;
};

type FormValues = {
  object_id: string;
  category: ExpenseCategory;
  amount: number | null;
  spent_on: Dayjs;
  description: string;
};

export function ExpenseFormModal({ open, objectId, initial, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>();
  const objects = useAsync(() => (open && !objectId ? fetchObjects() : Promise.resolve([])), [open, objectId]);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      initial
        ? { ...initial, description: initial.description ?? '', spent_on: dayjs(initial.spent_on) }
        : { object_id: objectId, category: 'materials', amount: null, spent_on: dayjs(), description: '' },
    );
  }, [open, initial, objectId, form]);

  return (
    <Modal
      open={open}
      title={initial ? 'Изменить расход' : 'Новый расход'}
      okText={initial ? 'Сохранить' : 'Добавить расход'}
      cancelText="Отмена"
      onCancel={onCancel}
      onOk={async () => {
        const v = await validate(form);
        if (!v || v.amount === null) return;
        await onSubmit({
          object_id: v.object_id,
          category: v.category,
          amount: v.amount,
          spent_on: v.spent_on.format('YYYY-MM-DD'),
          description: (v.description ?? '').trim(),
        });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="object_id"
          label="Объект"
          hidden={!!objectId}
          rules={[{ required: true, message: 'Выберите объект' }]}
        >
          <Select
            loading={objects.loading}
            placeholder="Выберите объект"
            options={(objects.data ?? []).map((o) => ({ value: o.id, label: o.name }))}
          />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item name="category" label="Статья">
              <Select options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_LABEL[c] }))} />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item name="spent_on" label="Дата" rules={[{ required: true, message: 'Укажите дату' }]}>
              <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} allowClear={false} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="amount"
          label="Сумма, ₽"
          rules={[
            { required: true, message: 'Введите сумму' },
            { type: 'number', min: 0.01, message: 'Сумма должна быть больше нуля' },
          ]}
        >
          <InputNumber<number>
            min={0}
            step={1000}
            style={{ width: '100%' }}
            formatter={(v) => (v === undefined || v === null ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' '))}
            parser={(v) => Number((v ?? '').replace(/\s/g, '').replace(',', '.')) || 0}
          />
        </Form.Item>
        <Form.Item name="description" label="За что" style={{ marginBottom: 0 }}>
          <Input placeholder="Бетон В25, 40 м³" maxLength={500} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
