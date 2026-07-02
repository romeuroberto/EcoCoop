import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { LoadingState } from '../../components/ui';
import {
  sortingService,
  type SortingOutput,
  type SortingReject,
} from '../../services/sorting.service';

const STATUS_LABELS: Record<string, string> = {
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

const STATUS_CLASSES: Record<string, string> = {
  CONCLUIDA: 'bg-ecocoop-50 text-ecocoop-700 border border-ecocoop-200',
  CANCELADA: 'bg-red-50 text-red-700 border border-red-200',
};

const REJECT_TYPE_LABELS: Record<string, string> = {
  REJEITO: 'Rejeito',
  PERDA: 'Perda',
  PERDA_INERENTE: 'Perda inerente',
};

const REJECT_TYPE_CLASSES: Record<string, string> = {
  REJEITO: 'bg-orange-50 text-orange-700',
  PERDA: 'bg-amber-50 text-amber-700',
  PERDA_INERENTE: 'bg-grafite-100 text-grafite-600 italic',
};

export function SortingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: op, isLoading, error } = useQuery({
    queryKey: ['sorting-operation', id],
    queryFn: () => sortingService.getById(id!),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <LoadingState message="Carregando triagem..." />;
  }

  if (error) {
    const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
    return (
      <div>
        <button
          onClick={() => navigate('/sorting')}
          className="mb-4 text-sm text-gray-400 hover:text-gray-600"
        >
          ← Triagens
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          {code === 'SORTING_OPERATION_NOT_FOUND'
            ? 'Triagem não encontrada.'
            : 'Não foi possível carregar a triagem. Verifique suas permissões.'}
        </div>
      </div>
    );
  }

  if (!op) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/sorting')}
            className="mb-2 text-sm text-gray-400 hover:text-gray-600"
          >
            ← Triagens
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">
              Triagem — {op.subcategory.name}
            </h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[op.status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {STATUS_LABELS[op.status] ?? op.status}
            </span>
          </div>
        </div>
      </div>

      {/* Cancel notice */}
      {op.status === 'CANCELADA' && op.cancelReason && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="font-medium">Motivo do cancelamento:</span> {op.cancelReason}
          {op.cancelledBy && (
            <span className="ml-2 text-red-500">
              por {op.cancelledBy.email}
              {op.cancelledAt &&
                ` em ${new Date(op.cancelledAt).toLocaleString('pt-BR')}`}
            </span>
          )}
        </div>
      )}

      {/* Summary card */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Resumo</h2>
        <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-xs text-gray-500">Material bruto</span>
            <span className="font-medium text-gray-800">{op.subcategory.name}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Unidade</span>
            <span className="font-medium text-gray-800">{op.unit.symbol}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Quantidade processada</span>
            <span className="font-mono font-semibold text-gray-800">
              {op.processedQuantity} {op.unit.symbol}
            </span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Responsável</span>
            <span className="font-medium text-gray-800">{op.user.email}</span>
          </div>
          <div>
            <span className="block text-xs text-gray-500">Data</span>
            <span className="font-medium text-gray-800">
              {new Date(op.createdAt).toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      {/* Outputs */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Material pronto gerado{' '}
          <span className="text-gray-400 font-normal">({op.outputs.length} item{op.outputs.length !== 1 ? 's' : ''})</span>
        </h2>
        {op.outputs.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum output registrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Subcategoria</th>
                <th className="px-3 py-2 text-right">Quantidade</th>
                <th className="px-3 py-2 text-left">Unidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {op.outputs.map((out: SortingOutput) => (
                <tr key={out.id}>
                  <td className="px-3 py-2 font-medium text-gray-800">{out.subcategory.name}</td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">{out.quantity}</td>
                  <td className="px-3 py-2 text-gray-500">{out.unit.symbol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rejects */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Rejeitos e perdas{' '}
          <span className="text-gray-400 font-normal">({op.rejects.length} item{op.rejects.length !== 1 ? 's' : ''})</span>
        </h2>
        {op.rejects.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum rejeito ou perda registrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-3 py-2 text-left">Tipo</th>
                <th className="px-3 py-2 text-left">Subcategoria</th>
                <th className="px-3 py-2 text-right">Quantidade</th>
                <th className="px-3 py-2 text-left">Unidade</th>
                <th className="px-3 py-2 text-left">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {op.rejects.map((rej: SortingReject) => (
                <tr
                  key={rej.id}
                  className={rej.type === 'PERDA_INERENTE' ? 'bg-grafite-50' : ''}
                >
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${REJECT_TYPE_CLASSES[rej.type] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {REJECT_TYPE_LABELS[rej.type] ?? rej.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-700">
                    {rej.subcategory?.name ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-gray-700">{rej.quantity}</td>
                  <td className="px-3 py-2 text-gray-500">{rej.unit.symbol}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {rej.description ?? <span className="text-gray-400">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
