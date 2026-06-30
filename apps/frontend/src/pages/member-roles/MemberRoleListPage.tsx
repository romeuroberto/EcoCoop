import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { memberRolesService, type MemberRole } from '../../services/memberRoles.service';

export function MemberRoleListPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['member-roles', search, status, page],
    queryFn: () => memberRolesService.list({ search, status, page, limit: 20 }),
  });

  const createMut = useMutation({
    mutationFn: (name: string) => memberRolesService.create(name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member-roles'] });
      setCreating(false);
      setNewName('');
      setError(null);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao criar função');
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      memberRolesService.update(id, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['member-roles'] }),
  });

  const handleCreate = () => {
    if (!newName.trim()) return;
    createMut.mutate(newName.trim());
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Funções de Cooperado</h1>
        <button
          onClick={() => setCreating(true)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          Nova função
        </button>
      </div>

      {creating && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3 items-start">
          <div className="flex-1">
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full"
              placeholder="Nome da função"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
          </div>
          <button
            onClick={handleCreate}
            disabled={createMut.isPending}
            className="bg-brand-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            Salvar
          </button>
          <button
            onClick={() => { setCreating(false); setError(null); setNewName(''); }}
            className="text-gray-500 px-3 py-2 text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1"
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={status}
          onChange={(e) => { setStatus(e.target.value as typeof status); setPage(1); }}
        >
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
          <option value="all">Todas</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm divide-y">
            {data?.data.length === 0 && (
              <p className="p-4 text-sm text-gray-500">Nenhuma função encontrada.</p>
            )}
            {data?.data.map((role: MemberRole) => (
              <div key={role.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-gray-800">{role.name}</span>
                  {role.isDefault && (
                    <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">padrão</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${role.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                  >
                    {role.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                  {!role.isDefault && (
                    <button
                      onClick={() => toggleMut.mutate({ id: role.id, isActive: !role.isActive })}
                      className="text-xs text-gray-500 hover:text-gray-700 underline"
                    >
                      {role.isActive ? 'Inativar' : 'Ativar'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {data && data.total > data.limit && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-sm px-3 py-1 border rounded disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-600 px-2 py-1">
                {page} / {Math.ceil(data.total / data.limit)}
              </span>
              <button
                disabled={page >= Math.ceil(data.total / data.limit)}
                onClick={() => setPage((p) => p + 1)}
                className="text-sm px-3 py-1 border rounded disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
