import { Link, useLocation } from 'react-router-dom';

export interface NavLink {
  to: string;
  label: string;
  module: string;
  icon?: React.ReactNode;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navLinks: NavLink[];
  hasAccess: (module: string) => boolean;
}

export function Sidebar({ isOpen, onClose, navLinks, hasAccess }: SidebarProps) {
  const { pathname } = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 bg-[#0e2540] text-white flex flex-col shadow-xl',
          'transform transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0 lg:flex',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo header */}
        <div className="px-4 py-4 border-b border-[#163756] flex items-center justify-between">
          <img
            src="/brand/logo-horizontal-color.png"
            alt="EcoCoop"
            className="h-12 w-auto max-w-[160px] object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <span
            className="text-xl font-bold text-white hidden"
            aria-hidden="true"
          >
            EcoCoop
          </span>

          {/* Close button — mobile only */}
          <button
            className="lg:hidden p-1 rounded text-slate-200 hover:text-white hover:bg-[#163756] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5" aria-label="Navegação principal">
          {navLinks.map((link) => {
            if (!hasAccess(link.module)) return null;
            const isActive = pathname === link.to || (link.to !== '/' && pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={[
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[#163756] text-white shadow-sm'
                    : 'text-slate-200 hover:bg-[#163756]/70 hover:text-white',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {link.icon && <span className="w-4 h-4 shrink-0" aria-hidden="true">{link.icon}</span>}
                {link.label}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
