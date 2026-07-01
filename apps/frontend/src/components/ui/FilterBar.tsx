export interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

export function FilterBar({ children, className = '' }: FilterBarProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm p-4 flex flex-wrap items-center gap-3 mb-6 ${className}`}
    >
      {children}
    </div>
  );
}
