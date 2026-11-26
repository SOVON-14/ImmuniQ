import { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-line rounded-card shadow-card p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'navy' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    primary: 'bg-immuniq-teal hover:bg-immuniq-teal-dark text-white',
    navy: 'bg-immuniq-navy hover:bg-immuniq-navy-2 text-white',
    ghost: 'bg-transparent border border-line text-immuniq-navy hover:bg-immuniq-mist',
    danger: 'bg-immuniq-danger hover:opacity-90 text-white',
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`}
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
  const styles = {
    neutral: 'bg-immuniq-mist text-immuniq-navy',
    success: 'bg-green-100 text-success',
    warning: 'bg-amber-100 text-warning',
    danger: 'bg-red-100 text-immuniq-danger',
    info: 'bg-cyan-100 text-cyan-700',
  }[tone];
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles}`}>{children}</span>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  'w-full rounded-lg border border-line bg-immuniq-mist-light px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-immuniq-teal/40 focus:border-immuniq-teal transition';

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`w-10 h-10 border-4 border-immuniq-teal border-t-transparent rounded-full animate-spin ${className}`} />
  );
}
