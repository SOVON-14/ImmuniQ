import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

const NAV = [
  { to: '/espace', label: 'Accueil', end: true },
  { to: '/espace/echeances', label: 'Échéances' },
  { to: '/espace/rappels', label: 'Rappels' },
  { to: '/espace/aide', label: 'Aide' },
];

export default function PortalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface border-b border-line sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/img/monogramme.png" alt="ImmuniQ" className="h-9 w-auto" />
            <span className="font-heading font-bold text-immuniq-navy text-lg">ImmuniQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive ? 'bg-immuniq-mist text-immuniq-navy' : 'text-muted hover:text-immuniq-navy hover:bg-immuniq-mist-light'
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user && (
              <span className="hidden sm:block text-sm text-muted">
                {user.firstName} {user.lastName}
              </span>
            )}
            <button
              onClick={onLogout}
              className="text-sm font-medium text-muted hover:text-immuniq-danger transition"
            >
              Quitter
            </button>
          </div>
        </div>
        {/* Nav mobile */}
        <nav className="md:hidden flex gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  isActive ? 'bg-immuniq-teal text-white' : 'bg-immuniq-mist text-muted'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-surface mt-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 text-center">
          <p className="text-xs text-muted">
            ImmuniQ — Ministère de la Santé · République Togolaise · Données protégées et confidentielles
          </p>
        </div>
      </footer>
    </div>
  );
}
