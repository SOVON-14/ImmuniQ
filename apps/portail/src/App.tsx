import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import PortalLayout from './components/PortalLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import LinkBeneficiary from './pages/LinkBeneficiary';
import Dashboard from './pages/Dashboard';
import Dossier from './pages/Dossier';
import Echeances from './pages/Echeances';
import Rappels from './pages/Rappels';
import Aide from './pages/Aide';
import NotFound from './pages/NotFound';
import { Spinner } from './components/ui';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!user) return <Navigate to="/connexion" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/connexion" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <PortalLayout />
          </RequireAuth>
        }
      >
        <Route path="espace" element={<Dashboard />} />
        <Route path="espace/lien" element={<LinkBeneficiary />} />
        <Route path="espace/dossier/:id" element={<Dossier />} />
        <Route path="espace/echeances" element={<Echeances />} />
        <Route path="espace/rappels" element={<Rappels />} />
        <Route path="espace/aide" element={<Aide />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
