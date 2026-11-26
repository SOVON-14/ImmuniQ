import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button } from '../components/ui';

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-immuniq-navy via-immuniq-navy-2 to-immuniq-navy-light text-white">
        <div className="absolute inset-0 opacity-[0.07]">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-immuniq-teal animate-[float_9s_ease-in-out_infinite]" />
          <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full bg-immuniq-teal-light animate-[float_12s_ease-in-out_infinite_reverse]" />
        </div>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-xs font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-immuniq-teal-light" />
            Programme national de vaccination — Togo
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight !text-white">
            Votre santé vaccinale,
            <br />
            <span className="text-immuniq-teal-light">simple et sécurisée</span>
          </h1>
          <p className="mt-5 text-white/70 max-w-xl mx-auto text-sm sm:text-base">
            Consultez le dossier vaccinal de votre famille, suivez les échéances et recevez des rappels au bon moment.
          </p>
          <div className="mt-8">
            {user ? (
              <Link to="/espace">
                <Button className="!px-8 !py-3 !text-base">Accéder à mon espace</Button>
              </Link>
            ) : (
              <Link to="/connexion">
                <Button className="!px-8 !py-3 !text-base">Accéder à mon espace</Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Aperçu */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-10 relative z-10">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: '💉', title: 'Dossier vaccinal', text: 'Historique complet des vaccinations de vos proches, vérifié par les professionnels de santé.' },
            { icon: '📅', title: 'Échéancier', text: 'Les prochaines doses à faire, calculées automatiquement selon le calendrier officiel.' },
            { icon: '🔔', title: 'Rappels', text: 'Recevez un rappel SMS ou notification avant chaque échéance importante.' },
          ].map((f) => (
            <div key={f.title} className="bg-surface border border-line rounded-card shadow-card p-6">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-base font-bold text-immuniq-navy mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>

        {/* Exemple de carte vaccinale */}
        <div className="mt-10 bg-surface border border-line rounded-card shadow-card p-6">
          <h2 className="text-lg font-bold text-immuniq-navy mb-4">Aperçu de votre espace</h2>
          <div className="space-y-3">
            {[
              { name: 'BCG', date: '28/03/2026', place: 'CS Adidogomé', tone: 'success' as const, label: 'Fait' },
              { name: 'Penta 3', date: '02/10/2026', place: 'CS Adidogomé', tone: 'success' as const, label: 'Fait' },
              { name: 'Rougeole 1', date: '12/01/2027', place: 'Rappel programmé par SMS', tone: 'warning' as const, label: 'À venir' },
            ].map((v) => (
              <div
                key={v.name}
                className={`flex items-center gap-3 rounded-xl border p-4 ${
                  v.tone === 'warning' ? 'border-amber-200 bg-amber-50/60' : 'border-line'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${v.tone === 'success' ? 'bg-success' : 'bg-warning'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-immuniq-navy">
                    {v.name}
                    {v.tone === 'success' ? ` — administrée le ${v.date}` : ` — recommandée le ${v.date}`}
                  </p>
                  <p className="text-xs text-muted">{v.place}</p>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0 ${
                    v.tone === 'success' ? 'bg-green-100 text-success' : 'bg-amber-100 text-warning'
                  }`}
                >
                  {v.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
