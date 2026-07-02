import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { epiTypesService, type CreateEpiTypeBody } from '../../services/epiTypes.service';

export function EpiTypeFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new' && !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateEpiTypeBody & { isActive?: boolean }>({
    name: '',
    defaultValidityDays: undefined,
  });

  const { data: existing } = useQuery({
    queryKey: ['epi-type', id],
    queryFn: () => epiTypesService.getById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        defaultValidityDays: existing.defaultValidityDays ?? undefined,
        isActive: existing.isActive,
      });
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: (data: CreateEpiTypeBody & { isActive?: boolean }) =>
      isEdit ? epiTypesService.update(id!, data) : epiTypesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['epi-types'] });
      navigate('/epi-types');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao salvar tipo de EPI');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body: CreateEpiTypeBody & { isActive?: boolean } = { name: form.name };
    if (form.defaultValidityDays !== undefined && form.defaultValidityDays !== null) {
      body.defaultValidityDays = Number(form.defaultValidityDays);
    }
    if (isEdit && form.isActive !== undefined) body.isActive = form.isActive;
    mut.mutate(body);
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Tipo de EPI' : 'Novo Tipo de EPI'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm w-full"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="ex: Luva de raspa"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Validade padrão em dias <span className="text-gray-400 font-normal">(opcional, mínimo 1)</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            className="border rounded-lg px-3 py-2 text-sm w-full"
            value={form.defaultValidityDays ?? ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                defaultValidityDays: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            placeholder="ex: 180"
          />
        </div>

        {isEdit && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive ?? true}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Ativo</label>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={mut.isPending}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
          >
            {mut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/epi-types')}
            className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
