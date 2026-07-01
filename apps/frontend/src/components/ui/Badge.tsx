export type BadgeVariant =
  | 'active'
  | 'inactive'
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'pending';

export interface BadgeProps {
  variant: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const VARIANT_LABELS: Record<BadgeVariant, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  planned: 'Planejada',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
  pending: 'Pendente',
};

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  active: 'bg-green-50 text-green-700 border-green-200',
  inactive: 'bg-grafite-100 text-grafite-600 border-grafite-200',
  planned: 'bg-sky-50 text-sky-700 border-sky-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-ecocoop-50 text-ecocoop-700 border-ecocoop-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  pending: 'bg-orange-50 text-orange-700 border-orange-200',
};

const SIZE_CLASSES: Record<'sm' | 'md', string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

export function Badge({ variant, label, size = 'md', className = '' }: BadgeProps) {
  const resolvedLabel = label ?? VARIANT_LABELS[variant];

  return (
    <span
      role="status"
      aria-label={resolvedLabel}
      className={[
        'inline-flex items-center font-medium rounded-full border',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {resolvedLabel}
    </span>
  );
}
