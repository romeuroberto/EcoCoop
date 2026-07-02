import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/ui';
import { vehiclesService } from '../../services/vehicles.service';
import { api } from '../../services/api.client';
import {
  routeTemplatesService,
  type TemplateDraft,
  type TemplatePoint,
} from '../../services/routeTemplates.service';
import { collectionPointsService } from '../../services/collectionPoints.service';

interface UserOption {
  id: string;
  email: string;
  profile: { type: string };
}

interface PointSelection {
  collectionPointId: string;
  name: string;
  sequence: number;
}

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function RouteTemplateFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const draft = (location.state as { draft?: TemplateDraft } | null)?.draft;
  const qc = useQueryClient();
  const isEdit = Boolean(id) && id !== 'new';

  const [name, setName] = useState(draft?.name ?? '');
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(draft?.recurrenceDays ?? []);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [driverId, setDriverId] = useState(draft?.driverId ?? '');
  const [vehicleId, setVehicleId] = useState(draft?.vehicleId ?? '');
  const [notes, setNotes] = useState(draft?.notes ?? '');
  const [points, setPoints] = useState<PointSelection[]>(
    draft?.points?.map((p, i) => ({
      collectionPointId: p.collectionPointId,
      name: '',
      sequence: p.sequence ?? i + 1,
    })) ?? [],
  );
  const [propagate, setPropagate] = useState(false);
  const [overwriteExceptions, setOverwriteExceptions] = useState(false);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

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

  const { data: cpData } = useQuery({
    queryKey: ['collection-points-active'],
    queryFn: () => collectionPointsService.list({ status: 'active', limit: 200 }),
  });

  const { data: existing } = useQuery({
    queryKey: ['route-template', id],
    queryFn: () => routeTemplatesService.getById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setRecurrenceDays(existing.recurrenceDays as number[]);
      setStartDate(existing.startDate?.slice(0, 10) ?? '');
      setEndDate(existing.endDate?.slice(0, 10) ?? '');
      setDriverId(existing.driver?.id ?? '');
      setVehicleId(existing.vehicle?.id ?? '');
      setNotes(existing.notes ?? '');
      setVersion(existing.version);
      setPoints(
        (existing.templatePoints ?? []).map((tp: TemplatePoint) => ({
          collectionPointId: tp.collectionPoint.id,
          name: tp.collectionPoint.name,
          sequence: tp.sequence,
        })),
      );
    }
  }, [existing]);

  // Fill point names from cpData
  useEffect(() => {
    if (cpData?.data && points.length > 0) {
      setPoints((prev) =>
        prev.map((p) => ({
          ...p,
          name: cpData.data.find((cp: { id: string; name: string }) => cp.id === p.collectionPointId)?.name ?? p.name,
        })),
      );
    }
  }, [cpData]);

  const toggleDay = (d: number) =>
    setRecurrenceDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort((a, b) => a - b),
    );

  const addPoint = (cpId: string) => {
    if (points.some((p) => p.collectionPointId === cpId)) return;
    const cp = cpData?.data.find((c: { id: string; name: string }) => c.id === cpId);
    setPoints((prev) => [...prev, { collectionPointId: cpId, name: cp?.name ?? '', sequence: prev.length + 1 }]);
  };

  const removePoint = (cpId: string) =>
    setPoints((prev) =>
      prev
        .filter((p) => p.collectionPointId !== cpId)
        .map((p, i) => ({ ...p, sequence: i + 1 })),
    );

  const createMut = useMutation({
    mutationFn: () =>
      routeTemplatesService.create({
        name,
        recurrenceDays,
        startDate,
        endDate: endDate || undefined,
        driverId,
        vehicleId,
        points: points.map((p) => ({ collectionPointId: p.collectionPointId, sequence: p.sequence })),
        notes: notes || undefined,
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['route-templates'] });
      navigate(`/route-templates/${res.template.id}`);
    },
    onError: (e: Error & { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao criar modelo');
    },
  });

  const updateMut = useMutation({
    mutationFn: () =>
      routeTemplatesService.update(id!, {
        name,
        recurrenceDays,
        startDate,
        endDate: endDate || null,
        driverId,
        vehicleId,
        points: points.map((p) => ({ collectionPointId: p.collectionPointId, sequence: p.sequence })),
        notes: notes || undefined,
        version,
        propagate,
        overwriteExceptions,
      }),
    onSuccess: (res) => {
      void qc.invalidateQueries({ queryKey: ['route-templates'] });
      void qc.invalidateQueries({ queryKey: ['route-template', id] });
      navigate(`/route-templates/${id}`, { state: { propagation: res.propagation } });
    },
    onError: (e: Error & { response?: { data?: { message?: string; code?: string } } }) => {
      if (e.response?.data?.code === 'CONCURRENT_MODIFICATION') {
        setError('Conflito de modificação simultânea. Recarregue a página e tente novamente.');
      } else {
        setError(e.response?.data?.message ?? 'Erro ao atualizar modelo');
      }
    },
  });

  const isPending = createMut.isPending || updateMut.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (recurrenceDays.length === 0) { setError('Selecione ao menos um dia da semana'); return; }
    if (!startDate) { setError('Data de início é obrigatória'); return; }
    if (points.length === 0) { setError('Adicione ao menos um ponto de coleta'); return; }
    if (isEdit) updateMut.mutate();
    else createMut.mutate();
  };

  const fieldClass = 'w-full border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500 focus:border-petroleo-500';

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          className="text-grafite-500 hover:text-grafite-700 text-sm"
          onClick={() => navigate(isEdit ? `/route-templates/${id}` : '/route-templates')}
        >
          ← Voltar
        </button>
        <h1 className="text-xl font-semibold text-grafite-800">
          {isEdit ? 'Editar Modelo de Rota' : 'Novo Modelo de Rota'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-grafite-700 mb-1">Nome *</label>
          <input className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-grafite-700 mb-2">Dias da semana *</label>
          <div className="flex flex-wrap gap-2">
            {DAY_LABELS.map((label, d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(d)}
                className={[
                  'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
                  recurrenceDays.includes(d)
                    ? 'bg-petroleo-500 text-white border-petroleo-500'
                    : 'bg-white text-grafite-600 border-grafite-300 hover:border-petroleo-400',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-grafite-700 mb-1">Data de início *</label>
            <input type="date" className={fieldClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-grafite-700 mb-1">Data de término</label>
            <input type="date" className={fieldClass} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-grafite-700 mb-1">Motorista *</label>
          <select className={fieldClass} value={driverId} onChange={(e) => setDriverId(e.target.value)} required>
            <option value="">Selecione um motorista</option>
            {usersData?.map((u: UserOption) => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-grafite-700 mb-1">Veículo *</label>
          <select className={fieldClass} value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
            <option value="">Selecione um veículo</option>
            {vehiclesData?.data.map((v: { id: string; plate: string; model: string | null }) => (
              <option key={v.id} value={v.id}>{v.plate}{v.model ? ` — ${v.model}` : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-grafite-700 mb-1">Pontos de coleta</label>
          <select
            className={fieldClass}
            value=""
            onChange={(e) => { if (e.target.value) addPoint(e.target.value); }}
          >
            <option value="">Adicionar ponto...</option>
            {cpData?.data
              .filter((cp: { id: string }) => !points.some((p) => p.collectionPointId === cp.id))
              .map((cp: { id: string; name: string }) => (
                <option key={cp.id} value={cp.id}>{cp.name}</option>
              ))}
          </select>
          {points.length > 0 && (
            <ul className="mt-2 space-y-1">
              {points.map((p, i) => (
                <li key={p.collectionPointId} className="flex items-center justify-between bg-grafite-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-grafite-700">{i + 1}. {p.name || p.collectionPointId}</span>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700 text-xs ml-2"
                    onClick={() => removePoint(p.collectionPointId)}
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-grafite-700 mb-1">Observações</label>
          <textarea className={fieldClass} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit && (
          <div className="border border-grafite-200 rounded-lg p-4 space-y-3 bg-grafite-50">
            <p className="text-sm font-medium text-grafite-700">Propagação de alterações</p>
            <label className="flex items-center gap-2 text-sm text-grafite-600 cursor-pointer">
              <input
                type="checkbox"
                checked={propagate}
                onChange={(e) => setPropagate(e.target.checked)}
                className="rounded"
              />
              Propagar alterações para ocorrências futuras não excepcionais
            </label>
            {propagate && (
              <label className="flex items-center gap-2 text-sm text-grafite-600 cursor-pointer ml-4">
                <input
                  type="checkbox"
                  checked={overwriteExceptions}
                  onChange={(e) => setOverwriteExceptions(e.target.checked)}
                  className="rounded"
                />
                Sobrescrever ocorrências marcadas como exceção
              </label>
            )}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar modelo'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(isEdit ? `/route-templates/${id}` : '/route-templates')}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </div>
  );
}
