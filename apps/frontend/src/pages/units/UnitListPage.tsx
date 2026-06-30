import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { unitsService, type UnitOfMeasure } from '../../services/units.service';

export function UnitListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['units', search, status, page],
    queryFn: () => unitsService.list({ search, status, page, limit: 20 }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Unidades de Medida</h1>
        <button
          onClick={() => navigate('/units/new')}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Nova unidade
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          placeholder="Buscar por nome ou símbolo..."
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
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Símbolo</th>
                  <th className="px-4 py-3 text-left">Base</th>
                  <th className="px-4 py-3 text-left">Fator</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.data.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhuma unidade encontrada.</td></tr>
                )}
                {data?.data.map((u: UnitOfMeasure) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{u.symbol}</td>
                    <td className="px-4 py-3 text-gray-600">{u.baseUnit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{u.conversionFactor != null ? u.conversionFactor : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${u.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/units/${u.id}`)} className="text-brand-600 hover:text-brand-800 text-xs">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
