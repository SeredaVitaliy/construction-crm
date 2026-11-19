import { useEffect } from 'react';
import { Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { CrmObject, ObjectStatus } from '@/api/database.types';
import type { ObjectInput } from '@/api/objects';
import { OBJECT_STATUSES, OBJECT_STATUS_LABEL } from '@/api/statuses';
import { validate } from '@/lib/form';

type Props = {
  open: boolean;
  initial?: CrmObject | null;
  onCancel: () => void;
  onSubmit: (values: ObjectInput) => Promise<void>;
};

type FormValues = {
  name: string;
  address: string;
  client: string;
  status: ObjectStatus;
  budget: number | null;
  period: [Dayjs | null, Dayjs | null] | null;
  description: string;
};

export function ObjectFormModal({ open, initial, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<FormValues>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue(
      initial
        ? {
            name: initial.name,
            address: initial.address,
            client: initial.client,
            status: initial.status,
            budget: Number(initial.budget) || null,
            period: [
              initial.start_date ? dayjs(initial.start_date) : null,
              initial.end_date ? dayjs(initial.end_date) : null,
            ],
            description: initial.description,
          }
        : { name: '', address: '', client: '', status: 'planning', budget: null, period: null, description: '' },
    );
  }, [open, initial, form]);

  return (
    <Modal
      open={open}
      title={initial ? 'Изменить объект' : 'Новый объект'}
      okText={initial ? 'Сохранить' : 'Создать объект'}
      cancelText="Отмена"
      width={640}
      onCancel={onCancel}
      onOk={async () => {
        const v = await validate(form);
        if (!v) return;
        await onSubmit({
          name: v.name.trim(),
          address: v.address.trim(),
          client: (v.client ?? '').trim(),
          status: v.status,
          budget: v.budget ?? 0,
          start_date: v.period?.[0]?.format('YYYY-MM-DD') ?? null,
          end_date: v.period?.[1]?.format('YYYY-MM-DD') ?? null,
          description: (v.description ?? '').trim(),
        });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="name"
          label="Название"
          rules={[{ required: true, whitespace: true, message: 'Введите название' }]}
        >
          <Input placeholder="ЖК «Северный»" />
        </Form.Item>
        <Form.Item
          name="address"
          label="Адрес"
          rules={[{ required: true, whitespace: true, message: 'Введите адрес' }]}
        >
          <Input placeholder="Город, улица, дом" />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} sm={14}>
            <Form.Item name="client" label="Заказчик">
              <Input placeholder="Компания или частное лицо" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={10}>
            <Form.Item name="status" label="Этап">
              <Select options={OBJECT_STATUSES.map((s) => ({ value: s, label: OBJECT_STATUS_LABEL[s] }))} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col xs={24} sm={10}>
            <Form.Item name="budget" label="Бюджет, ₽">
              <InputNumber<number>
                min={0}
                step={100000}
                style={{ width: '100%' }}
                formatter={(v) => (v === undefined || v === null ? '' : `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' '))}
                parser={(v) => Number((v ?? '').replace(/\s/g, '')) || 0}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={14}>
            <Form.Item name="period" label="Сроки">
              <DatePicker.RangePicker
                format="DD.MM.YYYY"
                allowEmpty={[true, true]}
                placeholder={['Начало', 'Сдача']}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="Описание" style={{ marginBottom: 0 }}>
          <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="Что строим, особенности объекта" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
