import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { unitsService, type CreateUnitBody, type UnitOfMeasure } from '../../services/units.service';

export function UnitFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new' && !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateUnitBody>({ name: '', symbol: '', baseUnitId: '', conversionFactor: undefined });

  const { data: existing } = useQuery({
    queryKey: ['unit', id],
    queryFn: () => unitsService.list({ status: 'all', limit: 200 }).then((r) => r.data.find((u) => u.id === id)),
    enabled: isEdit,
  });

  const { data: baseUnits } = useQuery({
    queryKey: ['units-bases'],
    queryFn: () => unitsService.list({ status: 'active', limit: 100 }),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        symbol: existing.symbol,
        baseUnitId: existing.baseUnitId ?? '',
        conversionFactor: existing.conversionFactor ?? undefined,
      });
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: () => {
      const body: CreateUnitBody = {
        name: form.name,
        symbol: form.symbol,
      };
      if (form.baseUnitId) {
        body.baseUnitId = form.baseUnitId;
        body.conversionFactor = form.conversionFactor;
      }
      return isEdit ? unitsService.update(id!, body) : unitsService.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['units'] });
      navigate('/units');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao salvar');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mut.mutate();
  };

  const otherUnits = baseUnits?.data.filter((u: UnitOfMeasure) => u.id !== id) ?? [];

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Unidade' : 'Nova Unidade de Medida'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Símbolo *</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full font-mono"
              value={form.symbol}
              onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidade base (conversão)</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm w-full"
            value={form.baseUnitId ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, baseUnitId: e.target.value, conversionFactor: e.target.value ? f.conversionFactor : undefined }))}
          >
            <option value="">Sem unidade base (unidade primitiva)</option>
            {otherUnits.map((u: UnitOfMeasure) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
          </select>
        </div>

        {form.baseUnitId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fator de conversão *</label>
            <input
              type="number"
              step="any"
              min="0"
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={form.conversionFactor ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, conversionFactor: e.target.value ? parseFloat(e.target.value) : undefined }))}
              required
            />
            <p className="text-xs text-gray-500 mt-1">1 {form.symbol || 'unidade'} = fator × {otherUnits.find((u: UnitOfMeasure) => u.id === form.baseUnitId)?.symbol}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mut.isPending} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {mut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => navigate('/units')} className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
