# ADR-0001 — Architecture technique globale

**Statut** : proposée
**Date** : 2026-11-23

## Contexte

ImmuniQ est un système national de gestion de la vaccination (Togo) avec 3 interfaces (web admin, mobile terrain hors ligne, portail bénéficiaire) et 13 domaines fonctionnels (M01–M13).

## Décision

- Monorepo pnpm : `apps/web`, `apps/mobile`, `apps/portail`, `services/api`, `packages/shared`
- Backend : NestJS + TypeScript, monolithe modulaire (12 modules métier)
- Mobile : React Native / Expo, SQLite local, file d'opérations idempotentes
- Données : PostgreSQL + Redis ; journal d'audit append-only
- Auth : JWT + refresh, MFA TOTP profils sensibles, RBAC + périmètre organisationnel

## Alternatives écartées

- Microservices dès le départ : coût d'exploitation injustifié à ce stade (CDC : pas de préjugé)
- Flutter : acceptable, mais React Native partage la logique TypeScript avec web/api
- Intégration externe obligatoire v1 : explicitement hors périmètre (IMQ-024)

## Conséquences

- Un seul langage (TypeScript) sur toute la pile
- DTO et types partagés via `packages/shared`
- Le moteur de sync (PowerSync ou custom) sera tranché par un ADR dédié après prototype
