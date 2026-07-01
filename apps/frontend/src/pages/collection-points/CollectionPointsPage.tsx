import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapView, type MapPoint } from '../../components/map/MapView';
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  LoadingState,
  PageHeader,
  Pagination,
} from '../../components/ui';
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

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <PageHeader
        title="Pontos de Coleta"
        subtitle="Gerencie os pontos de coleta da cooperativa"
        actions={
          <Button onClick={() => navigate('/collection-points/new')}>
            Novo ponto
          </Button>
        }
      />

      {mapPoints.length > 0 && (
        <div className="mb-6">
          <MapView points={mapPoints} height="280px" />
        </div>
      )}

      <FilterBar>
        <input
          className="border border-grafite-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-0 focus:outline-none focus:ring-2 focus:ring-petroleo-500 focus:border-petroleo-500"
          placeholder="Buscar por nome ou endereço..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </FilterBar>

      {isLoading ? (
        <LoadingState variant="skeleton" rows={8} />
      ) : !data?.data.length ? (
        <EmptyState
          title={search ? 'Nenhum resultado encontrado' : 'Nenhum ponto de coleta cadastrado'}
          description={
            search
              ? `Nenhum ponto encontrado para "${search}".`
              : 'Cadastre o primeiro ponto de coleta da cooperativa.'
          }
          action={
            !search ? (
              <Button onClick={() => navigate('/collection-points/new')}>Novo ponto</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-grafite-50 text-grafite-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Nome</th>
                  <th className="px-4 py-3 text-left">Endereço</th>
                  <th className="px-4 py-3 text-left">Localização</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-grafite-100">
                {data.data.map((p: CollectionPoint) => (
                  <tr key={p.id} className="hover:bg-grafite-50">
                    <td className="px-4 py-3 font-medium text-grafite-800">{p.name}</td>
                    <td className="px-4 py-3 text-grafite-600 max-w-xs truncate">{p.address}</td>
                    <td className="px-4 py-3">
                      {p.locationPending ? (
                        <Badge variant="pending" label="Localização pendente" />
                      ) : (
                        <Badge variant="completed" label="Geocodificado" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={p.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/collection-points/${p.id}`)}
                        className="mr-1"
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMut.mutate({ id: p.id, isActive: !p.isActive })}
                      >
                        {p.isActive ? 'Inativar' : 'Ativar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.total > data.limit && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
