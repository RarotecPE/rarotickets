export type PaginationProps = {
  page: number;
  perPage: number;
  total: number;
  onChange: (page: number) => void;
};

export function Pagination({ page, perPage, total, onChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (total === 0) return null;

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 pt-1" aria-label="Paginação">
      <p className="text-[12px] text-app-muted">
        Página {page} de {totalPages} · {total} registro{total === 1 ? '' : 's'}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="h-9 rounded-[8px] border border-app-border px-3 text-[13px] disabled:opacity-40"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          Anterior
        </button>
        <button
          type="button"
          className="h-9 rounded-[8px] border border-app-border px-3 text-[13px] disabled:opacity-40"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          Próxima
        </button>
      </div>
    </nav>
  );
}
