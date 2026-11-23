# ImmuniQ — Charte graphique extraite du logo

Source : `Variantes chromatiques du logo ImmuniQ.pdf` (analyse pixel des 11 pages).

## Couleurs officielles (mesurées sur le PDF)

| Token | Hex | Usage observé |
|---|---|---|
| `immuniq-navy` | `#083860` | Couleur principale du logo (bleu marine profond) |
| `immuniq-navy-2` | `#084068` | Variante du navy (dégradés /Second logo) |
| `immuniq-teal` | `#00A8A8` | Accent cyan/teal du logo (élément "Q" / monogramme) |
| `immuniq-teal-dark` | `#00A0A0` | Teal soutenu |
| `immuniq-mist` | `#E8F0F0` | Fond clair / version inversée (déduit des aplats clairs) |

Échelle suggérée (à valider visuellement) :

- Navy `#083860` → textes forts, headers, sidebar admin
- Navy clair `#0E4A7A` / `#155A94` → hover, liens
- Teal `#00A8A8` → CTA, indicateurs, badges, éléments interactifs
- Teal clair `#33BDBD` → hover teal
- Mist `#F0F7F7` → fonds de page clairs
- Blanc `#FFFFFF` → cartes
- Gris texte `#4A5568`, bordures `#E2E8F0`

## Typographie

| Rôle | Police | Graisse |
|---|---|---|
| Titres / logo | **Gotham** | Bold, Book |
| Corps / UI | **Gotham** + **Poppins** | Book / Regular |
| Données chiffrées | Gotham | Bold |

Fallbacks CSS : `Gotham, 'Segoe UI', system-ui` ; `Poppins, 'Segoe UI', system-ui`.

## Variantes du logo (du PDF)

- **Principal horizontal** — usage courant
- **Vertical** — `dMQ / ImmuniQ`
- **Monogramme** — `IMQ`
- **Inversé** — sur fond sombre (navy plein)
- **Icône app** — `IM` / `Q` pour mobile
- **Favicon** — web
- Déclinaisons : carte de visite, en-tête médical, interface web (nav : Accueil, Solutions, Ressources, Contact)

## Règles d'usage

- Exporter SVG / PDF vectoriel / PNG transparent depuis la source vectorielle validée.
- Version inversée obligatoire sur fond sombre.
- Espace de protection = hauteur du « Q » (estimation à confirmer sur le fichier source).
