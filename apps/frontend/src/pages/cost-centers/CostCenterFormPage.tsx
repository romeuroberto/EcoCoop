import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { costCentersService, type CreateCostCenterBody } from '../../services/costCenters.service';

export function CostCenterFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new' && !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateCostCenterBody & { isActive?: boolean }>({
    name: '',
    code: '',
    description: '',
  });

  const { data: existing } = useQuery({
    queryKey: ['cost-center', id],
    queryFn: () => costCentersService.getById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        code: existing.code ?? '',
        description: existing.description ?? '',
        isActive: existing.isActive,
      });
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: (data: CreateCostCenterBody & { isActive?: boolean }) =>
      isEdit ? costCentersService.update(id!, data) : costCentersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cost-centers'] });
      navigate('/cost-centers');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao salvar centro de custo');
    },
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body: CreateCostCenterBody & { isActive?: boolean } = { name: form.name };
    if (form.code?.trim()) body.code = form.code.trim().toUpperCase();
    if (form.description?.trim()) body.description = form.description.trim();
    if (isEdit && form.isActive !== undefined) body.isActive = form.isActive;
    mut.mutate(body);
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input
            className="border rounded-lg px-3 py-2 text-sm w-full"
            value={form.name}
            onChange={set('name')}
            placeholder="ex: Logística"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Código <span className="text-gray-400 font-normal">(opcional — será convertido para maiúsculas)</span>
          </label>
          <input
            className="border rounded-lg px-3 py-2 text-sm w-full uppercase"
            value={form.code}
            onChange={set('code')}
            placeholder="ex: LOG-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição <span className="text-gray-400 font-normal">(opcional)</span></label>
          <textarea
            className="border rounded-lg px-3 py-2 text-sm w-full"
            rows={3}
            value={form.description}
            onChange={set('description')}
            placeholder="Descrição do centro de custo..."
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
            onClick={() => navigate('/cost-centers')}
            className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
