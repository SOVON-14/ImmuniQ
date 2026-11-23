# @immuniq/api

Backend ImmuniQ — monolithe modulaire NestJS + TypeScript + PostgreSQL (TypeORM) + Redis/BullMQ.

## Modules métier (découpage par domaine fonctionnel)

| Module | CDC | Contenu |
|---|---|---|
| `identity` | M01 | Comptes, auth, MFA, sessions, habilitations, audit |
| `org` | M06 | Structures, territoires, équipes mobiles, affectations |
| `beneficiaries` | M02 | Bénéficiaires, représentants légaux, doublons, statuts |
| `vaccination-record` | M03, M05 | Dossier vaccinal, actes, échéancier, attestations |
| `referentials` | M04 | Vaccins, calendriers, règles, versions, validation |
| `campaigns` | M07 | Campagnes, séances, planification, suivi |
| `logistics` | M08 | Stocks, lots, mouvements, inventaires |
| `cold-chain` | M09 | Équipements, températures, incidents |
| `notifications` | M10 | Rappels, canaux SMS/push/portail, préférences |
| `reporting` | M11 | Tableaux de bord, indicateurs, exports |
| `sync` | M12 | Opérations offline, idempotence, conflits |
| `admin` | M13 | Paramètres, supervision, conservation, sauvegardes |

## Règles transverses

- RBAC + périmètre organisationnel vérifiés côté serveur sur chaque requête
- Journal d'audit append-only pour toute action sensible
- Aucune règle médicale codée en dur : référentiels versionnés (M04)
