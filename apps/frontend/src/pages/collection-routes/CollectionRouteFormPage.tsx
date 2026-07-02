import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { MapView, type MapPoint } from '../../components/map/MapView';
import { collectionPointsService } from '../../services/collectionPoints.service';
import {
  collectionRoutesService,
  type CollectionRoute,
  type RoutePoint,
} from '../../services/collectionRoutes.service';
import { vehiclesService, type Vehicle } from '../../services/vehicles.service';
import type { CollectionPoint } from '../../services/collectionPoints.service';
import { api } from '../../services/api.client';

interface UserOption {
  id: string;
  email: string;
  profile: { type: string };
}

interface RouteDraft {
  name: string;
  driverId: string;
  vehicleId: string;
  notes: string | null;
  points: Array<{ collectionPointId: string; sequence: number }>;
}

export function CollectionRouteFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const draft = (location.state as { draft?: RouteDraft } | null)?.draft;
  const qc = useQueryClient();
  const isEdit = Boolean(id) && id !== 'new';

  const [name, setName] = useState(draft?.name ?? '');
  const [plannedDate, setPlannedDate] = useState('');
  const [vehicleId, setVehicleId] = useState(draft?.vehicleId ?? '');
  const [driverId, setDriverId] = useState(draft?.driverId ?? '');
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [suggestWarning, setSuggestWarning] = useState<string | null>(null);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>(
    draft?.points?.map((p) => ({
      id: p.collectionPointId,
      sequence: p.sequence,
      notes: null,
      collectionPoint: {
        id: p.collectionPointId,
        name: p.collectionPointId,
        address: '',
        latitude: null,
        longitude: null,
        locationPending: false,
        isActive: true,
      },
    })) ?? [],
  );

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles-active'],
    queryFn: () => vehiclesService.list({ status: 'active', limit: 200 }),
  });

  const { data: usersData } = useQuery({
    queryKey: ['users-drivers'],
    queryFn: () =>
      api.get<UserOption[]>('/users').then((r) =>
        (r.data as UserOption[]).filter((u) => u.profile?.type === 'DRIVER'),
      ),
  });

  const { data: pointsData } = useQuery({
    queryKey: ['collection-points-active'],
    queryFn: () => collectionPointsService.list({ status: 'active', limit: 200 }),
  });

  const { data: existingRoute } = useQuery<CollectionRoute>({
    queryKey: ['collection-route', id],
    queryFn: () => collectionRoutesService.getById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingRoute) {
      setName(existingRoute.name);
      setPlannedDate(existingRoute.plannedDate?.slice(0, 10) ?? '');
      setVehicleId(existingRoute.vehicle?.id ?? '');
      setDriverId(existingRoute.driver?.id ?? '');
      setNotes(existingRoute.notes ?? '');
      setRoutePoints(existingRoute.routePoints ?? []);
    }
  }, [existingRoute]);

  const createMut = useMutation({
    mutationFn: () =>
      collectionRoutesService.create({
        name,
        plannedDate,
        vehicleId,
        driverId,
        notes: notes || undefined,
        pointIds: routePoints.map((rp) => rp.collectionPoint.id),
      }),
    onSuccess: (route: CollectionRoute) => {
      qc.invalidateQueries({ queryKey: ['collection-routes'] });
      navigate(`/collection-routes/${route.id}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string; code?: string } } };
      setError(e?.response?.data?.message ?? 'Erro ao criar rota');
    },
  });

  const updateMut = useMutation({
    mutationFn: () =>
      collectionRoutesService.update(id!, {
        name,
        plannedDate,
        vehicleId,
        driverId,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['collection-routes'] });
      qc.invalidateQueries({ queryKey: ['collection-route', id] });
      navigate(`/collection-routes/${id}`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? 'Erro ao atualizar rota');
    },
  });

  const addPointMut = useMutation({
    mutationFn: (cpId: string) =>
      isEdit
        ? collectionRoutesService.addPoint(id!, { collectionPointId: cpId })
        : Promise.resolve(null),
    onSuccess: (updated) => {
      if (updated) {
        setRoutePoints(updated.routePoints ?? []);
        qc.invalidateQueries({ queryKey: ['collection-route', id] });
      }
    },
  });

  const removePointMut = useMutation({
    mutationFn: (cpId: string) =>
      isEdit
        ? collectionRoutesService.removePoint(id!, cpId)
        : Promise.resolve(null),
    onSuccess: (updated) => {
      if (updated) {
        setRoutePoints(updated.routePoints ?? []);
        qc.invalidateQueries({ queryKey: ['collection-route', id] });
      }
    },
  });

  const suggestMut = useMutation({
    mutationFn: () => collectionRoutesService.suggestSequence(id!),
    onSuccess: (result) => {
      if (result.warning) setSuggestWarning(result.warning);
      const ordered = result.suggestedOrder
        .map((cpId) => routePoints.find((rp) => rp.collectionPoint.id === cpId))
        .filter(Boolean) as RoutePoint[];
      const excluded = routePoints.filter(
        (rp) => !result.suggestedOrder.includes(rp.collectionPoint.id),
      );
      setRoutePoints([...ordered, ...excluded]);
    },
  });

  const handleAddPoint = (cpId: string) => {
    if (routePoints.some((rp) => rp.collectionPoint.id === cpId)) return;
    if (isEdit) {
      addPointMut.mutate(cpId);
    } else {
      const cp = pointsData?.data.find((p: CollectionPoint) => p.id === cpId);
      if (!cp) return;
      setRoutePoints((prev) => [
        ...prev,
        {
          id: cpId,
          sequence: prev.length + 1,
          notes: null,
          collectionPoint: {
            id: cp.id,
            name: cp.name,
            address: cp.address,
            latitude: cp.latitude,
            longitude: cp.longitude,
            locationPending: cp.locationPending,
            isActive: cp.isActive,
          },
        },
      ]);
    }
  };

  const handleRemovePoint = (cpId: string) => {
    if (isEdit) {
      removePointMut.mutate(cpId);
    } else {
      setRoutePoints((prev) => prev.filter((rp) => rp.collectionPoint.id !== cpId));
    }
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    setRoutePoints((prev) => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const handleMoveDown = (idx: number) => {
    setRoutePoints((prev) => {
      if (idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const mapPoints: MapPoint[] = routePoints
    .filter((rp) => !rp.collectionPoint.locationPending && rp.collectionPoint.latitude != null)
    .map((rp, idx) => ({
      id: rp.collectionPoint.id,
      lat: rp.collectionPoint.latitude!,
      lng: rp.collectionPoint.longitude!,
      label: rp.collectionPoint.name,
      sequenceNumber: idx + 1,
    }));

  const usedPointIds = new Set(routePoints.map((rp) => rp.collectionPoint.id));
  const availablePoints = (pointsData?.data ?? []).filter((p: CollectionPoint) => !usedPointIds.has(p.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (isEdit) {
      updateMut.mutate();
    } else {
      createMut.mutate();
    }
  };

  const routeStatus = existingRoute?.status;
  const isFinished = isEdit && (routeStatus === 'CONCLUIDA' || routeStatus === 'CANCELADA');
  const isEmAndamento = isEdit && routeStatus === 'EM_ANDAMENTO';
  const isStructuralEditable = !isEdit || routeStatus === 'PLANEJADA';
  const isNonStructuralEditable = !isFinished;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/collection-routes')} className="text-gray-400 hover:text-gray-600 text-sm">
          ← Rotas de Coleta
        </button>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-800">
          {isEdit ? 'Editar Rota' : 'Nova Rota'}
        </h1>
      </div>

      {isFinished && (
        <div className="mb-4 p-3 bg-grafite-50 text-grafite-600 text-sm rounded-lg border border-grafite-200">
          Rota {routeStatus === 'CONCLUIDA' ? 'concluída' : 'cancelada'} — todos os campos estão bloqueados.
        </div>
      )}
      {isEmAndamento && (
        <div className="mb-4 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
          Rota em andamento — motorista, veículo e pontos de coleta não podem ser alterados.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-gray-700 text-sm">Dados da rota</h2>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!isNonStructuralEditable}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Data planejada *</label>
            <input
              type="date"
              className="border rounded-lg px-3 py-2 text-sm"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              required
              disabled={!isStructuralEditable}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Veículo *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                required
                disabled={!isStructuralEditable}
              >
                <option value="">Selecionar...</option>
                {(vehiclesData?.data ?? []).map((v: Vehicle) => (
                  <option key={v.id} value={v.id}>
                    {v.plate} — {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Motorista *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required
                disabled={!isStructuralEditable}
              >
                <option value="">Selecionar...</option>
                {(usersData ?? []).map((u: UserOption) => (
                  <option key={u.id} value={u.id}>
                    {u.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isNonStructuralEditable}
            />
          </div>
        </div>

        {/* Pontos de coleta */}
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">Pontos de coleta</h2>
            {isEdit && isStructuralEditable && (
              <button
                type="button"
                onClick={() => { setSuggestWarning(null); suggestMut.mutate(); }}
                disabled={suggestMut.isPending || routePoints.length < 2}
                className="text-xs text-brand-600 border border-brand-300 px-3 py-1 rounded hover:bg-brand-50 disabled:opacity-40"
              >
                Sugerir sequência
              </button>
            )}
          </div>

          {suggestWarning && (
            <div className="text-xs text-yellow-700 bg-yellow-50 rounded p-2 border border-yellow-200">
              {suggestWarning}
            </div>
          )}

          {isStructuralEditable && (
            <div className="flex gap-2">
              <select
                className="flex-1 border rounded-lg px-3 py-2 text-sm"
                defaultValue=""
                onChange={(e) => { if (e.target.value) { handleAddPoint(e.target.value); e.target.value = ''; } }}
              >
                <option value="">Adicionar ponto...</option>
                {availablePoints.map((p: CollectionPoint) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.address}
                  </option>
                ))}
              </select>
            </div>
          )}

          {routePoints.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum ponto adicionado.</p>
          ) : (
            <ul className="space-y-2">
              {routePoints.map((rp, idx) => (
                <li
                  key={rp.collectionPoint.id}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 text-sm"
                >
                  <span className="w-6 h-6 flex items-center justify-center bg-brand-600 text-white text-xs font-bold rounded-full shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{rp.collectionPoint.name}</p>
                    <p className="text-xs text-gray-500 truncate">{rp.collectionPoint.address}</p>
                    {rp.collectionPoint.locationPending && (
                      <span className="text-xs text-yellow-600">Localização pendente</span>
                    )}
                  </div>
                  {isStructuralEditable && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === routePoints.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs px-1"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemovePoint(rp.collectionPoint.id)}
                        className="text-red-400 hover:text-red-600 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {mapPoints.length > 0 && (
            <div className="mt-2">
              <MapView points={mapPoints} height="280px" />
            </div>
          )}
        </div>

        {!isFinished && (
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={createMut.isPending || updateMut.isPending}
              className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {isEdit ? 'Salvar alterações' : 'Criar rota'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/collection-routes')}
              className="px-5 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
