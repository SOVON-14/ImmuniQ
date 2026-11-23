# ImmuniQ — Document d'architecture technique

Version 0.1 — 23 novembre 2026
Statut : proposition de cadrage technique (à valider avec l'équipe et les autorités)

> Ce document fixe les orientations techniques. Il ne choisit pas encore les versions figées : celles-ci seront arrêtées au démarrage du développement (dossier technique).

---

## 1. Principes directeurs

Issus du cahier des charges fonctionnel et du document de cadrage :

1. **Offline-first** : les équipes mobiles doivent pouvoir travailler sans réseau ; la synchronisation est un cas d'usage central, pas une option.
2. **Multi-interfaces, même cœur** : web, mobile et portail bénéficiaire consomment la même API et les mêmes règles métier.
3. **Monolithe modulaire d'abord** : le CDC demande de ne pas préjuger des microservices. On part d'un backend modulaire (modular monolith) découpé en domaines (M01–M13) ; extraction en services seulement si la charge ou l'équipe le justifient.
4. **Règles métier centralisées** : calendriers, doses, intervalles, permissions — jamais dupliquées côté client. Le client affiche, le serveur décide.
5. **Traçabilité par défaut** : tout acte sensible est attribuable (auteur, horodatage, contexte) et historisé.
6. **Sécurité et confidentialité** : données de santé → chiffrement en transit et au repos, moindre privilège, journalisation.
7. **Déploiement sobre** : infrastructure simple à opérer (contexte : déploiement national, ressources probablement limitées).

---

## 2. Vue d'ensemble

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  App mobile     │  │  App web        │  │  Portail        │
│  (équipes,      │  │  (admin,        │  │  bénéficiaire   │
│   hors ligne)   │  │   autorités,    │  │  (PWA léger)    │
│                 │  │   supervision)  │  │                 │
└───────┬─────────┘  └───────┬─────────┘  └───────┬─────────┘
        │  API REST + sync     │  API REST          │  API REST (restreinte)
        └──────────┬──────────┴───────────────────┘
                   ▼
        ┌─────────────────────┐
        │   API Gateway /     │  authN, rate-limit, routage
        │   Backend modulaire │
        │  (domaines M01–M13) │
        └──────┬──────────────┘
               │
   ┌───────────┼────────────┬─────────────┐
   ▼           ▼            ▼             ▼
 Postgres   File store   File d'attente  Cache
 (principal) (docs,      (jobs, notifs,  (référentiels,
             exports)     sync, relances) indicateurs)
```

---

## 3. Choix technologiques proposés

### 3.1 Backend

| Option | Pour | Contre |
|---|---|---|
| **Node.js + NestJS + TypeScript** | Partage de types avec les frontends ; productivité ; écosystème sync offline mature | Moins typé "fort" qu'un langage compilé |
| Java / Spring Boot | Référence enterprise santé ; perf | Plus verbeux ; double stack si front en TS |
| .NET / C# | Robuste, enterprise | Idem |
| Python / Django ou FastAPI | Rapide à prototyper ; data/BI | Moins adapté aux gros volumes transactionnels temps réel |

**Recommandation : NestJS + TypeScript** — un seul langage sur toute la pile (backend, web, mobile), typage partagé des DTO, écosystème riche pour l'offline-first. Alternative acceptable : Spring Boot si l'équipe Java est confirmée.

- API : **REST** (simple, universel) + OpenAPI auto-généré.
- Auth : **JWT access + refresh** avec rotation ; **MFA TOTP** pour profils sensibles ; sessions/appareils révocables (M01-F08).
- Autorisation : **RBAC + portée organisationnelle** évaluée côté serveur à chaque requête (M01-F10). Implémentation : guards + policies par domaine.
- Jobs/notifications : **file d'attente** (Redis + BullMQ ou équivalent) pour SMS, push, emails, recalculs d'échéances.
- Audit : table `journal_audit` dédiée, écriture non modifiable par l'app (append-only), consultation restreinte.

### 3.2 Applications

| Interface | Stack proposée | Justification |
|---|---|---|
| **Web (admin/autorités)** | React + TypeScript + Vite, Tailwind CSS, TanStack Query/Table, React Hook Form + Zod | SPA rapide, écosystème admin (tables, graphiques : Recharts/ECharts) |
| **Mobile (équipes)** | **React Native + Expo** (ou Flutter si équipe dédiée) | Partage de la logique TS (DTO, règles d'affichage) ; offline via **SQLite local** + file d'attente |
| **Portail bénéficiaire** | **PWA** (même codebase React que le web, bundle allégé) ou page publique allégée | Pas besoin d'app store ; accessibilité ; notifications web push |

Alternative mobile : **Flutter** si l'équipe est plus à l'aise Dart — le choix dépend de l'équipe réelle.

### 3.3 Synchronisation hors ligne (M12) — point critique

Options :

| Option | Principe | Remarque |
|---|---|---|
| **Moteur dédié (PowerSync / ElectricSQL)** | Sync continue PostgreSQL ↔ SQLite local | Rapide à mettre en place, gère conflits basiques ; dépendance externe à évaluer |
| **File d'attente custom** | Upload groupé d'opérations avec `id_local` unique, accusé serveur, idempotence | Plus de contrôle, plus de dev ; recommandé si budgets serrés ou exigences de conflit métier fortes |

**Recommandation :** prototyper avec un moteur existant (PowerSync) **et** garder le modèle "opérations + idempotence" côté API, qui reste nécessaire de toute façon. Règles de conflit par type de donnée (acte vaccinal : jamais d'écrasement silencieux ; corrections sensibles → file de traitement humain).

### 3.4 Données

- **PostgreSQL 16** : source de vérité unique. Schéma versionné (migrations), une base par environnement.
- **Référentiels vaccinaux** : tables dédiées avec version/dates d'effet/statut ; le calcul d'échéances référence la version publiée (M04).
- **Fichiers** (documents associés M03-F04, exports M11-F05) : stockage objet (S3-compatible ou filesystem chiffré) + métadonnées en base.
- **Cache** : Redis (sessions, files, référentiels chauds).
- **Chiffrement** : TLS partout ; chiffrement au repos (disque/volume) ; chiffrement des données sensibles locales sur mobile (SQLCipher ou équivalent) ; secret management (variables d'env / vault).

### 3.5 Notifications (M10)

- **SMS** : agrégateur local/régional (ex. opérateur togolais ou Africa's Talking) — à confirmer selon couverture et tarifs.
- **Push** : FCM (Android) + APNs (iOS) via Expo/React Native ; Web Push pour le portail.
- **Rappels** : job planifié qui recalcule les échéances depuis les référentiels publiés ; respects préférences/consentements (M10-F04) ; contenu minimal (pas de données de santé dans le message).

### 3.6 Infrastructure / exploitation

- **Conteneurs** : Docker + Compose en dev ; Kubernetes ou VM unique + reverse proxy (Caddy/Nginx) en prod selon budget.
- **Sauvegardes** : pg_dump chiffré quotidien + WAL archiving ; **tests de restauration planifiés** (exigence CDC).
- **Observabilité** : logs structurés, métriques (Prometheus/Grafana ou équivalent simple), alerting.
- **Environnements** : dev / staging / prod, données de test anonymisées.

---

## 4. Sécurité (rappel des exigences → traduction technique)

| Exigence CDC | Mise en œuvre |
|---|---|
| Moindre privilège, refus par défaut | RBAC+scope côté serveur ; permissions par action (lecture/création/modification/validation/export/admin) |
| MFA profils sensibles | TOTP obligatoire pour admin/autorités/gestionnaires |
| Sessions/appareils | Table sessions + appareils, expiration inactivité, révocation à distance, détecteur de connexions inhabituelles |
| Journalisation | `journal_audit` append-only : connexions, échecs, créations, validations, exports |
| Données de santé | TLS 1.2+, chiffrement disque, chiffrement local mobile, minimisation des champs, exports agrégés/anonymisés par défaut |
| Sync offline | Jamais plus de droits hors ligne ; `id_local` unique ; idempotence serveur ; pas de perte silencieuse d'actes |
| Secrets | Jamais en code ; vault ou variables protégées |

---

## 5. Découpage backend en domaines (modular monolith)

Modules NestJS (un dossier chacun, frontières strictes) :

1. `identity` — comptes, auth, MFA, sessions, habilitations (M01)
2. `beneficiaries` — dossiers, représentants, doublons, statuts (M02)
3. `vaccination-record` — dossier vaccinal, actes, échéancier, attestations (M03, M05)
4. `referentials` — vaccins, calendriers, règles, versions, validation (M04)
5. `campaigns` — campagnes, séances, équipes, planification (M07)
6. `logistics` — stocks, lots, mouvements, inventaires (M08)
7. `cold-chain` — équipements, températures, incidents (M09)
8. `notifications` — rappels, canaux, préférences, suivi envois (M10)
9. `reporting` — tableaux de bord, indicateurs, exports (M11)
10. `sync` — file d'attente offline, conflits, réconciliation (M12)
11. `org` — structures, territoires, équipes mobiles (M06)
12. `admin` — paramètres, supervision, conservation, audit (M13)

Chaque module expose ses endpoints via un module API ; les règles métier pures (calculs d'échéances, transitions d'état) sont des services testables unitairement.

---

## 6. Exigences non fonctionnelles (à chiffrer au dossier technique)

- Disponibilité cible, RPO/RTO, volumétrie (bénéficiaires, actes/jour, pics de campagne)
- Performance : temps de réponse API, taille max de sync offline, photos/documents
- Scalabilité : dimensionnement pour les campagnes de masse (pic national)
- Accessibilité : normes WCAG de base sur le web et le portail
- Langues : i18n dès le départ (français d'abord, architecture pluraliste)

---

## 7. Risques techniques identifiés

| Risque | Mitigation |
|---|---|
| Conflits de sync complexes sur actes vaccinaux | Modèle "opérations + validation humaine des conflits sensibles" ; tests de chaos sur sync |
| Couverture réseau/SMS inégale au Togo | Mode offline robuste, canaux de secours, SMS via agrégateur local |
| Adoption terrain (alphabétisation, terminaux modestes) | UX mobile simplifiée, mode hors ligne complet, formation |
| Validation des règles médicales externe | Aucun calcul médical en dur ; référentiels versionnés administrables |
| Durées de conservation légales non fixées | Paramétrage de conservation (M13-F05) en attendant validation juridique |

---

## 8. Prochaines étapes

1. Valider ces orientations avec l'équipe (choix backend, mobile, moteur de sync).
2. Rédiger le **modèle de données détaillé** (tables, colonnes, contraintes) à partir du MCD draw.io.
3. Définir la **matrice des rôles/permissions** formelle (base du RBAC).
4. Prototype UI (maquette Figma) → validation métier.
5. Initialiser le dépôt Git + squelette projet (identité SOVON, aucune trace d'agent).
