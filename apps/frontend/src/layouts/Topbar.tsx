import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import type { BadgeVariant } from '../components/ui/Badge';

export interface TopbarProps {
  onMenuClick: () => void;
}

function profileTypeToBadgeVariant(profileType: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    ADMIN: 'active',
    MANAGER: 'in_progress',
    SORTER: 'planned',
    DRIVER: 'planned',
    MEMBER: 'inactive',
    BUYER: 'pending',
  };
  return map[profileType] ?? 'inactive';
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-grafite-200 h-14 px-4 flex items-center justify-between shadow-sm shrink-0">
      {/* Left: hamburger + breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="lg:hidden p-2 rounded text-grafite-700 hover:bg-grafite-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-500"
          onClick={onMenuClick}
          aria-label="Abrir menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Breadcrumbs />
      </div>

      {/* Right: user info + logout */}
      <div className="flex items-center gap-3 shrink-0 ml-4">
        {user && (
          <>
            <span className="hidden sm:block text-sm text-grafite-700 truncate max-w-[160px]">
              {user.email}
            </span>
            {(() => {
              // API returns profile.type (Prisma relation); profileType may be absent at runtime
              const pt = (user.profileType as string | undefined) ?? (user as unknown as { profile?: { type?: string } }).profile?.type;
              if (!pt) return null;
              return (
                <Badge
                  variant={profileTypeToBadgeVariant(pt)}
                  label={pt}
                  size="sm"
                />
              );
            })()}
          </>
        )}
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          Sair
        </Button>
      </div>
    </header>
  );
}
