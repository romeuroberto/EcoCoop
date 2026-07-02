import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { materialSubcategoriesService } from '../../services/materialSubcategories.service';
import type { MaterialSubcategory } from '../../services/materialSubcategories.service';
import {
  readyStockService,
  type CreateAdjustmentBody,
} from '../../services/readyStock.service';

const ERROR_MESSAGES: Record<string, string> = {
  ADJUSTMENT_WOULD_CAUSE_NEGATIVE_BALANCE:
    'O ajuste causaria saldo negativo. Verifique o saldo atual antes de prosseguir.',
  MATERIAL_SUBCATEGORY_NOT_FOUND: 'Subcategoria não encontrada.',
  UNIT_NOT_FOUND: 'Unidade de medida não encontrada.',
  JUSTIFICATION_REQUIRED: 'A justificativa é obrigatória.',
  QUANTITY_CANNOT_BE_ZERO: 'A quantidade não pode ser zero.',
};

function getApiError(err: unknown): string {
  const data = (err as { response?: { data?: { code?: string; message?: string } } })
    ?.response?.data;
  if (data?.code && ERROR_MESSAGES[data.code]) return ERROR_MESSAGES[data.code];
  return data?.message ?? 'Erro ao registrar ajuste. Tente novamente.';
}

interface Props {
  onClose: () => void;
}

export function ReadyStockAdjustmentModal({ onClose }: Props) {
  const qc = useQueryClient();

  const [subcategoryId, setSubcategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [unitSymbol, setUnitSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [justification, setJustification] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const { data: subcatsData, isLoading: subcatsLoading } = useQuery({
    queryKey: ['subcategories-active'],
    queryFn: () => materialSubcategoriesService.list({ status: 'active', limit: 200 }),
  });

  const subcats = subcatsData?.data ?? [];

  const handleSubcategoryChange = (id: string) => {
    setSubcategoryId(id);
    const found = subcats.find((s: MaterialSubcategory) => s.id === id);
    if (found) {
      setUnitId(found.defaultUnitId);
      setUnitSymbol(found.defaultUnit.symbol);
    } else {
      setUnitId('');
      setUnitSymbol('');
    }
  };

  const mut = useMutation({
    mutationFn: (body: CreateAdjustmentBody) => readyStockService.createAdjustment(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ready-stock-balance'] });
      qc.invalidateQueries({ queryKey: ['ready-stock-movements'] });
      onClose();
    },
    onError: (err) => setFormError(getApiError(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!subcategoryId) return setFormError('Selecione a subcategoria do material.');
    if (!unitId) return setFormError('Unidade de medida não disponível para este material.');

    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty === 0)
      return setFormError('A quantidade não pode ser zero.');

    if (!justification.trim())
      return setFormError('A justificativa é obrigatória.');

    mut.mutate({ subcategoryId, unitId, quantity: qty, justification: justification.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Ajuste de Estoque Pronto</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Use quantidade positiva para entrada e negativa para saída.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {formError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}

        {subcatsLoading ? (
          <p className="text-sm text-gray-500 py-4 text-center">Carregando materiais...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Subcategoria */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Subcategoria do material *
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                value={subcategoryId}
                onChange={(e) => handleSubcategoryChange(e.target.value)}
              >
                <option value="">Selecione...</option>
                {subcats.map((s: MaterialSubcategory) => (
                  <option key={s.id} value={s.id}>
                    {s.category.name} › {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unidade (display auto-preenchido) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Unidade de medida
              </label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                {unitSymbol
                  ? unitSymbol
                  : <span className="text-gray-400">Preenchida ao selecionar o material</span>}
              </div>
            </div>

            {/* Quantidade */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Quantidade *{' '}
                <span className="text-gray-400 font-normal">(negativo = saída)</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                  placeholder="ex: -5.000 ou 10.000"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
                {unitSymbol && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                    {unitSymbol}
                  </span>
                )}
              </div>
              {quantity && !isNaN(parseFloat(quantity)) && parseFloat(quantity) !== 0 && (
                <p
                  className={`mt-1 text-xs ${
                    parseFloat(quantity) < 0 ? 'text-red-500' : 'text-ecocoop-600'
                  }`}
                >
                  {parseFloat(quantity) < 0
                    ? `Redução de ${Math.abs(parseFloat(quantity)).toFixed(3)} ${unitSymbol}`
                    : `Acréscimo de ${parseFloat(quantity).toFixed(3)} ${unitSymbol}`}
                </p>
              )}
            </div>

            {/* Justificativa */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Justificativa *
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500 resize-none"
                rows={3}
                placeholder="Descreva o motivo do ajuste..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
              <p className="mt-0.5 text-xs text-gray-400">
                Este campo é auditado e não pode ser alterado após o registro.
              </p>
            </div>

            {/* Ações */}
            <div className="flex gap-3 pt-1 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mut.isPending}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
              >
                {mut.isPending ? 'Registrando...' : 'Registrar ajuste'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
