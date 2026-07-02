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
        aria-label="Navegação lateral"
        className={[
          'fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-900 flex flex-col border-r border-slate-200 shadow-sm',
          'transform transition-transform duration-300 ease-in-out',
          'lg:relative lg:translate-x-0 lg:flex',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo header */}
        <div className="h-20 px-4 border-b border-slate-200 flex items-center justify-between">
          <img
            src="/brand/logo-horizontal-color.png"
            alt="EcoCoop"
            className="h-14 w-auto max-w-[190px] object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <span
            className="text-xl font-bold text-emerald-700 hidden"
            aria-hidden="true"
          >
            EcoCoop
          </span>

          {/* Close button — mobile only */}
          <button
            className="lg:hidden p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-500"
            onClick={onClose}
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav
          className="flex-1 overflow-y-auto p-3 space-y-0.5"
          aria-label="Navegação principal"
        >
          {navLinks.map((link) => {
            if (!hasAccess(link.module)) return null;
            const isActive = pathname === link.to || (link.to !== '/' && pathname.startsWith(link.to));
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={[
                  'relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-petroleo-500 focus-visible:ring-inset',
                  isActive
                    ? 'bg-petroleo-50 text-petroleo-900 shadow-[0_8px_20px_rgba(13,94,131,0.12)] ring-1 ring-petroleo-100'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-petroleo-600"
                    aria-hidden="true"
                  />
                )}
                {link.icon && <span className="w-4 h-4 shrink-0" aria-hidden="true">{link.icon}</span>}
                <span className={isActive ? 'pl-1' : ''}>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
