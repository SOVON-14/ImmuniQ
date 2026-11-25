import { ReactNode } from 'react';
import { Card, PageHeader, Spinner } from '../components/ui';

export default function Placeholder({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      {children ?? (
        <Card className="p-8">
          <Spinner />
          <p className="text-center text-muted text-sm">Écran en cours de développement.</p>
        </Card>
      )}
    </div>
  );
}
