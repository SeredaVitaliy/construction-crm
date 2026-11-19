import type { ReactNode } from 'react';
import { Flex } from 'antd';

export function PageHeader({
  title,
  sub,
  extra,
  back,
}: {
  title: ReactNode;
  sub?: ReactNode;
  extra?: ReactNode;
  back?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      {back && <div style={{ marginBottom: 8 }}>{back}</div>}
      <Flex justify="space-between" align="flex-start" gap={16} wrap>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title">{title}</h1>
          {sub && <div className="page-sub">{sub}</div>}
        </div>
        {extra && (
          <Flex gap={8} wrap>
            {extra}
          </Flex>
        )}
      </Flex>
    </div>
  );
}
