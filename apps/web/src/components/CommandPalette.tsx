import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export interface PaletteItem {
  to: string;
  label: string;
  icon: string;
  section: string;
  keywords?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: PaletteItem[];
}

/**
 * Palette de commandes style Spotlight : Ctrl+K ou clic sur la recherche.
 * Navigation clavier : ↑/↓ pour choisir, Entrée pour aller, Échap pour fermer.
 */
export default function CommandPalette({ open, onClose, items }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.label.toLowerCase().includes(q) ||
        i.section.toLowerCase().includes(q) ||
        (i.keywords ?? '').toLowerCase().includes(q),
    );
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  useEffect(() => {
    const el = listRef.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  if (!open) return null;

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[index]) {
      e.preventDefault();
      go(filtered[index].to);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  let lastSection = '';

  return (
    <div
      className="fixed inset-0 z-50 bg-immuniq-navy/40 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface rounded-2xl shadow-2xl border border-line overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 px-4 border-b border-line">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une page, une action…"
            className="flex-1 py-4 bg-transparent text-sm focus:outline-none"
          />
          <kbd className="text-[10px] text-muted border border-line rounded px-1.5 py-0.5">Échap</kbd>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted">
              Aucun résultat pour « {query} »
            </div>
          )}
          {filtered.map((item, i) => {
            const header = item.section !== lastSection ? item.section : null;
            lastSection = item.section;
            return (
              <div key={item.to}>
                {header && (
                  <div className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                    {header}
                  </div>
                )}
                <button
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(item.to)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                    i === index ? 'bg-immuniq-mist text-immuniq-navy' : 'text-ink'
                  }`}
                >
                  <span className="w-6 text-center text-base">{item.icon}</span>
                  <span className="flex-1">{item.label}</span>
                  {i === index && (
                    <kbd className="text-[10px] text-muted border border-line rounded px-1.5 py-0.5 bg-surface">
                      ↵
                    </kbd>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-line flex gap-4 text-[10px] text-muted">
          <span>↑↓ naviguer</span>
          <span>↵ ouvrir</span>
          <span>Échap fermer</span>
        </div>
      </div>
    </div>
  );
}

/** Expose les items de navigation filtrés par permission (partagé Layout + palette). */
export function usePaletteItems(): PaletteItem[] {
  const { hasPermission } = useAuth();
  // La structure NAV vit dans Layout — on la duplique ici volontairement
  // pour garder la palette autonome et testable.
  return useMemo(() => {
    const all: (PaletteItem & { permission?: string })[] = [
      { to: '/', label: 'Tableau de bord', icon: '◈', section: 'Pilotage', keywords: 'home dashboard accueil' },
      { to: '/beneficiaires', label: 'Bénéficiaires', icon: '☺', section: 'Pilotage', permission: 'beneficiary.read', keywords: 'patients dossier immuniq' },
      { to: '/vaccination', label: 'Vaccination', icon: '✚', section: 'Pilotage', permission: 'act.read', keywords: 'acte dose vaccin' },
      { to: '/campagnes', label: 'Campagnes', icon: '⚑', section: 'Pilotage', permission: 'campaign.read', keywords: 'campagne seance' },
      { to: '/referentiels', label: 'Calendriers & règles', icon: '≡', section: 'Référentiels', permission: 'referential.read', keywords: 'vaccin calendrier regle' },
      { to: '/stocks', label: 'Stocks & lots', icon: '▤', section: 'Logistique', permission: 'stock.read', keywords: 'stock lot produit' },
      { to: '/froid', label: 'Chaîne du froid', icon: '❄', section: 'Logistique', permission: 'coldchain.read', keywords: 'temperature froid equipement' },
      { to: '/rapports', label: 'Rapports & exports', icon: '◫', section: 'Analyse', permission: 'report.read', keywords: 'rapport statistique export csv' },
      { to: '/notifications', label: 'Notifications', icon: '✉', section: 'Analyse', permission: 'notification.read', keywords: 'sms rappel message' },
      { to: '/utilisateurs', label: 'Utilisateurs & rôles', icon: '⚙', section: 'Système', permission: 'account.read', keywords: 'compte role utilisateur' },
      { to: '/admin', label: 'Administration', icon: '⛭', section: 'Système', permission: 'settings.read', keywords: 'parametre nomenclature sauvegarde' },
      { to: '/audit', label: "Journal d'audit", icon: '☰', section: 'Système', permission: 'audit.read', keywords: 'audit log trace' },
    ];
    return all
      .filter((i) => !i.permission || hasPermission(i.permission))
      .map(({ permission: _p, ...i }) => i);
  }, [hasPermission]);
}
