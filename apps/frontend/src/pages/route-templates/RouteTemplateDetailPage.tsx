import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, LoadingState, Pagination } from '../../components/ui';
import type { BadgeVariant } from '../../components/ui';
import {
  routeTemplatesService,
  type PropagationResult,
  type TemplateOccurrence,
  type TemplatePoint,
  type TemplateStatus,
} from '../../services/routeTemplates.service';
import { useAuthStore } from '../../store/auth.store';

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TEMPLATE_STATUS_BADGE: Record<TemplateStatus, BadgeVariant> = {
  ATIVO: 'active',
  INATIVO: 'inactive',
};
const TEMPLATE_STATUS_LABELS: Record<TemplateStatus, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
};

type RouteStatus = 'PLANEJADA' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
const OCC_STATUS_BADGE: Record<RouteStatus, BadgeVariant> = {
  PLANEJADA: 'planned',
  EM_ANDAMENTO: 'in_progress',
  CONCLUIDA: 'completed',
  CANCELADA: 'cancelled',
};
const OCC_STATUS_LABELS: Record<RouteStatus, string> = {
  PLANEJADA: 'Planejada',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const getError = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro inesperado';

export function RouteTemplateDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [occPage, setOccPage] = useState(1);
  const [occStatus, setOccStatus] = useState('all');
  const [activateDate, setActivateDate] = useState('');
  const [showActivate, setShowActivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const canManage = user?.permissions.some((p) => p.module === 'ROUTE_TEMPLATES' && (p.action === 'MANAGE' || p.action === 'MANAGE'));

  useEffect(() => {
    const propagation = (location.state as { propagation?: PropagationResult | null } | null)?.propagation;
    if (propagation) {
      setSuccess(
        `${propagation.updated} ocorrência(s) atualizada(s), ${propagation.exceptionsSkipped} exceção(ões) ignorada(s), ${propagation.newOccurrencesGenerated} nova(s) ocorrência(s) gerada(s).`,
      );
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  const { data: template, isLoading } = useQuery({
    queryKey: ['route-template', id, occPage, occStatus],
    queryFn: () =>
      routeTemplatesService.getById(id!, {
        occurrencePage: occPage,
        occurrenceLimit: 20,
        occurrenceStatus: occStatus,
      }),
    enabled: Boolean(id),
  });

  const { data: plannedOccurrences } = useQuery({
    queryKey: ['route-template', id, 'planned-count'],
    queryFn: () =>
      routeTemplatesService.getById(id!, {
        occurrencePage: 1,
        occurrenceLimit: 1,
        occurrenceStatus: 'PLANEJADA',
      }),
    enabled: Boolean(id) && confirmDeactivate,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['route-template', id] });
    void qc.invalidateQueries({ queryKey: ['route-templates'] });
  };

  const generateMut = useMutation({
    mutationFn: () => routeTemplatesService.generate(id!),
    onSuccess: (res) => {
      invalidate();
      setSuccess(`${res.generatedOccurrences} ocorrência(s) gerada(s)`);
      setError(null);
    },
    onError: (e) => { setError(getError(e)); setSuccess(null); },
  });

  const deactivateMut = useMutation({
    mutationFn: () => routeTemplatesService.deactivate(id!),
    onSuccess: (res) => {
      invalidate();
      setSuccess(`Modelo desativado. ${res.cancelledOccurrences} ocorrência(s) cancelada(s).`);
      setConfirmDeactivate(false);
      setError(null);
    },
    onError: (e) => { setError(getError(e)); setSuccess(null); },
  });

  const activateMut = useMutation({
    mutationFn: () => routeTemplatesService.activate(id!, activateDate),
    onSuccess: (res) => {
      invalidate();
      setSuccess(`Modelo ativado. ${res.generatedOccurrences} ocorrência(s) gerada(s).`);
      setShowActivate(false);
      setError(null);
    },
    onError: (e) => { setError(getError(e)); setSuccess(null); },
  });

  const duplicateMut = useMutation({
    mutationFn: () => routeTemplatesService.duplicate(id!),
    onSuccess: (res) => {
      // Navigate to new form with draft pre-filled via state
      navigate('/route-templates/new', { state: { draft: res.draft } });
    },
    onError: (e) => { setError(getError(e)); },
  });

  if (isLoading) return <LoadingState variant="skeleton" rows={10} />;
  if (!template) return <div className="p-4 text-grafite-500">Modelo não encontrado.</div>;

  const occTotal = template.occurrences?.total ?? 0;
  const occPages = Math.ceil(occTotal / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="text-grafite-500 hover:text-grafite-700 text-sm"
            onClick={() => navigate('/route-templates')}
          >
            ← Voltar
          </button>
          <h1 className="text-xl font-semibold text-grafite-800">{template.name}</h1>
          <Badge
            variant={TEMPLATE_STATUS_BADGE[template.status as TemplateStatus]}
            label={TEMPLATE_STATUS_LABELS[template.status as TemplateStatus]}
          />
        </div>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/route-templates/${id}/edit`)}>
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setError(null); setSuccess(null); generateMut.mutate(); }}
              disabled={generateMut.isPending || template.status === 'INATIVO'}
            >
              Gerar ocorrências
            </Button>
            {template.status === 'ATIVO' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setError(null); setConfirmDeactivate(true); }}
                disabled={deactivateMut.isPending}
              >
                Desativar
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowActivate(!showActivate); setError(null); }}
              >
                Ativar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setError(null); duplicateMut.mutate(); }}
              disabled={duplicateMut.isPending}
            >
              Duplicar
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{success}</div>
      )}

      {showActivate && (
        <div className="bg-white border border-grafite-200 rounded-lg p-4 flex items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-grafite-700 mb-1">Nova data de início</label>
            <input
              type="date"
              className="border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
              value={activateDate}
              onChange={(e) => setActivateDate(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => activateMut.mutate()}
            disabled={!activateDate || activateMut.isPending}
          >
            {activateMut.isPending ? 'Ativando...' : 'Confirmar'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowActivate(false)}>Cancelar</Button>
        </div>
      )}

      {confirmDeactivate && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-amber-800">
            Desativar este modelo cancelará {plannedOccurrences?.occurrences.total ?? 0} ocorrência(s) planejada(s) vinculada(s) a ele.
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => deactivateMut.mutate()}
              disabled={deactivateMut.isPending}
            >
              {deactivateMut.isPending ? 'Desativando...' : 'Confirmar'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirmDeactivate(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-grafite-700 uppercase tracking-wide">Detalhes</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-grafite-500">Dias da semana</dt>
              <dd className="text-grafite-800 font-medium">
                {(template.recurrenceDays as number[]).map((d) => DAY_LABELS[d]).join(', ')}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-grafite-500">Início</dt>
              <dd className="text-grafite-800">{new Date(template.startDate).toLocaleDateString('pt-BR')}</dd>
            </div>
            {template.endDate && (
              <div className="flex justify-between">
                <dt className="text-grafite-500">Término</dt>
                <dd className="text-grafite-800">{new Date(template.endDate).toLocaleDateString('pt-BR')}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-grafite-500">Motorista</dt>
              <dd className="text-grafite-800">{template.driver?.email ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-grafite-500">Veículo</dt>
              <dd className="text-grafite-800">{template.vehicle?.plate ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-grafite-500">Versão</dt>
              <dd className="text-grafite-800">{template.version}</dd>
            </div>
          </dl>
          {template.notes && (
            <p className="text-sm text-grafite-600 border-t border-grafite-100 pt-3">{template.notes}</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-grafite-700 uppercase tracking-wide">Pontos de coleta</h2>
          {template.templatePoints.length === 0 ? (
            <p className="text-sm text-grafite-400">Nenhum ponto configurado.</p>
          ) : (
            <ol className="space-y-2">
              {template.templatePoints.map((tp: TemplatePoint) => (
                <li key={tp.id} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-petroleo-100 text-petroleo-700 flex items-center justify-center text-xs font-bold">
                    {tp.sequence}
                  </span>
                  <div>
                    <p className="font-medium text-grafite-800">{tp.collectionPoint.name}</p>
                    <p className="text-grafite-500 text-xs">{tp.collectionPoint.address}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Occurrences */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-grafite-700 uppercase tracking-wide">
            Ocorrências ({occTotal})
          </h2>
          <select
            className="border border-grafite-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
            value={occStatus}
            onChange={(e) => { setOccStatus(e.target.value); setOccPage(1); }}
          >
            <option value="all">Todos os status</option>
            <option value="PLANEJADA">Planejadas</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDA">Concluídas</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>

        {!template.occurrences?.data.length ? (
          <p className="text-sm text-grafite-400">Nenhuma ocorrência encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-grafite-50 text-grafite-500 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Data</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Exceção</th>
                  <th className="px-3 py-2 text-left">Motorista</th>
                  <th className="px-3 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grafite-100">
                {template.occurrences.data.map((occ: TemplateOccurrence) => (
                  <tr key={occ.id} className="hover:bg-grafite-50">
                    <td className="px-3 py-2 text-grafite-800">
                      {new Date(occ.plannedDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={OCC_STATUS_BADGE[occ.status as RouteStatus]}
                        label={OCC_STATUS_LABELS[occ.status as RouteStatus]}
                        size="sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {occ.isException && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                          Exceção
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-grafite-600">{occ.driver?.email ?? '—'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className="text-petroleo-600 hover:text-petroleo-800 text-xs font-medium"
                        onClick={() => navigate(`/collection-routes/${occ.id}`)}
                      >
                        Ver rota
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {occPages > 1 && (
          <Pagination page={occPage} totalPages={occPages} onPageChange={setOccPage} />
        )}
      </div>
    </div>
  );
}
