import { ReactNode } from 'react';

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className = '' }: DashboardGridProps) {
  return (
    <div className={`dashboard-grid ${className}`} role="region" aria-label="Dashboard widgets">
      {children}
    </div>
  );
}

interface DashboardSectionProps {
  children: ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function DashboardSection({ children, columns = 2, className = '' }: DashboardSectionProps) {
  const colClass = columns === 1 ? 'dashboard-section-1' : columns === 3 ? 'dashboard-section-3' : 'dashboard-section-2';
  return (
    <div className={`${colClass} ${className}`}>
      {children}
    </div>
  );
}
