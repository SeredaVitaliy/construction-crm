import type { FormInstance } from 'antd';

// validateFields() при ошибке отклоняет промис. В onOk модалки это превращается
// в необработанную ошибку, поэтому ошибки валидации (их уже показывает форма) гасим здесь.
export async function validate<T>(form: FormInstance<T>): Promise<T | null> {
  try {
    return await form.validateFields();
  } catch {
    return null;
  }
}
