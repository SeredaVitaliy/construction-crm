import { Button, Flex, Popconfirm, Table } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { ExpenseItem } from '@/api/expenses';
import { EXPENSE_CATEGORIES, EXPENSE_HEX, EXPENSE_LABEL } from '@/api/statuses';
import { formatDate, formatMoney, formatMoneyShort } from '@/lib/format';

export function ExpensesPanel({
  expenses,
  loading,
  showObject,
  onEdit,
  onDelete,
}: {
  expenses: ExpenseItem[];
  loading: boolean;
  showObject?: boolean;
  onEdit: (e: ExpenseItem) => void;
  onDelete: (id: string) => void;
}) {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return (
    <>
      {expenses.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', height: 12, borderRadius: 3, overflow: 'hidden' }}>
            {EXPENSE_CATEGORIES.map((c) => {
              const sum = expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
              return sum ? (
                <span key={c} style={{ flex: sum, background: EXPENSE_HEX[c] }} title={EXPENSE_LABEL[c]} />
              ) : null;
            })}
          </div>
          <Flex gap={20} wrap style={{ marginTop: 10, fontSize: 13 }}>
            {EXPENSE_CATEGORIES.map((c) => {
              const sum = expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0);
              if (!sum) return null;
              return (
                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: EXPENSE_HEX[c] }} />
                  {EXPENSE_LABEL[c]}
                  <span className="muted num">
                    {formatMoneyShort(sum)} · {Math.round((sum / total) * 100)}%
                  </span>
                </span>
              );
            })}
          </Flex>
        </div>
      )}
      <Table<ExpenseItem>
        rowKey="id"
        size="middle"
        loading={loading}
        dataSource={expenses}
        pagination={expenses.length > 15 ? { pageSize: 15, showSizeChanger: false } : false}
        locale={{ emptyText: 'Расходов пока нет' }}
        scroll={{ x: 640 }}
        summary={() =>
          expenses.length > 0 && (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={showObject ? 4 : 3}>
                <strong>Итого</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">
                <strong className="num">{formatMoney(total)}</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
          )
        }
        columns={[
          { title: 'Дата', dataIndex: 'spent_on', width: 130, render: (d) => formatDate(d) },
          ...(showObject
            ? [
                {
                  title: 'Объект',
                  key: 'object',
                  render: (_: unknown, e: ExpenseItem) =>
                    e.object ? <Link to={`/objects/${e.object.id}?tab=finance`}>{e.object.name}</Link> : '—',
                },
              ]
            : []),
          {
            title: 'Статья',
            dataIndex: 'category',
            width: 140,
            render: (c: ExpenseItem['category']) => (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: EXPENSE_HEX[c] }} />
                {EXPENSE_LABEL[c]}
              </span>
            ),
          },
          { title: 'За что', dataIndex: 'description', render: (d) => d || <span className="muted">—</span> },
          {
            title: 'Сумма',
            dataIndex: 'amount',
            width: 160,
            align: 'right',
            render: (a: number) => <span className="num">{formatMoney(a)}</span>,
          },
          {
            key: 'actions',
            width: 90,
            render: (_: unknown, e) => (
              <Flex gap={4}>
                <Button
                  size="small"
                  type="text"
                  icon={<EditOutlined />}
                  aria-label="Изменить расход"
                  onClick={() => onEdit(e)}
                />
                <Popconfirm
                  title="Удалить расход?"
                  okText="Удалить"
                  cancelText="Отмена"
                  onConfirm={() => onDelete(e.id)}
                >
                  <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Удалить расход" />
                </Popconfirm>
              </Flex>
            ),
          },
        ]}
      />
    </>
  );
}
