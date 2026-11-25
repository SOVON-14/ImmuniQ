import { Component, ReactNode } from 'react';
import { ServerErrorPage } from '../pages/ErrorPages';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Boundary React : intercepte les erreurs de rendu des composants enfants
 * et affiche une page d'erreur conviviale au lieu d'un écran blanc.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Journalisation côté console — brancher ici un service de monitoring si besoin.
    console.error('Erreur React interceptée :', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return <ServerErrorPage />;
    return this.props.children;
  }
}
