import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  rawMaterialService,
  type RawMaterialBalanceItem,
  type RawMaterialBalanceResponse,
} from '../../services/rawMaterialService';

export function RawMaterialBalancePage() {
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data, isLoading, error } = useQuery<RawMaterialBalanceResponse>({
    queryKey: ['raw-material-balance', subcategoryFilter, includeInactive],
    queryFn: () =>
      rawMaterialService.getBalance({
        subcategoryId: subcategoryFilter || undefined,
        includeInactive,
      }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Saldo Bruto</h1>
      </div>

      {data?.calculatedAt && (
        <p className="text-sm text-gray-500 mb-4">
          Calculado em: {new Date(data.calculatedAt).toLocaleString('pt-BR')}
        </p>
      )}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <input
          className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]"
          placeholder="Filtrar por subcategoria (ID)..."
          value={subcategoryFilter}
          onChange={(e) => setSubcategoryFilter(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
            className="rounded"
          />
          Incluir inativas
        </label>
      </div>

      {isLoading && (
        <p className="text-gray-500 text-sm">Carregando...</p>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          Não foi possível carregar o saldo. Verifique suas permissões.
        </div>
      )}

      {!isLoading && !error && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {data?.data.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              Nenhum saldo de material bruto encontrado.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">Categoria</th>
                  <th className="px-4 py-3 text-left">Subcategoria</th>
                  <th className="px-4 py-3 text-left">Unidade</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-right">Nº Eventos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.data.map((item: RawMaterialBalanceItem) => (
                  <tr
                    key={`${item.subcategory.id}-${item.unit.id}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-600">{item.subcategory.category.name}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {item.subcategory.name}
                      {!item.subcategory.isActive && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          inativa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.unit.name} ({item.unit.symbol})
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                      {item.balance}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">{item.eventCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
