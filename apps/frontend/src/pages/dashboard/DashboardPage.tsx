import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api.client';
import { PageHeader, Badge } from '../../components/ui';

interface Cooperative {
  id: string;
  name: string;
  cnpj: string;
}

interface ActiveCardProps {
  label: string;
  description: string;
  to: string;
  icon: string;
  helperText?: string;
}

function ActiveCard({ label, description, to, icon, helperText }: ActiveCardProps) {
  return (
    <Link
      to={to}
      className="group bg-white rounded-xl border border-grafite-200 p-4 flex flex-col gap-2 hover:border-petroleo-400 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-500 focus-visible:ring-offset-2"
    >
      <span className="text-2xl" role="img" aria-hidden="true">{icon}</span>
      <span className="text-sm font-semibold text-grafite-900 group-hover:text-petroleo-700 transition-colors leading-snug">
        {label}
      </span>
      <span className="text-xs text-grafite-500 leading-relaxed">{description}</span>
      {helperText && (
        <span className="text-xs text-petroleo-600 bg-petroleo-50 rounded px-2 py-1 mt-1 leading-relaxed">
          {helperText}
        </span>
      )}
    </Link>
  );
}

interface DisabledCardProps {
  label: string;
  icon: string;
}

function DisabledCard({ label, icon }: DisabledCardProps) {
  return (
    <div
      className="bg-white rounded-xl border border-grafite-100 p-4 flex flex-col gap-2 opacity-50 cursor-not-allowed select-none"
      aria-disabled="true"
    >
      <span className="text-2xl" role="img" aria-hidden="true">{icon}</span>
      <span className="text-sm font-semibold text-grafite-600 leading-snug">{label}</span>
      <Badge variant="inactive" label="Em breve" size="sm" className="self-start" />
    </div>
  );
}

interface GroupProps {
  title: string;
  children: React.ReactNode;
}

function Group({ title, children }: GroupProps) {
  return (
    <section className="mb-8">
      <h2 className="text-xs font-semibold text-grafite-500 uppercase tracking-widest mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {children}
      </div>
    </section>
  );
}

export function DashboardPage() {
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
      <PageHeader
        title="Dashboard"
        subtitle={coop?.name}
        className="mb-6"
      />

      <Group title="Cadastros">
        <ActiveCard icon="👥" label="Cooperados" description="Gestão dos cooperados" to="/members" />
        <ActiveCard icon="🪪" label="Funções" description="Perfis e funções dos cooperados" to="/member-roles" />
        <ActiveCard icon="🗂️" label="Categorias" description="Categorias de materiais" to="/material-categories" />
        <ActiveCard icon="📁" label="Subcategorias" description="Subcategorias de materiais" to="/material-subcategories" />
        <ActiveCard icon="📐" label="Unidades" description="Unidades de medida" to="/units" />
        <ActiveCard icon="🏪" label="Compradores" description="Compradores cadastrados" to="/buyers" />
        <ActiveCard icon="🚛" label="Veículos" description="Frota de veículos" to="/vehicles" />
        <ActiveCard icon="🦺" label="Tipos de EPI" description="Equipamentos de proteção individual" to="/epi-types" />
        <ActiveCard icon="🏷️" label="Centros de Custo" description="Centros de custo operacionais" to="/cost-centers" />
      </Group>

      <Group title="Coleta">
        <ActiveCard icon="📍" label="Pontos de Coleta" description="Gestão e listagem dos pontos de coleta" to="/collection-points" />
        <ActiveCard icon="🗺️" label="Rotas de Coleta" description="Planejamento e listagem das rotas" to="/collection-routes" />
        <ActiveCard icon="▶️" label="Execução de Rotas" description="Acesso operacional ao fluxo de execução de rotas" to="/collection-routes" />
      </Group>

      <Group title="Material Bruto">
        <ActiveCard
          icon="📥"
          label="Entrada de Material Bruto"
          description="Registro de entradas de material bruto por rota"
          to="/collection-routes"
          helperText="Acesse via Rotas de Coleta > Detalhe da Rota"
        />
        <ActiveCard icon="⚖️" label="Saldo Bruto" description="Consulta do saldo bruto de materiais" to="/raw-material-balance" />
      </Group>

      <Group title="Em breve">
        <DisabledCard icon="🔬" label="Triagem" />
        <DisabledCard icon="📦" label="Estoque pronto" />
        <DisabledCard icon="🗑️" label="Rejeito" />
        <DisabledCard icon="💰" label="Vendas operacionais" />
        <DisabledCard icon="📊" label="Financeiro" />
        <DisabledCard icon="🤝" label="Rateio" />
        <DisabledCard icon="📋" label="Relatórios avançados" />
      </Group>
    </div>
  );
}
