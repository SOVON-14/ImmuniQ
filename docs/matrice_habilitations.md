# ImmuniQ — Matrice des rôles et habilitations (RBAC + périmètre)

Version 0.1 — 23 novembre 2026
Statut : proposition (base du module `identity`, M01-F04/F10)

> Modèle : **rôle** (fonction) × **permission** (action sur ressource) × **périmètre** (territoire/structure/équipe + dates d'affectation). Refus par défaut. Permissions : `read`, `create`, `update`, `validate`, `export`, `admin`.

## 1. Rôles

| Code | Rôle | Description |
|---|---|---|
| `national_admin` | Administrateur national | Paramétrage, supervision, accès transverse contrôlé |
| `health_authority` | Autorité sanitaire | Pilotage territorial, validation référentiels, indicateurs |
| `facility_manager` | Responsable de structure | Gestion d'une structure : comptes, stocks, séances |
| `stock_manager` | Gestionnaire de stock | Mouvements, lots, inventaires, chaîne du froid |
| `vaccinator` | Vaccinateur / professionnel | Actes vaccinaux, dossiers dans son périmètre |
| `campaign_agent` | Agent de campagne | Activités de campagne, saisie terrain |
| `mobile_team_leader` | Chef d'équipe mobile | Missions, affectations temporaires, sync |
| `beneficiary` | Bénéficiaire | Son propre dossier, échéances, notifications |
| `legal_representative` | Représentant légal | Dossier(s) des bénéficiaires rattachés, droits différenciés |

## 2. Permissions (ressource.action)

| Domaine | Permissions |
|---|---|
| Comptes | `account.read/create/update/suspend`, `account.validate`, `role.assign`, `session.revoke` |
| Organisation | `structure.read/create/update`, `territory.read`, `assignment.manage` |
| Bénéficiaires | `beneficiary.read/create/update`, `representative.manage`, `merge.approve` |
| Dossier vaccinal | `record.read`, `act.create`, `act.update`, `act.validate`, `act.correct`, `adverse_event.declare` |
| Référentiels | `referential.read`, `referential.draft`, `referential.submit`, `referential.approve`, `referential.publish` |
| Campagnes | `campaign.read/create/update`, `campaign.plan`, `campaign.close`, `session.manage` |
| Stocks | `stock.read`, `stock.receive`, `stock.move`, `stock.adjust`, `inventory.manage` |
| Froid | `coldchain.read`, `temperature.record`, `incident.manage`, `incident.evaluate` |
| Notifications | `notification.read`, `notification.send`, `preference.manage` |
| Reporting | `dashboard.read`, `report.read`, `export.create` |
| Sync | `sync.push/pull` (implicite, borné au périmètre) |
| Admin | `settings.manage`, `audit.read`, `backup.manage`, `retention.manage`, `nomenclature.manage` |

## 3. Matrice rôle × permission (X = autorisé dans le périmètre)

| Permission | Nat.Admin | Autorité | Resp.Struct | Gest.Stock | Vaccinateur | Agent Camp. | Chef Équipe | Bénéf. | Représent. |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| account.read | X | périm. | X | X | — | — | X | — | — |
| account.create/update | X | X | X (structure) | — | — | — | — | — | — |
| account.suspend | X | X | X (structure) | — | — | — | — | — | — |
| account.validate | X | X | — | — | — | — | — | — | — |
| role.assign | X | X | X (rôles inférieurs) | — | — | — | — | — | — |
| session.revoke | X | X | X (structure) | — | — | — | — | — | — |
| structure.read | X | X | X | X | X | X | X | — | — |
| structure.create/update | X | X | — | — | — | — | — | — | — |
| territory.read | X | X | X | X | X | X | X | — | — |
| assignment.manage | X | X | X | — | — | — | X (son équipe) | — | — |
| beneficiary.read | X | X | X | — | X | X | X | X (soi) | X (liés) |
| beneficiary.create/update | X | X | X | — | X | X | X | — | — |
| representative.manage | X | X | X | — | — | — | — | — | — |
| merge.approve | X | X | — | — | — | — | — | — | — |
| record.read | X | X | X | — | X | X | X | X (soi) | X (liés) |
| act.create | — | — | — | — | X | X | X | — | — |
| act.update/correct | X | — | — | — | X (propre, corrig.) | — | X | — | — |
| act.validate | X | X | X | — | X (auto-validation saisie) | — | X | — | — |
| adverse_event.declare | — | — | — | — | X | X | X | — | — |
| referential.read | X | X | X | — | X | X | X | — | — |
| referential.draft/submit | X | X | — | — | — | — | — | — | — |
| referential.approve/publish | X | X (autorité médicale) | — | — | — | — | — | — | — |
| campaign.read | X | X | X | — | X | X | X | — | — |
| campaign.create/plan | X | X | X | — | — | — | — | — | — |
| campaign.close | X | X | — | — | — | — | — | — | — |
| stock.read | X | X | X | X | X | — | X | — | — |
| stock.receive/move | — | — | X | X | — | — | — | — | — |
| stock.adjust | — | — | — | X (motif+habil.) | — | — | — | — | — |
| inventory.manage | — | — | X | X | — | — | — | — | — |
| coldchain.read | X | X | X | X | X | — | X | — | — |
| temperature.record | — | — | X | X | — | X | X | — | — |
| incident.manage | — | — | X | X | — | — | X | — | — |
| incident.evaluate | X | X | — | — | — | — | — | — | — |
| notification.read | X | X | X | X | X | X | X | X (soi) | X (liés) |
| notification.send | X | X | X | — | — | — | — | — | — |
| preference.manage | — | — | — | — | — | — | — | X (soi) | X (liés) |
| dashboard.read | X | X (son niveau) | X (structure) | X (stock) | — | — | X (équipe) | — | — |
| report.read | X | X | X | X | — | — | X | — | — |
| export.create | X | X | X | X | — | — | — | — | — |
| settings.manage | X | — | — | — | — | — | — | — | — |
| audit.read | X | X (périm.) | — | — | — | — | — | — | — |
| backup.manage | X | — | — | — | — | — | — | — | — |
| nomenclature.manage | X | X | — | — | — | — | — | — | — |
| retention.manage | X | — | — | — | — | — | — | — | — |

**Légende** : « périm. » = limité au périmètre organisationnel de l'utilisateur ; « (structure) » = uniquement sa structure ; « (propre) » = ses propres saisies.

## 4. Règles de périmètre (scope)

Un utilisateur n'agit que sur les ressources de ses rattachements/affectations actifs :

- **national_admin** : tout le territoire (actions sensibles journalisées, MFA)
- **health_authority** : son niveau territorial (régional ou district selon affectation)
- **facility_manager / stock_manager** : sa structure
- **vaccinator / campaign_agent** : ses structures + affectations de campagne en cours
- **mobile_team_leader** : son équipe + zone de mission datée
- **beneficiary / legal_representative** : soi-même / bénéficiaires liés avec droits valides

Les affectations temporaires (`assignments` avec `ends_at`) expirent automatiquement → droits révoqués.

## 5. Séparation des responsabilités (points de contrôle)

| Action sensible | Séparation exigée |
|---|---|
| Validation référentiel médical | `health_authority` ≠ `national_admin` simple ; approbateur identifié |
| Fusion de doublons | agent habilité ≠ créateur du dossier |
| Correction d'acte validé | auteur ≠ approbateur de la correction |
| Ajustement de stock | motif + habilitation dédiée |
| Clôture d'incident froid | évaluateur = autorité compétente, pas le déclarant |
| Export de données | tracé (auteur, périmètre, finalité) |

## 6. Journalisation obligatoire

Toute attribution/révocation de rôle, toute délégation temporaire, tout accès à un dossier bénéficiaire par un professionnel, tout export → `audit_log` (append-only).
