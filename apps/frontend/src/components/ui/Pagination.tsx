export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  showInfo = true,
  className = '',
}: PaginationProps) {
  const buttonBase =
    'px-3 py-1.5 text-sm rounded-lg border border-grafite-200 font-medium transition-colors ' +
    'hover:bg-grafite-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-500 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent';

  return (
    <div className={`flex items-center justify-center gap-3 mt-4 ${className}`}>
      <button
        className={buttonBase}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Página anterior"
      >
        ← Anterior
      </button>

      {showInfo && (
        <span className="text-sm text-grafite-600 select-none">
          Página {page} de {totalPages}
        </span>
      )}

      <button
        className={buttonBase}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Próxima página"
      >
        Próxima →
      </button>
    </div>
  );
}
