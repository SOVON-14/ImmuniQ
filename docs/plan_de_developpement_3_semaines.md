# ImmuniQ — Plan de développement : 3 semaines

Version 1.0 — 23 novembre 2026
Statut : plan de travail proposé

> **Hypothèse de périmètre** : le cahier des charges complet (13 modules, 3 interfaces, offline-first, notifications multicanaux, BI) n'est pas réalisable en 3 semaines. Ce plan livre un **MVP Priorité 1** fonctionnel et testé — identité, comptes, structures, dossier vaccinal, actes — plus les fondations (modèle de données, RBAC, audit, sync-ready). Le reste est ordonnancé en backlog par ordre de valeur.

---

## 0. Ce qui existe déjà (socle livré)

| Livrable | État |
|---|---|
| Cadrage + CDC analysés | ✅ |
| Diagrammes draw.io (19 pages) | ✅ |
| Charte graphique + tokens | ✅ |
| Maquette HTML interactive (15 écrans) | ✅ en revue |
| Architecture technique + ADR-0001 | ✅ |
| Modèle de données détaillé | ✅ |
| Matrice RBAC | ✅ |
| Monorepo pnpm + squelette | ✅ |
| API NestJS : M01 identity, M06 org, M02 bénéficiaires | ✅ code (non testé en runtime — Docker à réparer) |

---

## 1. Organisation et rythme

**Équipe supposée** (adapter si différent) : 1 dev backend/fullstack + appui ponctuel frontend/design. Si vous êtes seul, les postes "frontend" et "QA" se font en binôme avec le backend ou sont réduits.

**Méthode** : branches par fonctionnalité (`feat/mXX-*`), PR courtes, revue quotidienne, démo en fin de journée, commit propre (auteur unique, messages professionnels).

**Journée type** : stand-up 15 min → dev → revue/PR → tests → commit.

---

## 2. Semaines

### SEMAINE 1 — Fondations backend + premiers écrans

**Objectif** : API MVP fonctionnelle de bout en bout sur données réelles + première interface web utilisable.

| Jour | Backend | Frontend / transverse |
|---|---|---|
| J1–J2 | Réparer env Docker (Postgres+Redis), lancer l'API, seed, tests fumée login/CRUD users | Scaffold `apps/web` (Vite+React+Tailwind+tokens ImmuniQ), layout + login branché sur `/auth/login` |
| J3–J4 | **M04 référentiels** : entités vaccins/calendriers/règles versionnés + endpoints lecture + validation workflow (draft→published) | Écran login fonctionnel + guard routes |
| J5 | **M05 actes vaccinaux (base)** : entité `vaccination_acts` (local_id, statuts, lot, campagne), endpoints create/list/get + règles de base (professionnel habilité, bénéficiaire existant) | Liste bénéficiaires (recherche IMQ-id) + fiche détail |

**Livrables S1** : API qui démarre sur Postgres réel ; login JWT+MFA fonctionnel ; CRUD utilisateurs/périmètre ; référentiel vaccinal administrable ; création d'acte vaccinal ; web : login + layout + 2 écrans branchés.

---

### SEMAINE 2 — Cœur métier : dossier vaccinal, actes, saisie mobile

**Objectif** : le parcours "vaccinateur" est utilisable, y compris partiellement hors ligne.

| Jour | Backend | Frontend / transverse |
|---|---|---|
| J6–J7 | **M05 compléments** : statuts d'actes (administré/reporté/annulé/non réalisé + motif), corrections historisées (`acte_corrections`), validation pro | Web : écran dossier bénéficiaire (historique + échéancier lu depuis référentiel) |
| J8 | **M12 sync (noyau)** : endpoint `POST /sync/operations` idempotent (`device_id`+`local_id`), accusé, statuts pending/synced/conflict ; journal des conflits | — |
| J9–J10 | **M03 dossier** : échéancier calculé depuis règles publiées, attestation PDF simple, endpoints dossier complet | Mobile : écran vaccinateur (recherche bénéficiaire → acte → sync simulée) en React Native/Expo ; ou version web mobile responsive si Expo pas prêt |

**Livrables S2** : un vaccinateur peut créer un bénéficiaire, enregistrer une dose (avec lot), la voir dans le dossier, et l'"envoyer" via le endpoint sync. Corrections tracées. Échéancier calculé depuis référentiel publié.

---

### SEMAINE 3 — MVP durci + recette + livraison

**Objectif** : démo pilote possible, code propre, documentation à jour.

| Jour | Backend | Frontend / transverse |
|---|---|---|
| J11–J12 | Durcissement : validation des DTO, gestion erreurs uniforme, rate-limit login, CORS strict, `.env` prod, README d'installation | Web : tableau de bord minimal (compteurs doses/bénéficiaires par structure) + écran stocks simple (lecture) |
| J13 | Tests : tests unitaires services critiques (auth, actes, calcul échéances, idempotence sync) ; correctifs | Revue UX maquette vs écrans réels |
| J14 | Recette interne : parcours complet admin→vaccinateur→dossier→sync ; correctifs bloquants | Corrections UI |
| J15 | Tag `v0.1.0-mvp`, notes de version, doc déploiement (docker-compose prod minimal), backlog priorisé | Demo + retours |

**Livrables S3** : MVP démo-able en local ; CI simple (typecheck+build+tests) ; backlog ordonné pour la suite.

---

## 3. Backlog ordonné (post-3 semaines)

| Ordre | Module | Pourquoi |
|---|---|---|
| 1 | M08 stocks/lots + M09 chaîne du froid | Indissociable de la sécurité vaccinale terrain |
| 2 | M07 campagnes | Pilote les actions de masse |
| 3 | M10 notifications (SMS/push) | Rappels = observance |
| 4 | M11 reporting/exports | Pilotage national |
| 5 | M12 sync avancée (conflits métier, offline complet mobile) | Durcissement terrain |
| 6 | M13 admin/supervision/paramétrage | Exploitation |
| 7 | Portail bénéficiaire (PWA) | Consultation citizens |
| 8 | Interopérabilité (IMQ-024) | v2 |

---

## 4. Risques du plan 3 semaines

| Risque | Mitigation |
|---|---|
| Périmètre trop large → tout à moitié fait | MVP strict Priorité 1 ; tout le reste en backlog |
| Docker Desktop instable sur ce poste | Prévoir ½ journée J1 pour réparer l'env ; alternative : Postgres local/WSL |
| Pas de données de référence vaccinale validées | Utiliser un référentiel **de test** clairement marqué ; les vrais calendriers attendent validation PnEV |
| Hors-ligne complet trop lourd pour S2 | Sync = endpoint idempotent + file locale simple ; vraie robustesse offline en backlog |
| Un seul dev = goulot | Prioriser backend (valeur) ; maquette HTML fait office de spec frontend |
| Pas de tests utilisateurs terrain | Recette interne + questionnaire vaccinateur pour la semaine suivante |

---

## 5. Critères de succès du MVP (alignés CDC §9)

- [ ] Un utilisateur ne voit/fait que ce que son rôle + périmètre autorise
- [ ] Un bénéficiaire garde son IMQ-id et son historique
- [ ] Un acte "non réalisé" n'est jamais compté comme dose
- [ ] Chaque acte validé est attribuable (auteur, date, lieu, lot)
- [ ] Les échéances affichées citent la version du référentiel utilisé
- [ ] Les corrections d'actes sont historisées sans effacement
- [ ] Les opérations sensibles sont dans l'audit_log
- [ ] Le sync endpoint est idempotent (rejouer = pas de doublon)

---

## 6. Jalons

| Jalon | Date cible | Contenu |
|---|---|---|
| M1 — API MVP tourne | Fin S1 | auth + org + bénéficiaires + référentiel + acte |
| M2 — Parcours vaccinateur | Fin S2 | dossier + échéancier + sync endpoint + mobile |
| M3 — MVP v0.1.0 | Fin S3 | durci, testé, documenté, démo |
