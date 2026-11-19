import { Button, Result } from 'antd';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Result
      status="404"
      title="Такой страницы нет"
      subTitle="Проверьте адрес или вернитесь к сводке."
      extra={
        <Link to="/">
          <Button type="primary">К сводке</Button>
        </Link>
      }
    />
  );
}
