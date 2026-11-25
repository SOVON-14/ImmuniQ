import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  permission?: string;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: '▦' },
  { to: '/beneficiaires', label: 'Bénéficiaires', icon: '☺', permission: 'beneficiary.read' },
  { to: '/vaccination', label: 'Vaccination', icon: '✚', permission: 'act.read' },
  { to: '/referentiels', label: 'Référentiels', icon: '≡', permission: 'referential.read' },
  { to: '/campagnes', label: 'Campagnes', icon: '◎', permission: 'campaign.read' },
  { to: '/stocks', label: 'Stocks & lots', icon: '▤', permission: 'stock.read' },
  { to: '/froid', label: 'Chaîne du froid', icon: '❄', permission: 'cold_chain.read' },
  { to: '/notifications', label: 'Notifications', icon: '✉', permission: 'notification.read' },
  { to: '/rapports', label: 'Rapports', icon: '◫', permission: 'report.read' },
  { to: '/utilisateurs', label: 'Utilisateurs', icon: '⚉', permission: 'user.read' },
  { to: '/admin', label: 'Administration', icon: '⚙', permission: 'admin.read' },
  { to: '/audit', label: "Journal d'audit", icon: '☰', permission: 'audit.read' },
];

export default function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const items = NAV.filter((i) => !i.permission || hasPermission(i.permission));

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-immuniq-navy text-white flex flex-col fixed inset-y-0">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="text-xl font-bold font-heading tracking-wide">ImmuniQ</div>
          <div className="text-xs text-immuniq-teal-light">Gestion de la vaccination</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-immuniq-teal/20 text-white border-r-2 border-immuniq-teal'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10 text-xs text-white/60">
          {user?.firstName} {user?.lastName}
          <div className="text-immuniq-teal-light">{user?.role}</div>
        </div>
      </aside>

      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <header className="bg-surface border-b border-line px-6 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="text-sm text-muted">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <button
            onClick={onLogout}
            className="text-sm text-muted hover:text-danger transition-colors"
          >
            Déconnexion
          </button>
        </header>
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
