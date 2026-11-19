import { Alert, Button } from 'antd';

export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert
      type="error"
      showIcon
      title="Не удалось загрузить данные"
      description={message}
      action={
        onRetry && (
          <Button size="small" onClick={onRetry}>
            Повторить
          </Button>
        )
      }
    />
  );
}
