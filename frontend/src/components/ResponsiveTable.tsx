import React from 'react';
import { Table, Card } from 'antd';
import type { TableProps } from 'antd';

interface ResponsiveTableProps<T> extends Omit<TableProps<T>, 'title'> {
  title?: string;
  extra?: React.ReactNode;
  cardProps?: any;
}

function ResponsiveTable<T extends Record<string, any>>({
  title,
  extra,
  cardProps,
  ...tableProps
}: ResponsiveTableProps<T>) {
  const defaultTableProps: TableProps<T> = {
    scroll: { x: 800 },
    pagination: {
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) => 
        `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
      pageSizeOptions: ['10', '20', '50', '100'],
      responsive: true,
    },
    size: 'middle',
    ...tableProps,
  };

  if (title || extra) {
    return (
      <Card title={title} extra={extra} {...cardProps}>
        <Table {...defaultTableProps} />
      </Card>
    );
  }

  return <Table {...defaultTableProps} />;
}

export default ResponsiveTable;