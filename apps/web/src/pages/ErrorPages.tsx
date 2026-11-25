import ErrorPage from '../components/ErrorPage';

export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Page introuvable"
      message="La page que vous recherchez n'existe pas, a été déplacée ou le lien est incorrect."
      accent="teal"
      icon={
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
          <path d="M8 11h6" />
        </svg>
      }
    />
  );
}

export function ForbiddenPage() {
  return (
    <ErrorPage
      code="403"
      title="Accès refusé"
      message="Votre compte ne dispose pas des permissions nécessaires pour consulter cette page. Contactez un administrateur si vous pensez qu'il s'agit d'une erreur."
      accent="warning"
      icon={
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="M9.5 9.5 14.5 14.5" />
          <path d="M14.5 9.5 9.5 14.5" />
        </svg>
      }
      actions={
        <>
          <a
            href="/"
            className="inline-flex items-center px-6 py-2.5 rounded-lg bg-warning hover:bg-yellow-700 text-white text-sm font-semibold transition-colors"
          >
            Retour au tableau de bord
          </a>
          <a
            href="/"
            className="inline-flex items-center px-6 py-2.5 rounded-lg border border-line bg-surface text-muted text-sm font-medium hover:bg-immuniq-mist transition-colors"
          >
            Contacter le support
          </a>
        </>
      }
    />
  );
}

export function ServerErrorPage() {
  return (
    <ErrorPage
      code="500"
      title="Erreur serveur"
      message="Une erreur inattendue est survenue. Notre équipe a été notifiée. Réessayez dans quelques instants."
      accent="danger"
      icon={
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="8" rx="2" />
          <rect x="2" y="14" width="20" height="8" rx="2" />
          <path d="M6 6h.01" />
          <path d="M6 18h.01" />
        </svg>
      }
      actions={
        <>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-6 py-2.5 rounded-lg bg-danger hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Recharger la page
          </button>
          <a
            href="/"
            className="inline-flex items-center px-6 py-2.5 rounded-lg border border-line bg-surface text-muted text-sm font-medium hover:bg-immuniq-mist transition-colors"
          >
            Retour à l'accueil
          </a>
        </>
      }
    />
  );
}

export function OfflinePage() {
  return (
    <ErrorPage
      code="Hors-ligne"
      title="Connexion perdue"
      message="Impossible de joindre le serveur ImmuniQ. Vérifiez votre connexion réseau et réessayez."
      accent="navy"
      icon={
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0" />
          <path d="M1.42 9a16 16 0 0 1 21.16 0" />
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
          <line x1="12" y1="20" x2="12.01" y2="20" />
          <line x1="2" y1="2" x2="22" y2="22" />
        </svg>
      }
      actions={
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-6 py-2.5 rounded-lg bg-immuniq-navy hover:bg-immuniq-navy-light text-white text-sm font-semibold transition-colors"
        >
          Réessayer
        </button>
      }
    />
  );
}
