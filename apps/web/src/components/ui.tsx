import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface rounded-card shadow-card border border-line ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  const styles = {
    primary: 'bg-immuniq-teal hover:bg-immuniq-teal-dark text-white',
    secondary: 'bg-immuniq-navy hover:bg-immuniq-navy-light text-white',
    danger: 'bg-danger hover:bg-red-700 text-white',
    ghost: 'bg-transparent hover:bg-immuniq-mist text-immuniq-navy border border-line',
  }[variant];
  return (
    <button
      className={`px-4 py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
}) {
  const tones = {
    neutral: 'bg-immuniq-mist text-immuniq-navy',
    success: 'bg-green-100 text-success',
    warning: 'bg-yellow-100 text-warning',
    danger: 'bg-red-100 text-danger',
    info: 'bg-teal-100 text-immuniq-teal-dark',
  }[tone];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tones}`}>
      {children}
    </span>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2 rounded-md border border-line bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-immuniq-teal focus:border-transparent ${props.className ?? ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 rounded-md border border-line bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-immuniq-teal ${props.className ?? ''}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-immuniq-teal border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'Erreur inconnue';
  return (
    <div className="bg-red-50 border border-red-200 text-danger text-sm rounded-md px-4 py-3 mb-4">
      {message}
    </div>
  );
}

export function EmptyState({ message = 'Aucune donnée' }: { message?: string }) {
  return <div className="text-center text-muted py-10 text-sm">{message}</div>;
}

export function Table({
  head,
  children,
}: {
  head: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {head.map((h) => (
              <th key={h} className="px-4 py-3 font-semibold text-immuniq-navy whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-3xl font-bold text-immuniq-navy mt-1">{value}</div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </Card>
  );
}
