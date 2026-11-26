import { Card } from '../components/ui';

const FAQ = [
  {
    q: 'Comment obtenir mon identifiant ImmuniQ (IMQ-id) ?',
    a: 'Votre IMQ-id figure sur votre carnet de vaccination papier ou vous est communiqué par le centre de santé lors d\'une visite. Il commence toujours par « IMQ- ».',
  },
  {
    q: 'Je ne retrouve pas mon dossier. Que faire ?',
    a: 'Vérifiez que la date de naissance saisie correspond exactement à celle enregistrée par le professionnel de santé. En cas de doute, rapprochez-vous de votre centre de santé ou de la direction départementale de la santé.',
  },
  {
    q: 'Puis-je lier le dossier de mon enfant ?',
    a: 'Oui. Après vous être connecté, utilisez « Lier mon dossier » avec l\'IMQ-id et la date de naissance de l\'enfant. Votre compte aura alors accès aux dossiers que vous avez explicitement rattachés.',
  },
  {
    q: 'Que signifient les statuts « À faire », « À venir » et « En retard » ?',
    a: '« À venir » : la dose n\'est pas encore éligible. « À faire » : la dose est éligible maintenant. « En retard » : la fenêtre recommandée est dépassée — il est important de rattraper la dose rapidement.',
  },
  {
    q: 'Comment fonctionne le carnet vaccinal téléchargeable ?',
    a: 'Le bouton « Imprimer / télécharger » ouvre une version imprimable de votre dossier. Vous pouvez l\'enregistrer en PDF depuis la boîte de dialogue d\'impression de votre navigateur.',
  },
  {
    q: 'Mes données sont-elles protégées ?',
    a: 'Oui. ImmuniQ est un système national sécurisé : vos données de santé ne sont visibles que par vous-même et les professionnels autorisés. Chaque consultation est journalisée.',
  },
];

export default function Aide() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-2xl font-bold mb-1">Aide et questions fréquentes</h1>
      <p className="text-sm text-muted mb-8">
        Tout ce qu'il faut savoir pour utiliser votre espace bénéficiaire.
      </p>

      <div className="space-y-3">
        {FAQ.map((f) => (
          <Card key={f.q}>
            <h2 className="font-semibold text-immuniq-navy text-sm mb-1.5">{f.q}</h2>
            <p className="text-sm text-muted leading-relaxed">{f.a}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-immuniq-navy !border-immuniq-navy text-white">
        <h2 className="font-bold mb-1">Besoin d'assistance ?</h2>
        <p className="text-sm text-white/70">
          Contactez votre centre de santé ou la direction départementale de la santé la plus proche.
          Ne partagez jamais votre mot de passe, même avec un agent.
        </p>
      </Card>
    </div>
  );
}
