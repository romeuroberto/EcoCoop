import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapView, type MapPoint } from '../../components/map/MapView';
import { collectionPointsService, type CollectionPoint } from '../../services/collectionPoints.service';

export function CollectionPointsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['collection-points', search, status, page],
    queryFn: () => collectionPointsService.list({ search, status, page, limit: 20 }),
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      collectionPointsService.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['collection-points'] }),
  });

  const mapPoints: MapPoint[] = (data?.data ?? [])
    .filter((p: CollectionPoint) => !p.locationPending && p.latitude != null && p.longitude != null)
    .map((p: CollectionPoint) => ({ id: p.id, lat: p.latitude!, lng: p.longitude!, label: p.name }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pontos de Coleta</h1>
        <button
          onClick={() => navigate('/collection-points/new')}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Novo ponto
        </button>
      </div>

      {mapPoints.length > 0 && (
        <div className="mb-6">
          <MapView points={mapPoints} height="280px" />
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          placeholder="Buscar por nome ou endereço..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}
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
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Endereço</th>
                  <th className="px-4 py-3 text-left">Localização</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.data.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nenhum ponto de coleta encontrado.
                    </td>
                  </tr>
                )}
                {data?.data.map((p: CollectionPoint) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{p.address}</td>
                    <td className="px-4 py-3">
                      {p.locationPending ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 border border-yellow-200">
                          Localização pendente
                        </span>
                      ) : (
                        <span className="text-xs text-green-700">✓ Geocodificado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded ${p.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {p.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/collection-points/${p.id}`)}
                        className="text-brand-600 hover:text-brand-800 text-xs mr-3"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}
                        className="text-gray-500 hover:text-gray-700 text-xs underline"
                      >
                        {p.isActive ? 'Inativar' : 'Ativar'}
                      </button>
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
