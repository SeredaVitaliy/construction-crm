import { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';
import type { ObjectInput } from '@/api/objects';
import { validate } from '@/lib/form';

type Props = {
  open: boolean;
  initial?: ObjectInput;
  onCancel: () => void;
  onSubmit: (values: ObjectInput) => Promise<void>;
};

export function ObjectFormModal({ open, initial, onCancel, onSubmit }: Props) {
  const [form] = Form.useForm<ObjectInput>();

  useEffect(() => {
    if (open) form.setFieldsValue(initial ?? { name: '', address: '' });
  }, [open, initial, form]);

  return (
    <Modal
      open={open}
      title={initial ? 'Редактировать объект' : 'Новый объект'}
      okText="Сохранить"
      cancelText="Отмена"
      onCancel={onCancel}
      onOk={async () => {
        const values = await validate(form);
        if (values) await onSubmit({ name: values.name.trim(), address: values.address.trim() });
      }}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="name" label="Название" rules={[{ required: true, whitespace: true, message: 'Введите название' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Адрес" rules={[{ required: true, whitespace: true, message: 'Введите адрес' }]}>
          <Input />
        </Form.Item>
      </Form>
    </Modal>
  );
}
