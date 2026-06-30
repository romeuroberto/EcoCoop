import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { rawMaterialService, type CreateEntryBody, type RawMaterialEntry } from '../../services/rawMaterialService';
import { useAuthStore } from '../../store/auth.store';

const canManageEntries = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(user?.permissions.some((p) => p.module === 'RAW_MATERIAL_ENTRIES' && p.action === 'MANAGE'));

const canCreateEntries = (user: ReturnType<typeof useAuthStore.getState>['user']) =>
  Boolean(
    user?.permissions.some(
      (p) => p.module === 'RAW_MATERIAL_ENTRIES' && (p.action === 'CREATE' || p.action === 'MANAGE'),
    ),
  );

const getError = (err: unknown) =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
  'Ocorreu um erro inesperado';

function EntryRow({
  entry,
  canManage,
  onReversal,
}: {
  entry: RawMaterialEntry;
  canManage: boolean;
  onReversal: (entry: RawMaterialEntry) => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm text-gray-800">
        {entry.subcategory.category.name} › {entry.subcategory.name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-800 font-mono">
        {entry.quantity} {entry.unit.symbol}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{entry.user.email}</td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {new Date(entry.createdAt).toLocaleString('pt-BR')}
      </td>
      <td className="px-4 py-3 text-sm">
        {entry.isReversed ? (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            Estornado
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Ativo
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        {canManage && !entry.isReversed && (
          <button
            onClick={() => onReversal(entry)}
            className="text-sm text-red-600 hover:underline"
          >
            Estornar
          </button>
        )}
      </td>
    </tr>
  );
}

function NewEntryModal({
  routeId,
  onClose,
}: {
  routeId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateEntryBody>({ subcategoryId: '', quantity: 0, unitId: '' });
  const [error, setError] = useState<string | null>(null);

  const { data: subcategories } = useQuery({
    queryKey: ['material-subcategories-active'],
    queryFn: () =>
      fetch('/api/v1/material-subcategories?status=active&limit=100', {
        headers: { Authorization: `Bearer ${window.__ecocoop_access_token}` },
      })
        .then((r) => r.json())
        .then((d: { data?: Array<{ id: string; name: string; category?: { name: string } }> }) => d.data ?? []),
  });

  const { data: units } = useQuery({
    queryKey: ['units-active'],
    queryFn: () =>
      fetch('/api/v1/units?status=active&limit=100', {
        headers: { Authorization: `Bearer ${window.__ecocoop_access_token}` },
      })
        .then((r) => r.json())
        .then((d: { data?: Array<{ id: string; name: string; symbol: string }> }) => d.data ?? []),
  });

  const mut = useMutation({
    mutationFn: () => rawMaterialService.createEntry(routeId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-entries', routeId] });
      onClose();
    },
    onError: (err) => setError(getError(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-gray-800">Nova entrada de material</h2>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subcategoria</label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.subcategoryId}
              onChange={(e) => setForm({ ...form, subcategoryId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {(subcategories ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.category?.name ? `${s.category.name} › ` : ''}{s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade</label>
            <input
              type="number"
              min="0.001"
              step="0.001"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.quantity || ''}
              onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Unidade</label>
            <select
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.unitId}
              onChange={(e) => setForm({ ...form, unitId: e.target.value })}
            >
              <option value="">Selecione...</option>
              {(units ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações (opcional)</label>
            <input
              type="text"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              value={form.notes ?? ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value || undefined })}
            />
          </div>
        </div>

        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || !form.subcategoryId || !form.unitId || form.quantity <= 0}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {mut.isPending ? 'Salvando...' : 'Registrar entrada'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReversalModal({
  routeId,
  entry,
  onClose,
}: {
  routeId: string;
  entry: RawMaterialEntry;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [justification, setJustification] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => rawMaterialService.createReversal(routeId, entry.id, { justification }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['material-entries', routeId] });
      onClose();
    },
    onError: (err) => setError(getError(err)),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-base font-semibold text-gray-800">Estornar entrada</h2>
        <p className="mb-4 text-sm text-gray-500">
          {entry.subcategory.name} — {entry.quantity} {entry.unit.symbol}
        </p>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Justificativa</label>
          <textarea
            rows={4}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Motivo do estorno (obrigatório)"
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
          />
        </div>

        <div className="mt-5 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => mut.mutate()}
            disabled={mut.isPending || justification.trim().length === 0}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {mut.isPending ? 'Estornando...' : 'Confirmar estorno'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RawMaterialEntriesPage() {
  const { routeId } = useParams<{ routeId: string }>();
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [reversalEntry, setReversalEntry] = useState<RawMaterialEntry | null>(null);

  const canManage = canManageEntries(user);
  const canCreate = canCreateEntries(user);

  const { data, isLoading } = useQuery({
    queryKey: ['material-entries', routeId, page],
    queryFn: () => rawMaterialService.listEntries(routeId!, { page, limit: 20 }),
    enabled: Boolean(routeId),
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Entradas de Material Bruto</h1>
        {canCreate && (
          <button
            onClick={() => setShowNewEntry(true)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            Nova entrada
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-400">Carregando...</div>
        ) : !data?.data?.length ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhuma entrada registrada.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcategoria</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white">
              {data.data.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  canManage={canManage}
                  onReversal={setReversalEntry}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded border text-sm disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      )}

      {showNewEntry && routeId && (
        <NewEntryModal routeId={routeId} onClose={() => setShowNewEntry(false)} />
      )}

      {reversalEntry && routeId && (
        <ReversalModal
          routeId={routeId}
          entry={reversalEntry}
          onClose={() => setReversalEntry(null)}
        />
      )}
    </div>
  );
}
