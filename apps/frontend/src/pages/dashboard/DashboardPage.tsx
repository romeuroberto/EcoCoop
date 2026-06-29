import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api.client';
import { useAuthStore } from '../../store/auth.store';

interface Cooperative {
  id: string;
  name: string;
  cnpj: string;
}

const FUTURE_MODULES = [
  { label: 'Materiais', icon: '♻️' },
  { label: 'Estoque', icon: '📦' },
  { label: 'Triagem', icon: '⚙️' },
  { label: 'Vendas', icon: '💰' },
  { label: 'Financeiro', icon: '📊' },
  { label: 'Rateio', icon: '🤝' },
  { label: 'Relatórios', icon: '📋' },
];

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: coop } = useQuery<Cooperative>({
    queryKey: ['cooperative'],
    queryFn: async () => {
      const res = await api.get<Cooperative>('/cooperative');
      return res.data;
    },
    retry: false,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Dashboard</h1>
      {coop && <p className="text-gray-500 text-sm mb-6">{coop.name}</p>}

      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <p className="text-sm text-gray-600">
          Olá, <span className="font-medium">{user?.email}</span>
          &nbsp;&mdash;&nbsp;
          <span className="inline-block bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded">
            {user?.profileType}
          </span>
        </p>
      </div>

      <h2 className="text-base font-semibold text-gray-700 mb-3">Módulos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {FUTURE_MODULES.map((m) => (
          <div
            key={m.label}
            className="bg-white rounded-xl shadow-sm p-4 flex flex-col items-center gap-2 opacity-40 cursor-not-allowed"
          >
            <span className="text-2xl">{m.icon}</span>
            <span className="text-sm font-medium text-gray-600">{m.label}</span>
            <span className="text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">Em breve</span>
          </div>
        ))}
      </div>
    </div>
  );
}
