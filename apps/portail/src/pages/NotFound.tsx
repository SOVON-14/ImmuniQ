import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-7xl font-bold text-immuniq-navy/10 select-none">404</p>
      <h1 className="text-2xl font-bold -mt-6 mb-2">Page introuvable</h1>
      <p className="text-sm text-muted mb-6 max-w-sm">
        La page que vous cherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/">
        <Button>Retour à l'accueil</Button>
      </Link>
    </div>
  );
}
