# ImmuniQ — Règles du projet

## Git

- Auteur unique de tous les commits : `SOVON <jeovanidosantos12@gmail.com>`
- Aucun trailer `Co-Authored-By`, aucune mention d'agent ou d'outil IA dans les commits, le code ou la documentation
- Messages de commit simples et professionnels
- Ne jamais travailler sur `main` : une branche par chantier (`feat/mXX-*`, `docs/*`, `chore/*`), branches empilées selon les dépendances
- Pousser chaque branche sur `origin` après commit

## Architecture

- Monolithe modulaire NestJS + TypeORM/PostgreSQL (`services/api`), modules calqués sur le CDC M01–M13
- React web (`apps/web`), React Native/Expo (`apps/mobile`), PWA (`apps/portail`), types partagés (`packages/shared`)
- Offline-first : `local_id` idempotent sur les actes, synchronisation par opérations
- Vérifications : `pnpm typecheck` et `pnpm build` dans `services/api` avant chaque commit

## Directive documentation et transmission des connaissances (OBLIGATOIRE)

Le développement s'accompagne d'une vraie responsabilité pédagogique :

1. **Formation finale** : quand le projet est terminé/testé/validé, organiser une formation technique complète reprenant le projet chronologiquement (besoin → objectifs → architecture → outillage → base de données → backend → frontend → connexion → fonctionnalités → sécurité → tests → déploiement).
2. **Explication de chaque fonctionnalité** : objectif, fonctionnement complet, actions utilisateur, traitement technique, fichiers concernés, interactions frontend/backend/BDD, règles de gestion, contrôles de sécurité, tests.
3. **Explication du code** : chaque terme technique (langages, frameworks, classes, API, middlewares, migrations, auth…) défini simplement + utilité + exemple concret du projet. Ne jamais supposer le terme connu.
4. **Pédagogie** : progression débutant → avancé, exemples pratiques, analogies, erreurs rencontrées et solutions, extraits de code commentés.
5. **Vérification** : après chaque grande partie, questions, exercices pratiques, défis ; corriger et expliquer les erreurs.
6. **Documentation finale** : document technique et pédagogique structuré (présentation, architecture, arborescence, technologies, BDD, fonctionnalités, code commenté, API, installation/configuration/lancement/test/maintenance, glossaire, difficultés et solutions).
7. **Livrable DOCX obligatoire** : documentation finale au format `.docx` entièrement éditable — page de garde, sommaire, numérotation des pages, titres hiérarchisés, code en blocs distincts, schémas intégrés, procédures claires. Vérifier que le fichier est généré et ouvrable avant de considérer la documentation terminée.
