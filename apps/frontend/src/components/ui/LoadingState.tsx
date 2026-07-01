export interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton';
  rows?: number;
  message?: string;
  className?: string;
}

const SKELETON_WIDTHS = ['w-full', 'w-3/4', 'w-5/6', 'w-2/3', 'w-full'];

export function LoadingState({
  variant = 'spinner',
  rows = 5,
  message = 'Carregando...',
  className = '',
}: LoadingStateProps) {
  if (variant === 'skeleton') {
    return (
      <div role="status" aria-label={message} className={`space-y-3 ${className}`}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`h-4 bg-grafite-200 animate-pulse rounded ${SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]}`}
          />
        ))}
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={message}
      className={`flex flex-col items-center justify-center py-12 gap-3 ${className}`}
    >
      <svg
        className="w-8 h-8 animate-spin text-petroleo-600"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <span className="text-sm text-grafite-500">{message}</span>
    </div>
  );
}
