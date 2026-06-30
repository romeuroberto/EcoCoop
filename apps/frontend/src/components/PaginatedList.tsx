import { useEffect, useRef, useState } from 'react';

interface PaginatedListProps {
  search: string;
  onSearchChange: (v: string) => void;
  status: 'active' | 'inactive' | 'all';
  onStatusChange: (v: 'active' | 'inactive' | 'all') => void;
  page: number;
  onPageChange: (p: number) => void;
  total: number;
  limit: number;
  isLoading: boolean;
  children: React.ReactNode;
  searchPlaceholder?: string;
}

export function PaginatedList({
  search,
  onSearchChange,
  status,
  onStatusChange,
  page,
  onPageChange,
  total,
  limit,
  isLoading,
  children,
  searchPlaceholder = 'Buscar...',
}: PaginatedListProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
        onPageChange(1);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [localSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          placeholder={searchPlaceholder}
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { onStatusChange(e.target.value as typeof status); onPageChange(1); }}
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <>
          {children}

          {total > limit && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={page === 1}
                onClick={() => onPageChange(page - 1)}
                className="text-sm px-3 py-1 border rounded disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600 px-2 py-1">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="text-sm px-3 py-1 border rounded disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
