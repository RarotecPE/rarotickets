import type { ReactNode } from 'react';
import { LoadingBlock } from './feedback.component';

export type DataTableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  /** Coluna destacada no cartão mobile. */
  primary?: boolean;
  align?: 'left' | 'right';
  hideOnMobile?: boolean;
};

export type DataTableProps<Row> = {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: Row) => void;
};

/**
 * Tabela responsiva: cartões empilhados no mobile e tabela a partir de `md`.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  onRowClick,
}: DataTableProps<Row>) {
  if (isLoading) return <LoadingBlock />;
  if (rows.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-app-border px-4 py-8 text-center">
        <p className="text-[14px] font-medium">{emptyTitle}</p>
        {emptyDescription && <p className="mt-1 text-[13px] text-app-muted">{emptyDescription}</p>}
      </div>
    );
  }

  const primaryColumn = columns.find((column) => column.primary) ?? columns[0];
  const secondaryColumns = columns.filter((column) => column !== primaryColumn);

  return (
    <>
      <ul className="space-y-2 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)}>
            <button
              type="button"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`w-full rounded-[12px] border border-app-border bg-app-surface px-3 py-3 text-left ${onRowClick ? 'hover:border-app-primary/50' : 'cursor-default'}`}
            >
              <div className="text-[14px] font-medium">{primaryColumn?.render(row)}</div>
              <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                {secondaryColumns
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-[11px] uppercase tracking-wide text-app-muted">{column.header}</dt>
                      <dd className="truncate text-[13px]">{column.render(row)}</dd>
                    </div>
                  ))}
              </dl>
            </button>
          </li>
        ))}
      </ul>

      <div className="app-scroll-x hidden md:block">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-app-border text-[12px] uppercase tracking-wide text-app-muted">
              {columns.map((column) => (
                <th key={column.key} className={`px-3 py-2 font-medium ${column.align === 'right' ? 'text-right' : ''}`}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-app-border/60 ${onRowClick ? 'cursor-pointer hover:bg-app-surface-elevated' : ''}`}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-3 py-2.5 ${column.align === 'right' ? 'text-right' : ''}`}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
