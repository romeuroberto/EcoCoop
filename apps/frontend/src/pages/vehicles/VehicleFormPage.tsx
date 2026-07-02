import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CreateVehicleBody, VehicleType } from '../../services/vehicles.service';
import { vehiclesService } from '../../services/vehicles.service';
import { unitsService, type UnitOfMeasure } from '../../services/units.service';
import { maskVehiclePlate, normalizeVehiclePlate } from '../../utils/masks';

const vehicleTypes: { value: VehicleType; label: string }[] = [
  { value: 'TRUCK', label: 'Caminhão' },
  { value: 'VAN', label: 'Van' },
  { value: 'PICKUP', label: 'Pickup' },
  { value: 'MOTORCYCLE', label: 'Moto' },
  { value: 'OTHER', label: 'Outro' },
];

export function VehicleFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== 'new' && !!id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateVehicleBody & { isActive?: boolean }>({
    plate: '',
    type: 'TRUCK',
    model: '',
    capacityValue: undefined,
    capacityUnitId: undefined,
    capacityNotes: '',
    notes: '',
  });

  const { data: existing } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesService.getById(id!),
    enabled: isEdit,
  });

  const { data: unitsData } = useQuery({
    queryKey: ['units-active'],
    queryFn: () => unitsService.list({ status: 'active', limit: 100 }),
  });

  useEffect(() => {
    if (existing) {
      setForm({
        plate: maskVehiclePlate(existing.plate),
        type: existing.type,
        model: existing.model,
        capacityValue: existing.capacityValue ?? undefined,
        capacityUnitId: existing.capacityUnitId ?? undefined,
        capacityNotes: existing.capacityNotes ?? '',
        notes: existing.notes ?? '',
        isActive: existing.isActive,
      });
    }
  }, [existing]);

  const mut = useMutation({
    mutationFn: (data: CreateVehicleBody & { isActive?: boolean }) =>
      isEdit ? vehiclesService.update(id!, data) : vehiclesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      navigate('/vehicles');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setError(e.response?.data?.message ?? 'Erro ao salvar veículo');
    },
  });

  const set = (field: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const hasCapacity = form.capacityValue !== undefined && form.capacityValue !== null && String(form.capacityValue) !== '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const body: CreateVehicleBody & { isActive?: boolean } = {
      plate: normalizeVehiclePlate(form.plate),
      type: form.type,
      model: form.model,
    };
    if (hasCapacity) {
      body.capacityValue = Number(form.capacityValue);
      body.capacityUnitId = form.capacityUnitId;
    }
    if (form.capacityNotes) body.capacityNotes = form.capacityNotes;
    if (form.notes) body.notes = form.notes;
    if (isEdit && form.isActive !== undefined) body.isActive = form.isActive;
    mut.mutate(body);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        {isEdit ? 'Editar Veículo' : 'Novo Veículo'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        {error && <p className="text-red-600 text-sm bg-red-50 px-4 py-2 rounded-lg">{error}</p>}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Placa *</label>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-full"
              value={form.plate}
              onChange={(e) => setForm((f) => ({ ...f, plate: maskVehiclePlate(e.target.value) }))}
              placeholder="AAA-0000"
              maxLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select className="border rounded-lg px-3 py-2 text-sm w-full" value={form.type} onChange={set('type')} required>
              {vehicleTypes.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo *</label>
          <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.model} onChange={set('model')} required />
        </div>

        <fieldset className="border rounded-lg p-4">
          <legend className="text-sm font-medium text-gray-600 px-1">Capacidade (opcional)</legend>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  value={form.capacityValue ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, capacityValue: e.target.value ? Number(e.target.value) : undefined }))}
                  placeholder="ex: 1500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Unidade</label>
                <select
                  className="border rounded-lg px-3 py-2 text-sm w-full"
                  value={form.capacityUnitId ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, capacityUnitId: e.target.value || undefined }))}
                  disabled={!hasCapacity}
                >
                  <option value="">Selecione uma unidade</option>
                  {unitsData?.data.map((u: UnitOfMeasure) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Observações da capacidade</label>
              <input className="border rounded-lg px-3 py-2 text-sm w-full" value={form.capacityNotes} onChange={set('capacityNotes')} />
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
          <button type="button" onClick={() => navigate('/vehicles')} className="text-gray-600 px-4 py-2 rounded-lg text-sm border hover:bg-gray-50">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
