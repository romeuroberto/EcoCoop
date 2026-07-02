import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { materialSubcategoriesService, type CreateSubcategoryBody } from '../../services/materialSubcategories.service';
import { materialCategoriesService, type MaterialCategory } from '../../services/materialCategories.service';
import { unitsService, type UnitOfMeasure } from '../../services/units.service';

export function MaterialSubcategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new' && !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateSubcategoryBody>({
    categoryId: '',
    name: '',
    defaultUnitId: '',
    isSellable: false,
    acceptsStock: false,
    notes: '',
  });

  const { data: sub } = useQuery({
    queryKey: ['material-subcategory', id],
    queryFn: () => materialSubcategoriesService.list({ status: 'all', limit: 1 }).then((r) => r.data.find((s) => s.id === id)),
    enabled: isEdit,
  });

  const { data: categories } = useQuery({
    queryKey: ['material-categories-all'],
    queryFn: () => materialCategoriesService.list({ status: 'active', limit: 100 }),
  });

  const { data: units } = useQuery({
    queryKey: ['units-all'],
    queryFn: () => unitsService.list({ status: 'active', limit: 100 }),
  });

  useEffect(() => {
    if (sub) {
      setForm({
        categoryId: sub.categoryId,
        name: sub.name,
        defaultUnitId: sub.defaultUnitId,
        isSellable: sub.isSellable,
        acceptsStock: sub.acceptsStock,
        notes: sub.notes ?? '',
      });
    }
  }, [sub]);

  const mut = useMutation({
    mutationFn: () =>
      isEdit
        ? materialSubcategoriesService.update(id!, { ...form, notes: form.notes || undefined })
        : materialSubcategoriesService.create({ ...form, notes: form.notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-subcategories'] });
      navigate('/material-subcategories');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao salvar');
    },
  });

  const set = (field: keyof CreateSubcategoryBody) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const setCheck = (field: 'isSellable' | 'acceptsStock') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.checked }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    mut.mutate();
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Subcategoria' : 'Nova Subcategoria de Material'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.categoryId} onChange={set('categoryId')} required>
            <option value="">Selecione uma categoria</option>
            {categories?.data.map((c: MaterialCategory) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.name} onChange={set('name')} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unidade padrão *</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.defaultUnitId} onChange={set('defaultUnitId')} required>
            <option value="">Selecione uma unidade</option>
            {units?.data.map((u: UnitOfMeasure) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
          </select>
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.isSellable} onChange={setCheck('isSellable')} className="rounded" />
            Vendável
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={form.acceptsStock} onChange={setCheck('acceptsStock')} className="rounded" />
            Aceita estoque
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={3} value={form.notes} onChange={set('notes')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mut.isPending} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {mut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => navigate('/material-subcategories')} className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
