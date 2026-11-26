import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import CommandPalette, { usePaletteItems } from './CommandPalette';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  permission?: string;
  keywords?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/', label: 'Tableau de bord', icon: '◈', keywords: 'home dashboard accueil' },
      { to: '/beneficiaires', label: 'Bénéficiaires', icon: '☺', permission: 'beneficiary.read', keywords: 'patients dossier immuniq' },
      { to: '/vaccination', label: 'Vaccination', icon: '✚', permission: 'act.read', keywords: 'acte dose vaccin' },
      { to: '/campagnes', label: 'Campagnes', icon: '⚑', permission: 'campaign.read', keywords: 'campagne seance' },
    ],
  },
  {
    title: 'Référentiels',
    items: [
      { to: '/referentiels', label: 'Calendriers & règles', icon: '≡', permission: 'referential.read', keywords: 'vaccin calendrier regle' },
    ],
  },
  {
    title: 'Logistique',
    items: [
      { to: '/stocks', label: 'Stocks & lots', icon: '▤', permission: 'stock.read', keywords: 'stock lot produit' },
      { to: '/froid', label: 'Chaîne du froid', icon: '❄', permission: 'coldchain.read', keywords: 'temperature froid equipement' },
    ],
  },
  {
    title: 'Analyse',
    items: [
      { to: '/rapports', label: 'Rapports & exports', icon: '◫', permission: 'report.read', keywords: 'rapport statistique export csv' },
      { to: '/notifications', label: 'Notifications', icon: '✉', permission: 'notification.read', keywords: 'sms rappel message' },
    ],
  },
  {
    title: 'Système',
    items: [
      { to: '/utilisateurs', label: 'Utilisateurs & rôles', icon: '⚙', permission: 'account.read', keywords: 'compte role utilisateur' },
      { to: '/admin', label: 'Administration', icon: '⛭', permission: 'settings.read', keywords: 'parametre nomenclature sauvegarde' },
      { to: '/audit', label: "Journal d'audit", icon: '☰', permission: 'audit.read', keywords: 'audit log trace' },
    ],
  },
];

const initials = (u?: { firstName?: string; lastName?: string }) =>
  `${u?.firstName?.[0] ?? ''}${u?.lastName?.[0] ?? ''}`.toUpperCase() || 'U';

export default function Layout() {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const paletteItems = usePaletteItems();

  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.permission || hasPermission(i.permission)),
  })).filter((s) => s.items.length > 0);

  // Raccourci global Ctrl+K / Cmd+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-60 bg-immuniq-navy text-white flex flex-col fixed inset-y-0 z-20">
        <div className="flex items-center gap-3 px-5 py-5">
          <img src="/img/monogramme.png" alt="ImmuniQ" className="h-9 w-auto" />
          <div>
            <div className="text-base font-bold font-heading tracking-wide leading-tight">ImmuniQ</div>
            <div className="text-[10px] text-[#9FC3E8]">Santé · Togo</div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {sections.map((section) => (
            <div key={section.title}>
              <div className="px-5 pt-4 pb-1 text-[10px] uppercase tracking-widest text-[#7FA8CC]">
                {section.title}
              </div>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-2.5 text-[13px] transition-colors border-l-[3px] ${
                      isActive
                        ? 'bg-immuniq-teal/15 text-white border-immuniq-teal'
                        : 'text-[#CFE3F5] border-transparent hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <span className="w-5 text-center">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-immuniq-teal flex items-center justify-center text-white text-xs font-semibold">
              {initials(user ?? undefined)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-[10px] text-immuniq-teal-light truncate">{user?.role}</div>
            </div>
            <button
              onClick={onLogout}
              title="Déconnexion"
              className="text-white/50 hover:text-white text-sm transition-colors"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <header className="bg-surface/80 backdrop-blur border-b border-line px-6 h-[60px] flex items-center gap-4 sticky top-0 z-10">
          {/* Recherche globale → palette de commandes */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden sm:flex items-center gap-2.5 flex-1 max-w-md bg-immuniq-mist-light border border-line rounded-full px-4 py-2 text-sm text-muted hover:border-immuniq-teal/50 hover:bg-surface transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <span className="flex-1 text-left">Rechercher ou naviguer…</span>
            <kbd className="text-[10px] border border-line rounded px-1.5 py-0.5 bg-surface">Ctrl K</kbd>
          </button>
          <div className="sm:hidden flex-1" />

          <div className="flex items-center gap-3 ml-auto">
            <span className="hidden md:inline-block bg-immuniq-mist text-immuniq-navy rounded-full px-3 py-1 text-[11px] font-medium">
              {user?.role}
            </span>
            <div className="w-8 h-8 rounded-full bg-immuniq-teal text-white flex items-center justify-center text-xs font-semibold">
              {initials(user ?? undefined)}
            </div>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} items={paletteItems} />
    </div>
  );
}
