import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui';
import { buyersService, type Buyer } from '../../services/buyers.service';
import {
  materialSubcategoriesService,
  type MaterialSubcategory,
} from '../../services/materialSubcategories.service';
import { salesService, type CreatedSale, type CreateSaleBody } from '../../services/sales.service';
import { unitsService, type UnitOfMeasure } from '../../services/units.service';

interface SaleItemRow {
  id: string;
  subcategoryId: string;
  unitId: string;
  quantity: string;
  unitPrice: string;
}

interface Props {
  onClose: () => void;
  onCreated: (sale: CreatedSale) => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  BUYER_NOT_FOUND: 'Comprador não encontrado. Atualize a lista e selecione novamente.',
  BUYER_INACTIVE: 'Comprador inativo. Selecione um comprador ativo para registrar a venda.',
  INSUFFICIENT_READY_STOCK:
    'Saldo pronto insuficiente para um dos itens. Verifique o estoque pronto antes de confirmar.',
  VALIDATION_ERROR: 'Revise os campos obrigatórios antes de confirmar a venda.',
  MATERIAL_SUBCATEGORY_NOT_FOUND: 'Material não encontrado. Atualize a lista e selecione novamente.',
  UNIT_NOT_FOUND: 'Unidade de medida não encontrada. Atualize a lista e selecione novamente.',
};

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const createRow = (): SaleItemRow => ({
  id: `${Date.now()}-${Math.random()}`,
  subcategoryId: '',
  unitId: '',
  quantity: '',
  unitPrice: '',
});

function toNumber(value: string) {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getApiError(err: unknown): string {
  const response = (err as {
    response?: { status?: number; data?: { code?: string; message?: string; details?: unknown } };
  })?.response;
  const data = response?.data;

  if (response?.status === 403) return 'Você não tem permissão para registrar vendas.';
  if (response?.status === 422) return ERROR_MESSAGES.VALIDATION_ERROR;
  if (data?.code && ERROR_MESSAGES[data.code]) return ERROR_MESSAGES[data.code];
  return data?.message ?? 'Erro ao registrar venda. Tente novamente.';
}

export function SaleFormModal({ onClose, onCreated }: Props) {
  const qc = useQueryClient();
  const [buyerId, setBuyerId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<SaleItemRow[]>([createRow()]);
  const [formError, setFormError] = useState<string | null>(null);

  const buyersQuery = useQuery({
    queryKey: ['buyers', 'sales-form', 'active'],
    queryFn: () => buyersService.list({ status: 'active', limit: 200 }),
  });

  const subcategoriesQuery = useQuery({
    queryKey: ['subcategories', 'sales-form', 'active'],
    queryFn: () => materialSubcategoriesService.list({ status: 'active', limit: 300 }),
  });

  const unitsQuery = useQuery({
    queryKey: ['units', 'sales-form', 'active'],
    queryFn: () => unitsService.list({ status: 'active', limit: 200 }),
  });

  const buyers: Buyer[] = buyersQuery.data?.data ?? [];
  const subcategories = useMemo(
    () =>
      ((subcategoriesQuery.data?.data ?? []) as MaterialSubcategory[]).filter(
        (s) => s.isSellable && s.isActive,
      ),
    [subcategoriesQuery.data?.data],
  );
  const units: UnitOfMeasure[] = unitsQuery.data?.data ?? [];
  const isLoading = buyersQuery.isLoading || subcategoriesQuery.isLoading || unitsQuery.isLoading;

  const hasZeroPrice = items.some((item) => item.unitPrice !== '' && toNumber(item.unitPrice) === 0);
  const totalAmount = items.reduce(
    (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice),
    0,
  );

  const mut = useMutation({
    mutationFn: (body: CreateSaleBody) => salesService.createSale(body),
    onSuccess: (sale) => {
      qc.invalidateQueries({ queryKey: ['sales'] });
      onCreated(sale);
      onClose();
    },
    onError: (err) => setFormError(getApiError(err)),
  });

  const updateItem = (index: number, patch: Partial<SaleItemRow>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleSubcategoryChange = (index: number, subcategoryId: string) => {
    const selected = subcategories.find((s: MaterialSubcategory) => s.id === subcategoryId);
    updateItem(index, {
      subcategoryId,
      unitId: selected?.defaultUnitId ?? '',
    });
  };

  const addItem = () => setItems((prev) => [...prev, createRow()]);
  const removeItem = (index: number) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const validateAndSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!buyerId) return setFormError('Selecione o comprador.');
    if (items.length === 0) return setFormError('Adicione ao menos um item à venda.');

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.subcategoryId) return setFormError(`Item ${i + 1}: selecione o material.`);
      if (!item.unitId) return setFormError(`Item ${i + 1}: selecione a unidade.`);

      const quantity = toNumber(item.quantity);
      if (!item.quantity || quantity <= 0)
        return setFormError(`Item ${i + 1}: informe quantidade maior que zero.`);

      const unitPrice = toNumber(item.unitPrice);
      if (item.unitPrice === '' || unitPrice < 0)
        return setFormError(`Item ${i + 1}: informe preço unitário maior ou igual a zero.`);
    }

    mut.mutate({
      buyerId,
      ...(dueDate ? { dueDate } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      items: items.map((item) => ({
        subcategoryId: item.subcategoryId,
        unitId: item.unitId,
        quantity: toNumber(item.quantity),
        unitPrice: toNumber(item.unitPrice),
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Nova venda operacional</h2>
            <p className="mt-1 text-sm text-gray-500">
              Selecione o comprador e informe os materiais vendidos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xl leading-none text-gray-400 hover:text-gray-600"
            aria-label="Fechar"
          >
            x
          </button>
        </div>

        <form onSubmit={validateAndSubmit} className="overflow-y-auto px-6 py-5">
          {formError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {formError}
            </div>
          )}

          {hasZeroPrice && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Há item com preço unitário zerado. A venda poderá ser registrada, mas revise antes de confirmar.
            </div>
          )}

          {isLoading ? (
            <p className="py-8 text-center text-sm text-gray-500">Carregando dados da venda...</p>
          ) : (
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-[1.4fr_0.7fr]">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Comprador *
                  </label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                    value={buyerId}
                    onChange={(e) => setBuyerId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {buyers.map((buyer: Buyer) => (
                      <option key={buyer.id} value={buyer.id}>
                        {buyer.legalName} - {buyer.documentNumber}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-800">Itens da venda</h3>
                  <Button type="button" variant="secondary" size="sm" onClick={addItem}>
                    Adicionar item
                  </Button>
                </div>

                <div className="divide-y divide-gray-100">
                  {items.map((item, index) => {
                    const subtotal = toNumber(item.quantity) * toNumber(item.unitPrice);
                    return (
                      <div key={item.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1.4fr_0.75fr_0.55fr_0.6fr_0.7fr_auto]">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Material *
                          </label>
                          <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                            value={item.subcategoryId}
                            onChange={(e) => handleSubcategoryChange(index, e.target.value)}
                          >
                            <option value="">Selecione...</option>
                            {subcategories.map((subcategory: MaterialSubcategory) => (
                              <option key={subcategory.id} value={subcategory.id}>
                                {subcategory.category.name} - {subcategory.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Unidade *
                          </label>
                          <select
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                            value={item.unitId}
                            onChange={(e) => updateItem(index, { unitId: e.target.value })}
                          >
                            <option value="">Selecione...</option>
                            {units.map((unit: UnitOfMeasure) => (
                              <option key={unit.id} value={unit.id}>
                                {unit.name} ({unit.symbol})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Quantidade *
                          </label>
                          <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, { quantity: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Preço unit. *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.0001"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, { unitPrice: e.target.value })}
                          />
                        </div>

                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600">
                            Subtotal
                          </label>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
                            {currency.format(subtotal)}
                          </div>
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                            className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Observações
                </label>
                <textarea
                  className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petroleo-500"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs uppercase text-gray-400">Total da venda</p>
                  <p className="text-2xl font-bold text-gray-900">{currency.format(totalAmount)}</p>
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="secondary" onClick={onClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" isLoading={mut.isPending}>
                    Confirmar venda
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
