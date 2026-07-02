import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MapView, type MapPoint } from '../../components/map/MapView';
import {
  collectionRoutesService,
  type CollectionRoute,
  type RoutePoint,
  type RouteStatus,
  type RouteTeamMember,
} from '../../services/collectionRoutes.service';
import { useAuthStore } from '../../store/auth.store';

const STATUS_LABELS: Record<RouteStatus, string> = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_COLORS: Record<RouteStatus, string> = {
  PLANEJADA: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-yellow-100 text-yellow-700',
  CONCLUIDA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-gray-100 text-gray-500',
};

const MATERIAL_ENTRY_MESSAGES: Record<RouteStatus, string> = {
  PLANEJADA: 'Inicie a rota para registrar entradas de material bruto.',
  EM_ANDAMENTO: 'Registre o material bruto coletado nesta rota.',
  CONCLUIDA: 'Registre ou consulte entradas após a pesagem na cooperativa.',
  CANCELADA: 'Entrada de material bruto indisponível para rota cancelada.',
};

const canManageRoutes = (route: CollectionRoute | undefined, user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(route && user?.permissions.some((p) => p.module === 'COLLECTION_ROUTES' && p.action === 'MANAGE'));

const canExecuteRoutes = (route: CollectionRoute | undefined, user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(
    route &&
      user?.permissions.some(
        (p) =>
          p.module === 'COLLECTION_ROUTES' &&
          (p.action === 'EXECUTE' || p.action === 'MANAGE'),
      ),
  );

const getErrorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? fallback;

export function CollectionRouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [cancelReason, setCancelReason] = useState('');
  const [confirmInProgress, setConfirmInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: route, isLoading } = useQuery<CollectionRoute>({
    queryKey: ['collection-route', id],
    queryFn: () => collectionRoutesService.getById(id!),
    enabled: Boolean(id),
  });

  const refreshRoute = (updated: CollectionRoute) => {
    qc.setQueryData(['collection-route', id], updated);
    qc.invalidateQueries({ queryKey: ['collection-routes'] });
    setError(null);
  };

  const startMut = useMutation({
    mutationFn: () => collectionRoutesService.start(id!),
    onSuccess: refreshRoute,
    onError: (err) => setError(getErrorMessage(err, 'Erro ao iniciar rota')),
  });

  const completeMut = useMutation({
    mutationFn: () => collectionRoutesService.complete(id!),
    onSuccess: refreshRoute,
    onError: (err) => setError(getErrorMessage(err, 'Erro ao concluir rota')),
  });

  const duplicateMut = useMutation({
    mutationFn: () => collectionRoutesService.duplicate(id!),
    onSuccess: (res) => navigate('/collection-routes/new', { state: { draft: res.draft } }),
    onError: (err) => setError(getErrorMessage(err, 'Erro ao duplicar rota')),
  });

  const cancelMut = useMutation({
    mutationFn: () =>
      collectionRoutesService.cancelWithConfirm(id!, cancelReason.trim(), confirmInProgress || undefined),
    onSuccess: (updated) => {
      refreshRoute(updated);
      setCancelReason('');
      setConfirmInProgress(false);
    },
    onError: (err) => setError(getErrorMessage(err, 'Erro ao cancelar rota')),
  });

  const mapPoints: MapPoint[] =
    (route?.routePoints ?? [])
      .filter((rp: RoutePoint) => !rp.collectionPoint.locationPending && rp.collectionPoint.latitude != null)
      .map((rp: RoutePoint, idx: number) => ({
        id: rp.collectionPoint.id,
        lat: rp.collectionPoint.latitude!,
        lng: rp.collectionPoint.longitude!,
        label: rp.collectionPoint.name,
        sequenceNumber: idx + 1,
      })) ?? [];

  const isMutating = startMut.isPending || completeMut.isPending || cancelMut.isPending;
  const showStart = route?.status === 'PLANEJADA' && canExecuteRoutes(route, user);
  const showComplete = route?.status === 'EM_ANDAMENTO' && canExecuteRoutes(route, user);
  const showCancel =
    (route?.status === 'PLANEJADA' || route?.status === 'EM_ANDAMENTO') && canManageRoutes(route, user);

  if (isLoading) {
    return <div className="text-sm text-gray-400">Carregando rota...</div>;
  }

  if (!route) {
    return <div className="text-sm text-gray-400">Rota não encontrada.</div>;
  }

  const canAccessMaterialEntries = route.status === 'EM_ANDAMENTO' || route.status === 'CONCLUIDA';

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/collection-routes')}
            className="mb-2 text-sm text-gray-400 hover:text-gray-600"
          >
            ← Rotas de Coleta
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{route.name}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[route.status as RouteStatus]}`}>
              {STATUS_LABELS[route.status as RouteStatus]}
            </span>
            {(route as CollectionRoute & { isException?: boolean }).isException && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                Exceção
              </span>
            )}
            {(route as CollectionRoute & { templateId?: string | null; template?: { name: string } | null }).template?.name && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-petroleo-50 text-petroleo-700 border border-petroleo-200">
                Modelo: {(route as CollectionRoute & { template?: { name: string } | null }).template!.name}
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {route.status === 'PLANEJADA' && canManageRoutes(route, user) && (
            <button
              onClick={() => navigate(`/collection-routes/${route.id}/edit`)}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Editar planejamento
            </button>
          )}
          {canManageRoutes(route, user) && (
            <button
              onClick={() => duplicateMut.mutate()}
              disabled={duplicateMut.isPending}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Duplicar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-gray-700">Execução</h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="block text-xs text-gray-500">Data planejada</span>
              <span className="font-medium text-gray-800">
                {new Date(route.plannedDate).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Veículo</span>
              <span className="font-medium text-gray-800">
                {route.vehicle?.plate} — {route.vehicle?.model}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Motorista</span>
              <span className="font-medium text-gray-800">{route.driver?.email}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Versão</span>
              <span className="font-medium text-gray-800">{route.version}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Início real</span>
              <span className="font-medium text-gray-800">
                {route.startedAt ? new Date(route.startedAt).toLocaleString('pt-BR') : '—'}
              </span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Conclusão real</span>
              <span className="font-medium text-gray-800">
                {route.completedAt ? new Date(route.completedAt).toLocaleString('pt-BR') : '—'}
              </span>
            </div>
          </div>

          {route.cancelReason && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
              <span className="font-medium">Motivo do cancelamento:</span> {route.cancelReason}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            {showStart && (
              <button
                onClick={() => startMut.mutate()}
                disabled={isMutating}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                Iniciar rota
              </button>
            )}
            {showComplete && (
              <button
                onClick={() => completeMut.mutate()}
                disabled={isMutating}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Concluir rota
              </button>
            )}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Cancelar rota</h2>
          {showCancel ? (
            <div className="space-y-3">
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                className="w-full rounded-lg border px-3 py-2 text-sm"
                placeholder="Justificativa obrigatória"
              />
              {route.status === 'EM_ANDAMENTO' && (
                <label className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmInProgress}
                    onChange={(e) => setConfirmInProgress(e.target.checked)}
                    className="rounded"
                  />
                  Confirmo que desejo cancelar uma rota em andamento
                </label>
              )}
              <button
                onClick={() => cancelMut.mutate()}
                disabled={
                  isMutating ||
                  cancelReason.trim().length === 0 ||
                  (route.status === 'EM_ANDAMENTO' && !confirmInProgress)
                }
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Cancelar rota
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Cancelamento indisponível neste status ou perfil.</p>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-700">Pontos da rota</h2>
        {route.routePoints.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum ponto associado.</p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <ol className="space-y-2">
              {route.routePoints.map((rp: RoutePoint, idx: number) => (
                <li key={rp.id} className="flex gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-800">{rp.collectionPoint.name}</p>
                    <p className="text-xs text-gray-500">{rp.collectionPoint.address}</p>
                    {rp.collectionPoint.locationPending && (
                      <span className="text-xs text-yellow-600">Localização pendente</span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {mapPoints.length > 0 && <MapView points={mapPoints} height="320px" />}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Equipe</h2>
        {route.teamMembers.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum membro auxiliar registrado.</p>
        ) : (
          <ul className="space-y-1 text-sm text-gray-700">
            {route.teamMembers.map((member: RouteTeamMember) => (
              <li key={member.userId}>{member.email ?? member.user?.email ?? member.userId}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Material bruto</h2>
            <p className="mt-1 text-sm text-gray-500">{MATERIAL_ENTRY_MESSAGES[route.status as RouteStatus]}</p>
          </div>
          <button
            onClick={() => navigate(`/collection-routes/${route.id}/material-entries`)}
            disabled={!canAccessMaterialEntries}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
          >
            Acessar entradas
          </button>
        </div>
      </div>
    </div>
  );
}
