import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialCategoriesService, type MaterialCategory } from '../../services/materialCategories.service';

export function MaterialCategoryListPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [deactivateError, setDeactivateError] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['material-categories', search, status, page],
    queryFn: () => materialCategoriesService.list({ search, status, page, limit: 20 }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      materialCategoriesService.update(id, { isActive }),
    onSuccess: (_, { id }) => {
      setDeactivateError((prev) => { const n = { ...prev }; delete n[id]; return n; });
      qc.invalidateQueries({ queryKey: ['material-categories'] });
    },
    onError: (e: { response?: { data?: { message?: string; details?: string[] } } }, { id }) => {
      const details = e.response?.data?.details?.join(', ');
      const msg = details ? `Subcategorias ativas: ${details}` : (e.response?.data?.message ?? 'Erro');
      setDeactivateError((prev) => ({ ...prev, [id]: msg }));
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categorias de Material</h1>
        <button
          onClick={() => navigate('/material-categories/new')}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Nova categoria
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}
        >
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
          <option value="all">Todas</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm divide-y">
            {data?.data.length === 0 && <p className="p-4 text-sm text-gray-500">Nenhuma categoria encontrada.</p>}
            {data?.data.map((cat: MaterialCategory) => (
              <div key={cat.id}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{cat.name}</span>
                    {cat.description && <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded ${cat.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {cat.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                    <button onClick={() => navigate(`/material-categories/${cat.id}`)} className="text-brand-600 hover:text-brand-800 text-xs">
                      Editar
                    </button>
                    <button
                      onClick={() => toggleMut.mutate({ id: cat.id, isActive: !cat.isActive })}
                      className="text-gray-500 hover:text-gray-700 text-xs underline"
                    >
                      {cat.isActive ? 'Inativar' : 'Ativar'}
                    </button>
                  </div>
                </div>
                {deactivateError[cat.id] && (
                  <p className="text-red-600 text-xs px-4 pb-2">{deactivateError[cat.id]}</p>
                )}
              </div>
            ))}
          </div>

          {data && data.total > data.limit && (
            <div className="flex justify-center gap-2 mt-4">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="text-sm px-3 py-1 border rounded disabled:opacity-40">Anterior</button>
              <span className="text-sm text-gray-600 px-2 py-1">{page} / {Math.ceil(data.total / data.limit)}</span>
              <button disabled={page >= Math.ceil(data.total / data.limit)} onClick={() => setPage((p) => p + 1)} className="text-sm px-3 py-1 border rounded disabled:opacity-40">Próxima</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
