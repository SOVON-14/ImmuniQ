import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Beneficiaries from './pages/Beneficiaries';
import BeneficiaryDetail from './pages/BeneficiaryDetail';
import Placeholder from './pages/Placeholder';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-immuniq-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/beneficiaires" element={<Beneficiaries />} />
        <Route path="/beneficiaires/:id" element={<BeneficiaryDetail />} />
        <Route path="/vaccination" element={<Placeholder title="Vaccination" />} />
        <Route path="/referentiels" element={<Placeholder title="Référentiels" />} />
        <Route path="/campagnes" element={<Placeholder title="Campagnes" />} />
        <Route path="/stocks" element={<Placeholder title="Stocks & lots" />} />
        <Route path="/froid" element={<Placeholder title="Chaîne du froid" />} />
        <Route path="/notifications" element={<Placeholder title="Notifications" />} />
        <Route path="/rapports" element={<Placeholder title="Rapports" />} />
        <Route path="/utilisateurs" element={<Placeholder title="Utilisateurs" />} />
        <Route path="/admin" element={<Placeholder title="Administration" />} />
        <Route path="/audit" element={<Placeholder title="Journal d'audit" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
