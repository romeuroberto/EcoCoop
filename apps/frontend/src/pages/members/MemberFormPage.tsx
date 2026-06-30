import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CreateMemberBody } from '../../services/members.service';
import { membersService } from '../../services/members.service';
import { memberRolesService, type MemberRole } from '../../services/memberRoles.service';
import { maskCpf, maskPhoneBr, normalizeCpfCnpj, normalizePhone } from '../../utils/masks';

export function MemberFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new' && !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateMemberBody>({
    name: '',
    cpf: '',
    phone: '',
    email: '',
    admittedAt: '',
    roleId: '',
    notes: '',
  });

  const { data: existing } = useQuery({
    queryKey: ['member', id],
    queryFn: () => membersService.getById(id!),
    enabled: isEdit,
  });

  const { data: roles } = useQuery({
    queryKey: ['member-roles-all'],
    queryFn: () => memberRolesService.list({ status: 'active', limit: 100 }),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        cpf: maskCpf(existing.cpf),
        phone: maskPhoneBr(existing.phone),
        email: existing.email ?? '',
        admittedAt: existing.admittedAt.slice(0, 10),
        roleId: existing.role.id,
        notes: existing.notes ?? '',
      });
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: (data: CreateMemberBody) =>
      isEdit ? membersService.update(id!, data) : membersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members'] });
      navigate('/members');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao salvar cooperado');
    },
  });

  const set = (field: keyof CreateMemberBody) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const setMasked = (field: keyof CreateMemberBody, mask: (v: string) => string) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: mask(e.target.value) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = {
      ...form,
      cpf: normalizeCpfCnpj(form.cpf),
      phone: normalizePhone(form.phone),
    };
    if (!body.email) delete body.email;
    if (!body.notes) delete body.notes;
    mut.mutate(body);
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Cooperado' : 'Novo Cooperado'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.name} onChange={set('name')} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={form.cpf}
              onChange={setMasked('cpf', maskCpf)}
              placeholder="000.000.000-00"
              maxLength={14}
              inputMode="numeric"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={form.phone}
              onChange={setMasked('phone', maskPhoneBr)}
              placeholder="(00) 00000-0000"
              maxLength={15}
              inputMode="tel"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" className="border rounded-lg px-3 py-2 text-sm w-full" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de admissão *</label>
            <input type="date" className="border rounded-lg px-3 py-2 text-sm w-full" value={form.admittedAt} onChange={set('admittedAt')} required />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Função *</label>
          <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.roleId} onChange={set('roleId')} required>
            <option value="">Selecione uma função</option>
            {roles?.data.map((r: MemberRole) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={3} value={form.notes} onChange={set('notes')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mut.isPending} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {mut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => navigate('/members')} className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
