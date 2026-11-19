import { useState } from 'react';
import { App, Form, Input, Modal } from 'antd';
import { changeTaskStatus } from '@/api/tasks';
import { STATUS_LABEL } from '@/api/statuses';
import type { TaskAction } from '@/lib/taskActions';
import { validate } from '@/lib/form';

export function useStatusChange(onDone: () => void) {
  const { message } = App.useApp();
  const [pending, setPending] = useState<string | null>(null);
  const [ask, setAsk] = useState<{ taskId: string; action: TaskAction } | null>(null);
  const [form] = Form.useForm<{ comment: string }>();

  const run = async (taskId: string, action: TaskAction, comment?: string) => {
    setPending(`${taskId}:${action.to}`);
    try {
      await changeTaskStatus(taskId, action.to, comment);
      message.success(`Статус: ${STATUS_LABEL[action.to]}`);
      setAsk(null);
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setPending(null);
      onDone();
    }
  };

  const start = (taskId: string, action: TaskAction) =>
    action.needsComment ? setAsk({ taskId, action }) : run(taskId, action);

  const modal = (
    <Modal
      open={ask !== null}
      title={ask?.action.label}
      okText="Вернуть на доработку"
      cancelText="Отмена"
      okButtonProps={{ danger: ask?.action.danger, loading: pending !== null }}
      onCancel={() => setAsk(null)}
      onOk={async () => {
        const values = await validate(form);
        if (values && ask) await run(ask.taskId, ask.action, values.comment);
      }}
      afterOpenChange={(open) => !open && form.resetFields()}
      forceRender
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          name="comment"
          label="Что нужно исправить"
          rules={[{ required: true, whitespace: true, message: 'Комментарий обязателен' }]}
        >
          <Input.TextArea autoFocus autoSize={{ minRows: 3, maxRows: 8 }} />
        </Form.Item>
      </Form>
    </Modal>
  );

  return { start, pending, modal };
}
