import { ConfigProvider } from 'antd';
import ruRU from 'antd/locale/ru_RU';

// Точка входа. Роутинг и страницы — по шагам из docs/FRONTEND_PLAN.md
export function App() {
  return (
    <ConfigProvider locale={ruRU}>
      <div style={{ padding: 24 }}>Каркас готов. Дальше — шаг 1 из docs/FRONTEND_PLAN.md</div>
    </ConfigProvider>
  );
}
