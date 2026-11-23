# ImmuniQ — Modèle de données détaillé

Version 0.1 — 23 novembre 2026
Statut : proposition de conception (base pour les migrations TypeORM)

> Conventions : `id` = UUID v7 (ou BIGSERIAL si volume) ; timestamps `created_at`/`updated_at` partout ; soft-delete uniquement où le CDC l'exige (jamais sur les actes) ; toutes les tables métier portent `tenant` implicite via rattachement organisationnel.

---

## M01 — Identité, comptes, habilitations

### `users` — comptes utilisateurs
| Colonne | Type | Contraintes | Notes |
|---|---|---|---|
| id | uuid | PK | |
| username | varchar(100) | UNIQUE, NOT NULL | identifiant de connexion |
| password_hash | varchar(255) | NOT NULL | bcrypt/argon2 |
| email | varchar(255) | UNIQUE | nullable |
| phone | varchar(30) | | E.164 |
| first_name, last_name | varchar(100) | NOT NULL | nominatif obligatoire (comptes partagés interdits) |
| status | enum | NOT NULL DEFAULT 'pending' | pending/active/suspended/blocked/disabled |
| role_id | uuid | FK → roles | rôle global |
| mfa_enabled | bool | DEFAULT false | TOTP exigé profils sensibles |
| mfa_secret | varchar(255) | | chiffré au repos |
| failed_login_count | int | DEFAULT 0 | blocage progressif |
| locked_until | timestamptz | | |
| last_login_at | timestamptz | | |
| created_by | uuid | FK → users | traçabilité création |
| validated_by | uuid | FK → users | nullable |
| created_at, updated_at | timestamptz | | |

### `roles` / `permissions` / `role_permissions`
- `roles` : id, code (unique : `national_admin`, `health_authority`, `facility_manager`, `stock_manager`, `vaccinator`, `campaign_agent`, `beneficiary`), name, description
- `permissions` : id, code (ex. `dossier.read`, `acte.create`, `referentiel.validate`, `stock.move`, `export.create`, `admin.system`), resource, action
- `role_permissions` : role_id, permission_id — composite PK
- Permissions configurables par rôle **et** périmètre (table `scopes` : user_id, territory_id/structure_id, granted_by, expires_at pour délégations temporaires M01-F10)

### `sessions` / `devices`
- `sessions` : id, user_id FK, device_id FK, ip, user_agent, created_at, last_activity_at, expires_at, revoked_at, revoke_reason
- `devices` : id, user_id FK, fingerprint, platform, push_token, first_seen_at, last_seen_at, revoked_at

### `audit_log` — journal d'audit (append-only)
| Colonne | Type | Notes |
|---|---|---|
| id | bigint | PK séquentiel (ordre garanti) |
| actor_id | uuid | FK users nullable (système) |
| action | varchar(100) | ex. `acte.validate`, `compte.suspendre`, `export.create` |
| resource_type, resource_id | varchar/uuid | objet concerné |
| details | jsonb | anciennes/nouvelles valeurs pour champs sensibles |
| ip, user_agent | varchar | |
| result | enum | success/failure/denied |
| created_at | timestamptz | indexé |

**Règle** : aucun UPDATE/DELETE applicatif sur cette table ; partitionnement mensuel si volume.

---

## M06 — Organisation territoriale

### `territories` — hiérarchie nationale → régional → district
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| level | enum | national / regional / district |
| parent_id | uuid | FK self, nullable (national) |
| code | varchar(20) | UNIQUE |
| name | varchar(200) | |
| status | enum | active / inactive |

### `structures` — établissements de santé
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| code | varchar(30) | UNIQUE |
| name | varchar(200) | |
| type | enum | public / private / mobile_team |
| territory_id | uuid | FK → territories (district) |
| address, phone, email | | contacts |
| status | enum | active / temporarily_closed / inactive |
| valid_from, valid_to | date | historique rattachements |

### `mobile_teams` — équipes mobiles (si type mobile)
- id, structure_id FK, name, zone_territory_id FK, leader_user_id FK, vehicle_info, status, active_from/to

### `assignments` — rattachements et affectations (M01-F05)
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| structure_id / team_id | uuid | FK (un des deux) |
| type | enum | permanent / temporary |
| is_primary | bool | rattachement principal |
| starts_at, ends_at | timestamptz | expiration auto des droits temporaires |
| responsibilities | jsonb | |
| created_by | uuid | |

---

## M02 — Bénéficiaires et représentants

### `beneficiaries`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| immuniq_id | varchar(20) | **UNIQUE, permanent, jamais réattribué** — format `IMQ-XXXXXXXX` |
| first_name, last_name | varchar(100) | |
| birth_date | date | nullable si inconnu (collecte minimale) |
| sex | enum | |
| phone, commune/address | varchar | coordonnées minimales |
| status | enum | active / to_verify / merged / archived / flagged |
| merged_into_id | uuid | FK self — fusion contrôlée |
| origin_structure_id | uuid | FK structures |
| created_by, created_via | uuid/enum | auteur + canal (professional_portal/system) |
| created_at, updated_at | | |

Index de déduplication : trigramme sur (last_name, first_name, birth_date) + index sur phone.

### `legal_representatives`
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users (compte portail) nullable — représentant sans compte possible |
| full_name, phone | varchar | |
| link_type | enum | parent / guardian / legal_representative / other |
| authority_basis | varchar(255) | base de l'autorité (jugement, déclaration…) |
| valid_from, valid_to | date | |
| status | enum | active / revoked / expired |
| created_by | uuid | traçabilité |

### `representation_links` — association bénéficiaire ↔ représentant
- beneficiary_id FK, representative_id FK, rights jsonb (lecture dossier, notifications…), granted_by, granted_at, revoked_at, revoke_reason

---

## M04 — Référentiels vaccinaux (versionnés, validés)

### `vaccines` / `vaccine_presentations`
- `vaccines` : id, code unique, name, description, status (active/suspended/archived), source_reference
- `vaccine_presentations` : id, vaccine_id FK, presentation (ex. "0,5 ml"), formulation

### `referentials` — enveloppe de version
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| type | enum | routine_calendar / campaign / catchup / specific |
| version | int | croissant par type |
| status | enum | draft / submitted / approved / published / withdrawn / archived |
| source_official | varchar(255) | source officielle |
| effective_from | date | date d'effet |
| created_by, approved_by | uuid | validation tracée |
| approved_at, published_at | timestamptz | |

### `vaccination_rules` — règles par tranche d'âge/dose
- id, referential_id FK, vaccine_id FK, min_age_days, max_age_days, dose_number, min_interval_days, context (routine/campaign/catchup/specific), contraindication_flags jsonb, notes

### `rule_validations` — journal des validations
- id, referential_id FK, actor_id FK, decision (approved/rejected), comment, created_at

**Règle CDC** : jamais d'écrasement — nouvelle version = nouvelle ligne ; les actes stockent `rule_version_id` utilisé.

---

## M03/M05 — Dossier vaccinal et actes

### `vaccination_records` — vue dossier (par bénéficiaire)
- beneficiary_id FK (PK ou FK), summary jsonb, last_updated — ou simplement vue matérialisée sur `vaccination_acts`

### `vaccination_acts` — actes vaccinaux (cœur du système)
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| local_id | varchar(64) | **id unique généré hors ligne** — clé d'idempotence sync |
| beneficiary_id | uuid | FK |
| vaccine_id | uuid | FK |
| dose_number | int | |
| administered_at | timestamptz | date/heure réelle de l'acte |
| professional_id | uuid | FK → users (obligatoire) |
| structure_id / team_id | uuid | FK — lieu d'administration |
| campaign_id | uuid | FK nullable |
| lot_id | uuid | FK nullable — lot administré si connu |
| status | enum | planned / administered / postponed / cancelled / not_performed |
| not_performed_reason | enum+texte | refusal/absence/contraindication/unavailable/other |
| sync_status | enum | local_pending / synced / conflict |
| source | enum | immuniq_entry / imported / declared |
| verification_level | enum | verified / declared / imported |
| rule_version_id | uuid | FK referentials — version utilisée pour la recommandation |
| created_at, updated_at, validated_by, validated_at | | correction = nouvelle version, jamais UPDATE silencieux |

### `acte_corrections` — historisation des corrections (M05-F05)
- id, act_id FK, field, old_value, new_value, corrected_by, reason, approved_by, created_at

### `adverse_events` — événements post-vaccinaux (M05-F06)
- id, act_id FK, event_type, description, severity, reported_by FK, reported_at, pharmacovigilance_ref, status (declared/in_review/closed), **pas de diagnostic automatique ni conclusion causale**

### `beneficiary_documents` (M03-F04)
- id, beneficiary_id FK, type, file_url, mime_type, size, uploaded_by, created_at

---

## M07 — Campagnes

### `campaigns`
- id, code unique, name, objectives text, target_population jsonb (tranches d'âge, zones), vaccines jsonb ou table `campaign_vaccines`, territory_ids uuid[], period_start/end, status (draft/planned/in_progress/pending_sync/closed/evaluated), responsible_id FK, kpi_targets jsonb, created_by

### `campaign_sessions` — séances planifiées
- id, campaign_id FK, structure_id/team_id FK, site_name, scheduled_at, actual_at, status (planned/done/cancelled), leader_id FK

### `campaign_assignments`
- campaign_id FK, user_id FK, role_in_campaign, starts_at/ends_at

---

## M08 — Stocks et lots

### `products` (vaccins + consommables)
- id, code unique, name, type (vaccine/consumable), vaccine_id FK nullable, status, unit

### `lots`
- id, product_id FK, lot_number, expiry_date, received_at, supplier/source, status (available/quarantine/unusable/depleted), notes

### `warehouses` / `stock_levels`
- `warehouses` : id, structure_id/depot FK, name, type (central/regional/district/facility/mobile)
- `stock_levels` : warehouse_id + lot_id (PK composite), quantity, alert_threshold, last_counted_at

### `stock_movements` — tout mouvement est traçable (M08-F02)
| Colonne | Type | Notes |
|---|---|---|
| id | uuid | PK |
| type | enum | entry / exit / transfer_out / transfer_in / adjustment / loss / destruction / return |
| product_id, lot_id | FK | |
| from_warehouse_id, to_warehouse_id | FK | nullable selon type |
| quantity | numeric | |
| reason | text | **obligatoire pour ajustements/pertes** |
| related_act_id | uuid | FK actes — rapprochement doses/sorties (M08-F06) |
| related_campaign_id | uuid | |
| performed_by, approved_by | uuid | habilitation |
| created_at | | jamais modifié |

### `inventories`
- id, warehouse_id FK, started_at, completed_at, status, counted_by ; `inventory_lines` : inventory_id, lot_id, theoretical_qty, counted_qty, variance, validated_by

---

## M09 — Chaîne du froid

### `cold_chain_equipment`
- id, code, type (fridge/freezer/cold_box/passive), warehouse_id/site FK, responsible_id FK, status (functional/maintenance/out_of_service), calibrated_at

### `temperature_readings`
- id, local_id (idempotence offline), equipment_id FK, value_celsius numeric, recorded_at, source (manual/automatic/sensor), recorded_by FK nullable, sync_status, created_at

### `cold_chain_incidents`
- id, equipment_id FK, opened_at, threshold_min/max au moment T, status (alert/open/in_treatment/evaluating/closed/rejected), responsible_id FK, affected_lots jsonb, conservative_measures text, evaluation_by FK, decision text, decision_reference, closed_at, closure_justification

---

## M10 — Notifications

### `notification_templates`
- id, code, channel (sms/push/portal/email), locale, subject/body, version, status

### `notification_preferences` — par bénéficiaire/representant
- beneficiary_id/representant_id FK, channel, enabled bool, verified_contact, consent_basis, updated_at

### `notifications` — envois
- id, type (vaccine_reminder/appointment_alert/stock_alert/cold_chain_alert/service), template_id FK, recipient_ref (user/beneficiary/representant), channel, payload minimal (pas de données de santé), status (scheduled/sent/delivered/read/failed/resent), provider_ref, sent_at, delivered_at, failure_reason, retry_count

---

## M11 — Reporting (vues/matérialisations, pas de duplication)

- `report_definitions` : id, code, parameters jsonb, calculation_doc, owner
- `exports` : id, type, filters jsonb, format, generated_by FK, purpose, row_count, file_url, created_at — **tout export tracé**
- Indicateurs = requêtes/vues SQL documentées ; tables agrégées `daily_metrics` (territory_id, date, metric, value) rafraîchies par job si perf insuffisante

---

## M12 — Synchronisation

### `sync_batches` / `sync_operations`
- `sync_operations` : id, batch_id FK, device_id FK, local_id, operation_type (acte.create, stock.move, temperature.reading…), payload jsonb, received_at, status (received/processed/conflict/failed), processed_at, error
- `sync_conflicts` : id, operation_id FK, conflict_type, local_version, server_version, resolution (auto_rule/manual), resolved_by FK, resolved_at, resolution_details

**Règles** : idempotence par `(device_id, local_id)` ; ordre causal par horodatage + séquence ; jamais d'écrasement d'acte validé ; conflits sensibles → file de traitement humain.

---

## M13 — Admin / paramétrage / conservation

- `settings` : key, value jsonb, scope (global/territory), updated_by, effective_from
- `nomenclatures` : type, code, label, parent, status, valid_from/to — pas de suppression si utilisé
- `retention_policies` : resource_type, retention_duration, action (archive/delete/anonymize), legal_basis, approved_by — **paramétrage en attendant validation juridique**
- `backup_records` : id, type, started_at, finished_at, status, size, storage_ref, restore_tested_at, tested_by

---

## Relations clés (rappel MCD)

```
users ──< assignments >── structures/teams ──< territories
beneficiaries ──< representation_links >── legal_representatives ── users
beneficiaries ──< vaccination_acts >── vaccines, lots, campaigns, users
vaccination_acts ──< adverse_events, acte_corrections
referentials ──< vaccination_rules ; vaccination_acts.rule_version_id → referentials
warehouses ──< stock_levels(lots) ; stock_movements relie warehouses/lots/actes
cold_chain_equipment ──< temperature_readings ── cold_chain_incidents
campaigns ──< campaign_sessions, campaign_assignments
```

## Points ouverts

- Stratégie d'ID : UUID v7 recommandée (indexables, générables offline pour `local_id`)
- Partitionnement : `audit_log`, `vaccination_acts`, `temperature_readings`, `stock_movements` si volumétrie nationale
- Chiffrement colonnes sensibles éventuelles (téléphones) — à trancher au dossier sécurité
- Durées de conservation : valeurs non fixées (validation juridique Togo requise)
