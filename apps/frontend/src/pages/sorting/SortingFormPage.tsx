import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { materialSubcategoriesService } from '../../services/materialSubcategories.service';
import { unitsService, type UnitOfMeasure } from '../../services/units.service';
import {
  sortingService,
  type CreateSortingRejectBody,
} from '../../services/sorting.service';
import type { MaterialSubcategory } from '../../services/materialSubcategories.service';

interface OutputRow {
  subcategoryId: string;
  unitId: string;
  quantity: string;
}

interface RejectRow {
  type: 'REJEITO' | 'PERDA';
  subcategoryId: string;
  unitId: string;
  quantity: string;
  description: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_RAW_STOCK: 'Saldo bruto insuficiente para a quantidade processada informada.',
  OUTPUTS_SUM_EXCEEDS_PROCESSED:
    'A soma de outputs e rejeitos excede a quantidade processada.',
  MATERIAL_SUBCATEGORY_NOT_FOUND: 'Subcategoria não encontrada.',
  REJECT_MISSING_DESCRIPTION:
    'Rejeito sem subcategoria precisa de uma descrição.',
};

function getApiError(err: unknown): string {
  const data = (err as { response?: { data?: { code?: string; message?: string } } })
    ?.response?.data;
  if (data?.code && ERROR_MESSAGES[data.code]) return ERROR_MESSAGES[data.code];
  return data?.message ?? 'Erro ao registrar triagem. Tente novamente.';
}

const emptyOutput = (): OutputRow => ({ subcategoryId: '', unitId: '', quantity: '' });
const emptyReject = (): RejectRow => ({
  type: 'REJEITO',
  subcategoryId: '',
  unitId: '',
  quantity: '',
  description: '',
});

export function SortingFormPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [subcategoryId, setSubcategoryId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [processedQuantity, setProcessedQuantity] = useState('');
  const [outputs, setOutputs] = useState<OutputRow[]>([emptyOutput()]);
  const [rejects, setRejects] = useState<RejectRow[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: subcatsData, isLoading: subcatsLoading } = useQuery({
    queryKey: ['subcategories-active'],
    queryFn: () => materialSubcategoriesService.list({ status: 'active', limit: 200 }),
  });

  const { data: unitsData, isLoading: unitsLoading } = useQuery({
    queryKey: ['units-active'],
    queryFn: () => unitsService.list({ status: 'active', limit: 200 }),
  });

  const subcats = subcatsData?.data ?? [];
  const units = unitsData?.data ?? [];

  const mut = useMutation({
    mutationFn: sortingService.create,
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['sorting-operations'] });
      navigate(`/sorting/${created.id}`);
    },
    onError: (err) => setFormError(getApiError(err)),
  });

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!subcategoryId) return setFormError('Selecione o material bruto a ser triado.');
    if (!unitId) return setFormError('Selecione a unidade de medida.');
    const pqty = parseFloat(processedQuantity);
    if (!processedQuantity || isNaN(pqty) || pqty <= 0)
      return setFormError('Informe uma quantidade processada válida (maior que zero).');

    for (let i = 0; i < outputs.length; i++) {
      const o = outputs[i];
      if (!o.subcategoryId) return setFormError(`Output ${i + 1}: selecione a subcategoria.`);
      if (!o.unitId) return setFormError(`Output ${i + 1}: selecione a unidade.`);
      const qty = parseFloat(o.quantity);
      if (!o.quantity || isNaN(qty) || qty <= 0)
        return setFormError(`Output ${i + 1}: informe uma quantidade válida.`);
    }

    for (let i = 0; i < rejects.length; i++) {
      const r = rejects[i];
      if (!r.unitId) return setFormError(`Rejeito ${i + 1}: selecione a unidade.`);
      const qty = parseFloat(r.quantity);
      if (!r.quantity || isNaN(qty) || qty <= 0)
        return setFormError(`Rejeito ${i + 1}: informe uma quantidade válida.`);
      if (!r.subcategoryId && !r.description.trim())
        return setFormError(
          `Rejeito ${i + 1}: informe a descrição quando não há subcategoria.`,
        );
    }

    const rejectBodies: CreateSortingRejectBody[] = rejects.map((r) => ({
      type: r.type,
      unitId: r.unitId,
      quantity: parseFloat(r.quantity),
      ...(r.subcategoryId ? { subcategoryId: r.subcategoryId } : {}),
      ...(r.description.trim() ? { description: r.description.trim() } : {}),
    }));

    mut.mutate({
      subcategoryId,
      unitId,
      processedQuantity: pqty,
      outputs: outputs.map((o) => ({
        subcategoryId: o.subcategoryId,
        unitId: o.unitId,
        quantity: parseFloat(o.quantity),
      })),
      rejects: rejectBodies.length > 0 ? rejectBodies : [],
    });
  };

  // Output row helpers
  const updateOutput = (idx: number, field: keyof OutputRow, value: string) =>
    setOutputs((prev) => prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o)));
  const addOutput = () => setOutputs((prev) => [...prev, emptyOutput()]);
  const removeOutput = (idx: number) =>
    setOutputs((prev) => prev.filter((_, i) => i !== idx));

  // Reject row helpers
  const updateReject = (idx: number, field: keyof RejectRow, value: string) =>
    setRejects((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  const addReject = () => setRejects((prev) => [...prev, emptyReject()]);
  const removeReject = (idx: number) =>
    setRejects((prev) => prev.filter((_, i) => i !== idx));

  const isReady = !subcatsLoading && !unitsLoading;

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate('/sorting')}
        className="mb-4 text-sm text-gray-400 hover:text-gray-600"
      >
        ← Triagens
      </button>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Nova Triagem</h1>

      {!isReady && (
        <p className="text-sm text-gray-500">Carregando opções...</p>
      )}

      {isReady && (
        <form onSubmit={validateAndSubmit} className="space-y-6">
          {/* Error banner */}
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {/* ── Seção 1: Material bruto ───────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Material bruto processado</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Subcategoria do material bruto *
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {subcats.map((s: MaterialSubcategory) => (
                    <option key={s.id} value={s.id}>
                      {s.category.name} › {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Unidade de medida *
                </label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {units.map((u: UnitOfMeasure) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.symbol})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="max-w-xs">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Quantidade processada *
              </label>
              <input
                type="number"
                min="0.001"
                step="0.001"
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                placeholder="ex: 90.000"
                value={processedQuantity}
                onChange={(e) => setProcessedQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          {/* ── Seção 2: Outputs ─────────────────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Material pronto gerado *
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Ao menos um output obrigatório</p>
              </div>
              <button
                type="button"
                onClick={addOutput}
                className="text-sm text-petroleo-600 hover:text-petroleo-800 font-medium"
              >
                + Adicionar output
              </button>
            </div>

            <div className="space-y-3">
              {outputs.map((out, idx) => (
                <div
                  key={idx}
                  className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] items-end border border-gray-100 rounded-lg p-3 bg-gray-50"
                >
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Subcategoria *</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                      value={out.subcategoryId}
                      onChange={(e) => updateOutput(idx, 'subcategoryId', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {subcats.map((s: MaterialSubcategory) => (
                        <option key={s.id} value={s.id}>
                          {s.category.name} › {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unidade *</label>
                    <select
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                      value={out.unitId}
                      onChange={(e) => updateOutput(idx, 'unitId', e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {units.map((u: UnitOfMeasure) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantidade *</label>
                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                      placeholder="0.000"
                      value={out.quantity}
                      onChange={(e) => updateOutput(idx, 'quantity', e.target.value)}
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      disabled={outputs.length === 1}
                      onClick={() => removeOutput(idx)}
                      className="px-2 py-2 text-red-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remover output"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Seção 3: Rejeitos (opcional) ─────────────────────────────── */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">
                  Rejeitos e perdas{' '}
                  <span className="text-gray-400 font-normal">(opcional)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Diferença não declarada vira Perda inerente automaticamente
                </p>
              </div>
              <button
                type="button"
                onClick={addReject}
                className="text-sm text-petroleo-600 hover:text-petroleo-800 font-medium"
              >
                + Adicionar rejeito
              </button>
            </div>

            {rejects.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nenhum rejeito informado — a diferença será registrada como perda inerente ao
                processo.
              </p>
            ) : (
              <div className="space-y-3">
                {rejects.map((rej, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-100 rounded-lg p-3 bg-gray-50 space-y-3"
                  >
                    <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Tipo *</label>
                        <select
                          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                          value={rej.type}
                          onChange={(e) =>
                            updateReject(idx, 'type', e.target.value as 'REJEITO' | 'PERDA')
                          }
                        >
                          <option value="REJEITO">Rejeito</option>
                          <option value="PERDA">Perda</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Unidade *</label>
                        <select
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                          value={rej.unitId}
                          onChange={(e) => updateReject(idx, 'unitId', e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {units.map((u: UnitOfMeasure) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.symbol})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Quantidade *</label>
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                          placeholder="0.000"
                          value={rej.quantity}
                          onChange={(e) => updateReject(idx, 'quantity', e.target.value)}
                        />
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => removeReject(idx)}
                          className="px-2 py-2 text-red-400 hover:text-red-600"
                          title="Remover rejeito"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Subcategoria{' '}
                          <span className="text-gray-400">(opcional)</span>
                        </label>
                        <select
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                          value={rej.subcategoryId}
                          onChange={(e) => updateReject(idx, 'subcategoryId', e.target.value)}
                        >
                          <option value="">Sem subcategoria</option>
                          {subcats.map((s: MaterialSubcategory) => (
                            <option key={s.id} value={s.id}>
                              {s.category.name} › {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Descrição
                          {!rej.subcategoryId && (
                            <span className="ml-1 text-red-500">*</span>
                          )}
                        </label>
                        <input
                          type="text"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                          placeholder={
                            !rej.subcategoryId
                              ? 'Obrigatória sem subcategoria'
                              : 'Opcional'
                          }
                          value={rej.description}
                          onChange={(e) => updateReject(idx, 'description', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Ações ────────────────────────────────────────────────────── */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={mut.isPending}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {mut.isPending ? 'Registrando...' : 'Registrar triagem'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/sorting')}
              className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
