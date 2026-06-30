import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CreateBuyerBody, DocumentType } from '../../services/buyers.service';
import { buyersService } from '../../services/buyers.service';

export function BuyerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new' && !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateBuyerBody>({
    legalName: '',
    documentType: 'CNPJ',
    documentNumber: '',
    phone: '',
    email: '',
    addressStreet: '',
    addressNumber: '',
    addressComplement: '',
    addressCity: '',
    addressState: '',
    addressZip: '',
    notes: '',
  });

  const { data: existing } = useQuery({
    queryKey: ['buyer', id],
    queryFn: () => buyersService.getById(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        legalName: existing.legalName,
        documentType: existing.documentType,
        documentNumber: existing.documentNumber,
        phone: existing.phone ?? '',
        email: existing.email ?? '',
        addressStreet: existing.addressStreet ?? '',
        addressNumber: existing.addressNumber ?? '',
        addressComplement: existing.addressComplement ?? '',
        addressCity: existing.addressCity ?? '',
        addressState: existing.addressState ?? '',
        addressZip: existing.addressZip ?? '',
        notes: existing.notes ?? '',
      });
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: (data: CreateBuyerBody) =>
      isEdit ? buyersService.update(id!, data) : buyersService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['buyers'] });
      navigate('/buyers');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao salvar comprador');
    },
  });

  const set = (field: keyof CreateBuyerBody) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body = { ...form };
    const optionalFields: (keyof CreateBuyerBody)[] = ['phone', 'email', 'addressStreet', 'addressNumber', 'addressComplement', 'addressCity', 'addressState', 'addressZip', 'notes'];
    for (const f of optionalFields) {
      if (!body[f]) delete body[f];
    }
    mut.mutate(body);
  };

  const docPlaceholder = form.documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00';

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Comprador' : 'Novo Comprador'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Razão Social / Nome *</label>
          <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.legalName} onChange={set('legalName')} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento *</label>
            <div className="flex gap-4">
              {(['CNPJ', 'CPF'] as DocumentType[]).map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="documentType"
                    value={t}
                    checked={form.documentType === t}
                    onChange={() => setForm((f) => ({ ...f, documentType: t, documentNumber: '' }))}
                  />
                  {t}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Número do Documento *</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={form.documentNumber}
              onChange={set('documentNumber')}
              placeholder={docPlaceholder}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input type="email" className="border rounded-lg px-3 py-2 text-sm w-full" value={form.email} onChange={set('email')} />
          </div>
        </div>

        <fieldset className="border rounded-lg p-4">
          <legend className="text-sm font-medium text-gray-600 px-1">Endereço</legend>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600 mb-1">Logradouro</label>
                <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.addressStreet} onChange={set('addressStreet')} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Número</label>
                <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.addressNumber} onChange={set('addressNumber')} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Complemento</label>
                <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.addressComplement} onChange={set('addressComplement')} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Cidade</label>
                <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.addressCity} onChange={set('addressCity')} />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">UF</label>
                <input className="border rounded-lg px-3 py-2 text-sm w-full uppercase" maxLength={2} value={form.addressState} onChange={set('addressState')} />
              </div>
            </div>
            <div className="w-1/3">
              <label className="block text-xs text-gray-600 mb-1">CEP</label>
              <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.addressZip} onChange={set('addressZip')} placeholder="00000-000" />
            </div>
          </div>
        </fieldset>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
          <textarea className="border rounded-lg px-3 py-2 text-sm w-full" rows={3} value={form.notes} onChange={set('notes')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={mut.isPending} className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {mut.isPending ? 'Salvando...' : 'Salvar'}
          </button>
          <button type="button" onClick={() => navigate('/buyers')} className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
