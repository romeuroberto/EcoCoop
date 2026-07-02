import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  EmptyState,
  FilterBar,
  LoadingState,
  PageHeader,
  Pagination,
} from '../../components/ui';
import type { BadgeVariant } from '../../components/ui';
import { routeTemplatesService, type RouteTemplate, type TemplateStatus } from '../../services/routeTemplates.service';

const STATUS_LABELS: Record<TemplateStatus, string> = {
  ATIVO: 'Ativo',
  INATIVO: 'Inativo',
};

const STATUS_BADGE: Record<TemplateStatus, BadgeVariant> = {
  ATIVO: 'active',
  INATIVO: 'inactive',
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function RouteTemplatesPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['route-templates', statusFilter, page],
    queryFn: () =>
      routeTemplatesService.list({
        status: statusFilter,
        page,
        limit: 20,
      }),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <PageHeader
        title="Modelos de Rota"
        subtitle="Gerencie os modelos de rotas recorrentes"
        actions={
          <Button onClick={() => navigate('/route-templates/new')}>
            Novo modelo
          </Button>
        }
      />

      <FilterBar>
        <select
          className="border border-grafite-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="all">Todos os status</option>
          <option value="ATIVO">Ativo</option>
          <option value="INATIVO">Inativo</option>
        </select>
      </FilterBar>

      {isLoading ? (
        <LoadingState variant="skeleton" rows={8} />
      ) : !data?.data.length ? (
        <EmptyState
          title={statusFilter !== 'all' ? 'Nenhum modelo encontrado' : 'Nenhum modelo de rota cadastrado'}
          description={
            statusFilter !== 'all'
              ? 'Tente ajustar o filtro para encontrar o que procura.'
              : 'Cadastre o primeiro modelo de rota recorrente.'
          }
          action={
            statusFilter === 'all' ? (
              <Button onClick={() => navigate('/route-templates/new')}>Novo modelo</Button>
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
                  <th className="px-4 py-3 text-left">Dias</th>
                  <th className="px-4 py-3 text-left">Início</th>
                  <th className="px-4 py-3 text-left">Motorista</th>
                  <th className="px-4 py-3 text-left">Veículo</th>
                  <th className="px-4 py-3 text-left">Ocorrências</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grafite-100">
                {data.data.map((t: RouteTemplate) => (
                  <tr key={t.id} className="hover:bg-grafite-50">
                    <td className="px-4 py-3 font-medium text-grafite-800">{t.name}</td>
                    <td className="px-4 py-3 text-grafite-600">
                      {(t.recurrenceDays as number[]).map((d) => DAY_LABELS[d]).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-grafite-600">
                      {new Date(t.startDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-grafite-600">{t.driver?.email ?? '—'}</td>
                    <td className="px-4 py-3 text-grafite-600">{t.vehicle?.plate ?? '—'}</td>
                    <td className="px-4 py-3 text-grafite-600">{t.occurrenceCount ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[t.status]} label={STATUS_LABELS[t.status]} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/route-templates/${t.id}`)}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
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
