import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface ErrorPageProps {
  /** Gros chiffre affiché en filigrane (404, 403, 500…) */
  code: string;
  title: string;
  message: string;
  /** Pictogramme SVG décoratif */
  icon: ReactNode;
  /** Couleur d'accent du pictogramme */
  accent?: 'teal' | 'navy' | 'warning' | 'danger';
  actions?: ReactNode;
}

const ACCENTS = {
  teal: { ring: 'from-immuniq-teal/30', icon: 'text-immuniq-teal-dark', button: 'bg-immuniq-teal hover:bg-immuniq-teal-dark' },
  navy: { ring: 'from-immuniq-navy/30', icon: 'text-immuniq-navy', button: 'bg-immuniq-navy hover:bg-immuniq-navy-light' },
  warning: { ring: 'from-warning/30', icon: 'text-warning', button: 'bg-warning hover:bg-yellow-700' },
  danger: { ring: 'from-danger/30', icon: 'text-danger', button: 'bg-danger hover:bg-red-700' },
};

/**
 * Mise en page commune des pages d'erreur — design propre et distinct :
 * grand chiffre en filigrane, halo dégradé, pictogramme et actions.
 */
export default function ErrorPage({ code, title, message, icon, accent = 'teal', actions }: ErrorPageProps) {
  const a = ACCENTS[accent];
  return (
    <div className="min-h-screen flex items-center justify-center bg-immuniq-mist-light p-4 relative overflow-hidden">
      {/* Halo décoratif */}
      <div
        className={`absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-gradient-to-br ${a.ring} to-transparent blur-3xl opacity-60 pointer-events-none`}
      />
      <div
        className="absolute -bottom-40 -left-32 w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-immuniq-teal/15 to-transparent blur-3xl pointer-events-none"
      />

      <div className="relative text-center max-w-lg">
        {/* Chiffre en filigrane */}
        <div className="font-heading font-bold text-[140px] leading-none text-immuniq-navy/10 select-none">
          {code}
        </div>

        <div className={`mx-auto -mt-24 w-20 h-20 rounded-2xl bg-surface shadow-card border border-line flex items-center justify-center ${a.icon} mb-6 relative`}>
          {icon}
        </div>

        <h1 className="text-2xl font-bold text-immuniq-navy mb-2">{title}</h1>
        <p className="text-muted text-sm mb-8">{message}</p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {actions ?? (
            <Link
              to="/"
              className={`inline-flex items-center px-6 py-2.5 rounded-lg text-white text-sm font-semibold transition-colors ${a.button}`}
            >
              Retour au tableau de bord
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
