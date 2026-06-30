import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { materialCategoriesService } from '../../services/materialCategories.service';

export function MaterialCategoryFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new' && !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: existing } = useQuery({
    queryKey: ['material-category', id],
    queryFn: () => materialCategoriesService.list({ search: '' }).then((r) => r.data.find((c) => c.id === id)),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description ?? '');
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: () =>
      isEdit
        ? materialCategoriesService.update(id!, { name, description: description || undefined })
        : materialCategoriesService.create({ name, description: description || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-categories'] });
      navigate('/material-categories');
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

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Categoria' : 'Nova Categoria de Material'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input className="border rounded-lg px-3 py-2 text-sm w-full" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
          <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mut.isPending} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {mut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => navigate('/material-categories')} className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
