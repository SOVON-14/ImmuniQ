import { Link } from 'react-router-dom';
import { Card } from '../components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-immuniq-mist-light p-4">
      <Card className="p-10 text-center max-w-md">
        <div className="text-6xl font-bold text-immuniq-teal mb-2">404</div>
        <h1 className="text-xl font-bold text-immuniq-navy mb-2">Page introuvable</h1>
        <p className="text-muted text-sm mb-6">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 rounded-md bg-immuniq-teal hover:bg-immuniq-teal-dark text-white text-sm font-medium transition-colors"
        >
          Retour au tableau de bord
        </Link>
      </Card>
    </div>
  );
}
