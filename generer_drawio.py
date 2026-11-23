# -*- coding: utf-8 -*-
"""Genere les fichiers .drawio (diagrams.net) pour ImmuniQ."""
import html
import os

OUT = os.path.dirname(os.path.abspath(__file__))

BLUE = "#dae8fc"; BLUE_B = "#6c8ebf"
GREEN = "#d5e8d4"; GREEN_B = "#82b366"
YELLOW = "#fff2cc"; YELLOW_B = "#d6b656"
PINK = "#f8cecc"; PINK_B = "#b85450"
ORANGE = "#ffe6cc"; ORANGE_B = "#d79b00"
GREY = "#f5f5f5"; GREY_B = "#666666"
PURPLE = "#e1d5e7"; PURPLE_B = "#9673a6"

class Page:
    def __init__(self, name):
        self.name = name
        self.cells = []
        self._n = 2
    def nid(self, p="c"):
        self._n += 1
        return f"{p}{self._n}"
    def add(self, value, style, x, y, w, h, extra=""):
        cid = self.nid()
        v = html.escape(value, quote=False).replace("\n", "&lt;br&gt;")
        self.cells.append(
            f'<mxCell id="{cid}" value="{v}" style="{style};{extra}" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="{w}" height="{h}" as="geometry"/></mxCell>')
        return cid
    def box(self, x, y, w, h, label, fill=BLUE, border=BLUE_B, bold=False, fs=12):
        s = f"rounded=1;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={border};fontSize={fs};"
        if bold: s += "fontStyle=1;"
        return self.add(label, s, x, y, w, h)
    def rect(self, x, y, w, h, label, fill=GREY, border=GREY_B, fs=12, bold=False):
        s = f"whiteSpace=wrap;html=1;fillColor={fill};strokeColor={border};fontSize={fs};"
        if bold: s += "fontStyle=1;"
        return self.add(label, s, x, y, w, h)
    def diamond(self, x, y, w, h, label, fill=YELLOW, border=YELLOW_B, fs=12):
        s = f"rhombus;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={border};fontSize={fs};"
        return self.add(label, s, x, y, w, h)
    def ellipse(self, x, y, w, h, label, fill=GREEN, border=GREEN_B, fs=12, bold=False):
        s = f"ellipse;whiteSpace=wrap;html=1;fillColor={fill};strokeColor={border};fontSize={fs};"
        if bold: s += "fontStyle=1;"
        return self.add(label, s, x, y, w, h)
    def actor(self, x, y, label):
        return self.add("", "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;",
                        x, y, 30, 55, f"verticalLabelPosition=bottom;verticalAlign=top;html=1;labelBackgroundColor=none;") if False else \
               self._actor(x, y, label)
    def _actor(self, x, y, label):
        cid = self.nid()
        v = html.escape(label, quote=False)
        self.cells.append(
            f'<mxCell id="{cid}" value="{v}" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;" vertex="1" parent="1">'
            f'<mxGeometry x="{x}" y="{y}" width="30" height="60" as="geometry"/></mxCell>')
        return cid
    def edge(self, src, dst, label="", dashed=False, color=GREY_B, width=1.5, exit=None, entry=None):
        eid = self.nid("e")
        st = f"edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;strokeColor={color};strokeWidth={width};"
        if dashed: st += "dashed=1;"
        if label:
            lv = html.escape(label, quote=False).replace("\n", "&lt;br&gt;")
            st += f"labelBackgroundColor=#ffffff;fontSize=10;"
            extra = f'<mxGeometry relative="1" as="geometry"/>'
            # label via value attr
            self.cells.append(
                f'<mxCell id="{eid}" value="{lv}" style="{st}" edge="1" parent="1" source="{src}" target="{dst}">'
                f'{extra}</mxCell>')
        else:
            self.cells.append(
                f'<mxCell id="{eid}" value="" style="{st}" edge="1" parent="1" source="{src}" target="{dst}">'
                f'<mxGeometry relative="1" as="geometry"/></mxCell>')
        return eid
    def text(self, x, y, label, size=14, bold=False, color="#000000", w=400):
        s = f"text;html=1;align=left;verticalAlign=middle;fontSize={size};fontColor={color};"
        if bold: s += "fontStyle=1;"
        return self.add(label, s, x, y, w, size + 8)

    def xml(self):
        cells = "".join(self.cells)
        return (f'<mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" '
                f'connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" '
                f'math="0" shadow="0">'
                f'<root><mxCell id="0"/><mxCell id="1" parent="0"/>{cells}</root></mxGraphModel>')

def write_file(fname, pages):
    out = []
    for i, p in enumerate(pages):
        model = p.xml()
        # strip outer mxGraphModel tags to embed inside <diagram>
        inner = model[len('<mxGraphModel dx="800" dy="600" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">'):-len('</mxGraphModel>')]
        out.append(f'<diagram id="{i+1}" name="{html.escape(p.name, quote=False)}">{inner}</diagram>')
    content = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<mxfile host="app.diagrams.net" agent="devin" version="24.0.0" type="device">\n'
               + "\n".join(out) + '\n</mxfile>')
    path = os.path.join(OUT, fname)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK", fname, f"({len(pages)} pages)")

# ============================================================
# FICHIER 1 : CONTEXTE + ACTEURS / CAS D'UTILISATION
# ============================================================
def page_contexte():
    p = Page("Contexte systeme")
    p.text(40, 20, "Diagramme de contexte - ImmuniQ (systeme national de vaccination, Togo)", 16, True)
    p.box(330, 330, 220, 90, "IMMUNIQ\nSysteme de gestion et suivi\nde la vaccination", fill="#dae8fc", border="#6c8ebf", bold=True, fs=14)
    # Acteurs
    actors = [
        (40, 80, "Professionnels de sante\n(vaccinateurs, equipes mobiles)", "mobile/web"),
        (40, 300, "Autorites sanitaires\n(national, regional, district)", "web"),
        (40, 520, "Responsables de structures\n(public, prive)", "web"),
        (640, 80, "Beneficiaires et\nrepresentants legaux", "portail"),
        (640, 300, "Gestionnaires de stock", "web/mobile"),
        (640, 520, "Administrateurs", "web"),
    ]
    ids = []
    for x, y, lbl, iface in actors:
        cid = p.actor(x, y, lbl)
        ids.append((cid, iface))
        p.text(x - 10, y + 68, iface, 10, False, "#666666", 120)
    # Interfaces / canaux (boxes a droite du systeme)
    ifaces = [
        (600, 690, "Application WEB", "admin, autorites, supervision, stats"),
        (600, 790, "Application MOBILE", "professionnels, mode hors ligne"),
        (600, 890, "PORTAIL BENEFICIAIRE", "dossier, historique, echeances"),
    ]
    for x, y, lbl, sub in ifaces:
        p.box(x, y, 220, 55, lbl, fill=PURPLE, border=PURPLE_B, fs=12)
        p.text(x + 5, y + 58, sub, 9, False, "#666666", 210)
    # Canaux externes
    ext = [
        (330, 700, "Passerelle SMS", "rappels, alertes"),
        (330, 780, "Service PUSH mobile", "notifications"),
        (330, 860, "Portail web public", "consultation"),
    ]
    for x, y, lbl, sub in ext:
        p.box(x, y, 180, 50, lbl, fill=ORANGE, border=ORANGE_B, fs=11)
        p.text(x + 5, y + 52, sub, 9, False, "#666666", 170)
    # Referentiels externes
    p.box(40, 700, 220, 50, "Referentiels officiels\n(calendriers, protocoles)", fill=YELLOW, border=YELLOW_B, fs=11)
    p.text(40, 752, "valides par les autorites competentes", 9, False, "#666666", 220)
    p.box(40, 790, 220, 50, "Systemes de sante partenaires", fill=GREY, border=GREY_B, fs=11)
    p.text(40, 842, "interoperabilite optionnelle (v2)", 9, False, "#666666", 220)
    # Edges acteurs -> systeme
    for cid, iface in ids:
        p.edge(cid, "c4", "")  # target will be system box id? need actual id
    return p

def build_contexte():
    p = Page("Contexte systeme")
    p.text(40, 15, "Diagramme de contexte - ImmuniQ", 16, True)
    sysid = p.box(340, 340, 220, 90, "IMMUNIQ\nGestion et suivi\nde la vaccination", fill=BLUE, border=BLUE_B, bold=True, fs=14)
    actors = [
        (30, 60, "Professionnels de sante\n(vaccinateurs, equipes mobiles)", "App mobile + web"),
        (30, 300, "Autorites sanitaires\n(national / regional / district)", "App web"),
        (30, 540, "Responsables de structures\n(public / prive)", "App web"),
        (660, 60, "Beneficiaires et\nrepresentants legaux", "Portail beneficiaire"),
        (660, 300, "Gestionnaires de stock", "Web + mobile"),
        (660, 540, "Administrateurs systeme", "App web"),
    ]
    for x, y, lbl, iface in actors:
        cid = p._actor(x, y, lbl)
        p.edge(cid, sysid, "", color=GREY_B)
        p.text(x - 15, y + 68, iface, 9, False, "#777777", 140)
    ifaces = [
        (620, 700, "Passerelle SMS", "rappels et alertes"),
        (620, 780, "Push notifications", "canal mobile"),
        (620, 860, "Referentiels officiels", "calendriers valides par autorites"),
        (620, 940, "Systemes partenaires", "interoperabilite optionnelle"),
    ]
    for x, y, lbl, sub in ifaces:
        bid = p.box(x, y, 210, 50, lbl, fill=ORANGE if "Passerelle" in lbl or "Push" in lbl else YELLOW, border=ORANGE_B if "Passerelle" in lbl or "Push" in lbl else YELLOW_B, fs=11)
        p.edge(bid, sysid, "", dashed=True)
        p.text(x + 5, y + 52, sub, 9, False, "#666666", 200)
    p.text(340, 460, "Dossier exclusivement vaccinal - donnees personnelles et de sante protegees", 11, False, "#b85450", 300)
    return p

def build_usecases():
    p = Page("Acteurs et cas d'utilisation")
    p.text(40, 15, "Acteurs et grands cas d'utilisation (vue macro)", 16, True)
    sysid = p.ellipse(700, 330, 200, 90, "IMMUNIQ", fill=BLUE, border=BLUE_B, bold=True, fs=14)
    # acteurs a gauche
    prof = p._actor(30, 80, "Professionnel de sante")
    auth = p._actor(30, 300, "Autorite sanitaire")
    gest = p._actor(30, 520, "Gestionnaire de stock")
    benef = p._actor(620, 80, "Beneficiaire / representant")
    admin = p._actor(620, 520, "Administrateur")
    # cas d'utilisation (ellipses) milieux
    ucs_prof = [
        (230, 40, "Rechercher / creer beneficiaire"),
        (230, 110, "Consulter dossier vaccinal"),
        (230, 180, "Calculer echeances (referentiel)"),
        (230, 250, "Enregistrer acte vaccinal"),
        (230, 320, "Declarer evenement indésirable"),
        (230, 390, "Saisir hors ligne / synchroniser"),
        (230, 460, "Gerer mission mobile"),
    ]
    ucs_auth = [
        (230, 560, "Tableaux de bord nationaux"),
        (230, 630, "Suivi campagnes"),
        (230, 700, "Alertes et indicateurs"),
        (230, 770, "Valider referentiels"),
    ]
    ucs_gest = [
        (230, 850, "Mouvements de stock / lots"),
        (230, 920, "Releves de temperature"),
        (230, 990, "Incidents chaine du froid"),
        (230, 1060, "Inventaires et peremptions"),
    ]
    ucs_benef = [
        (430, 40, "Consulter son dossier"),
        (430, 110, "Voir echeances et rappels"),
        (430, 180, "Recevoir notifications"),
        (430, 250, "Attestation / carnet numerique"),
    ]
    ucs_admin = [
        (430, 560, "Comptes et habilitations"),
        (430, 630, "Structures et equipes"),
        (430, 700, "Parametrage et audit"),
        (430, 770, "Sauvegardes et supervision"),
    ]
    groups = [(prof, ucs_prof), (auth, ucs_auth), (gest, ucs_gest), (benef, ucs_benef), (admin, ucs_admin)]
    for actor, ucs in groups:
        for x, y, lbl in ucs:
            cid = p.ellipse(x, y, 190, 45, lbl, fill=GREEN, border=GREEN_B, fs=10)
            p.edge(actor, cid, "", color=GREY_B, width=1)
    # includes notables
    p.text(30, 1120, "Note : chaque cas d'utilisation est soumis au RBAC + perimetre organisationnel (moindre privilege, refus par defaut).", 11, False, "#666666", 700)
    return p

# ============================================================
# FICHIER 2 : MACHINES A ETATS
# ============================================================
def state_page(title, states, transitions, start_label=""):
    """states: list of (x,y,label,terminal?) ; transitions: (src_idx,dst_idx,label)"""
    p = Page(title)
    p.text(40, 15, title, 15, True)
    ids = []
    bw, bh = 190, 60
    for i, st in enumerate(states):
        x, y, lbl = st[0], st[1], st[2]
        term = st[3] if len(st) > 3 else False
        if term:
            cid = p.ellipse(x + bw//2 - 20, y - 25, 40, 40, "", fill=PINK, border=PINK_B)
            p.text(x, y + 25, lbl, 10, True, "#333333", bw)
        else:
            cid = p.box(x, y, bw, bh, lbl, fill=BLUE, border=BLUE_B, fs=11)
        ids.append(cid)
    # etat initial
    if states:
        sx, sy = states[0][0] - 60, states[0][1] + 30
        st = p.ellipse(sx, sy - 10, 24, 24, "", fill="#333333", border="#333333")
        p.edge(st, ids[0], start_label, color=GREY_B)
    for (si, di, lbl) in transitions:
        p.edge(ids[si], ids[di], lbl, color=GREY_B)
    return p

def build_etats():
    pages = []
    # Compte utilisateur (M01-F07)
    pages.append(state_page("Cycle de vie d'un compte (M01)",
        [(60, 200, "EN ATTENTE"), (300, 200, "ACTIF"), (540, 200, "SUSPENDU"),
         (60, 400, "BLOQUE"), (300, 400, "DESACTIVE")],
        [(0, 1, "validation"), (1, 2, "regle / admin"), (1, 0, "reactivation"),
         (1, 3, "evenements suspects"), (2, 4, "fin de contrat"), (3, 1, "deblocage autorise"),
         (4, 1, "reactivation controlee")]))
    # Beneficiaire (M02-F06)
    pages.append(state_page("Statuts du dossier beneficiaire (M02)",
        [(60, 200, "ACTIF"), (300, 200, "A VERIFIER"), (540, 200, "FUSIONNE"),
         (60, 400, "ARCHIVE"), (300, 400, "SIGNALE")],
        [(0, 1, "doublon potentiel"), (1, 0, "rapprochement OK"),
         (1, 2, "fusion controlee"), (0, 3, "inactif longue duree"),
         (0, 4, "anomalie detectee"), (4, 0, "traitement"), (2, 0, "erreur de fusion")]))
    # Acte vaccinal (M05)
    pages.append(state_page("Cycle de vie d'un acte vaccinal (M05)",
        [(40, 160, "PLANIFIE"), (280, 160, "SAISI HORS LIGNE"), (520, 160, "VALIDE"),
         (760, 160, "CORRIGE"), (280, 360, "REPORTE"), (520, 360, "ANNULE"),
         (760, 360, "NON REALISE")],
        [(0, 1, "saisie equipe mobile"), (0, 6, "motif"), (1, 2, "sync + validation pro"),
         (1, 5, "non fait"), (2, 3, "correction autorisee"), (5, 0, "reprogrammation"),
         (6, 0, "nouvelle tentative")]))
    # Campagne (M07)
    pages.append(state_page("Cycle de vie d'une campagne (M07)",
        [(60, 200, "BROUILLON"), (300, 200, "PLANIFIEE"), (540, 200, "EN COURS"),
         (780, 200, "EN ATTENTE DE SYNC"), (300, 400, "CLOTUREE"), (540, 400, "EVALUEE")],
        [(0, 1, "validation plan"), (1, 2, "date debut"), (2, 3, "donnees hors ligne"),
         (3, 2, "synchronisation"), (2, 4, "fin + bilan"), (4, 5, "validation responsable")]))
    # Incident chaine du froid (M09)
    pages.append(state_page("Incident de chaine du froid (M09)",
        [(60, 200, "ALERTE"), (300, 200, "OUVERT"), (540, 200, "EN TRAITEMENT"),
         (780, 200, "EN EVALUATION"), (540, 400, "CLOTURE"), (780, 400, "REJETE")],
        [(0, 1, "qualification"), (1, 2, "mesures conservatoires"),
         (2, 3, "saisine autorite"), (3, 4, "decision + justification"),
         (3, 5, "fausse alerte")]))
    # Notification (M10)
    pages.append(state_page("Cycle de vie d'une notification (M10)",
        [(60, 200, "PLANIFIEE"), (300, 200, "ENVOYEE"), (540, 200, "DELIVREE"),
         (780, 200, "LUE / ACCUSEE"), (300, 400, "ECHEC"), (540, 400, "RELANCEE")],
        [(0, 1, "declencheur"), (1, 2, "accuse operateur"), (2, 3, "consultation"),
         (1, 4, "echec canal"), (4, 5, "relance controlee"), (6 - 1, 0, "") if False else (5, 0, "replanification")]))
    # Referentiel vaccinal (M04)
    pages.append(state_page("Cycle de vie d'un referentiel vaccinal (M04)",
        [(60, 200, "BROUILLON"), (300, 200, "SOUMIS"), (540, 200, "APPROUVE"),
         (780, 200, "PUBLIE"), (540, 400, "RETIRE"), (780, 400, "ARCHIVE")],
        [(0, 1, "soumission"), (1, 2, "validation autorite medicale"),
         (1, 0, "rejet"), (2, 3, "mise en production"), (3, 4, "remplace par v+1"),
         (4, 5, "fin de consultation")]))
    return pages

# ============================================================
# FICHIER 3 : MODELE DE DONNEES
# ============================================================
def entite(p, x, y, w, title, attrs, fill=BLUE):
    h = 26 + 15 * len(attrs)
    cid = p.rect(x, y, w, h, "", fill=fill, border=BLUE_B)
    p.text(x + 6, y + 4, title, 11, True, "#1a3a6b", w - 10)
    for i, a in enumerate(attrs):
        p.text(x + 10, y + 26 + i * 15, a, 9, False, "#333333", w - 16)
    return cid, h

def build_mcd():
    p = Page("Modele conceptuel de donnees")
    p.text(40, 15, "Modele conceptuel de donnees - ImmuniQ (cartographie M01-M13)", 16, True)
    p.text(40, 38, "PK soulignes; relations indiquees cardinalites (simplifie)", 10, False, "#666666", 500)
    y0 = 90
    entite(p, 40, y0, 220, "Utilisateur", ["id (PK)", "identifiant connexion", "nom, prenom", "statut", "role_id (FK)"])
    entite(p, 320, y0, 220, "Role / Permission", ["id (PK)", "code role", "permission", "perimetre"])
    entite(p, 600, y0, 200, "Session / Appareil", ["id (PK)", "utilisateur_id", "appareil", "expire_le", "revoquee"])
    entite(p, 40, y0 + 210, 220, "Structure / Equipe", ["id (PK)", "type (public/prive/mobile)", "code", "territoire_id", "statut"])
    entite(p, 320, y0 + 210, 220, "Territoire", ["id (PK)", "niveau (nat/reg/dist)", "parent_id", "nom"])
    entite(p, 600, y0 + 210, 200, "Affectation", ["id (PK)", "utilisateur_id", "structure_id", "debut/fin", "temporaire"])
    entite(p, 40, y0 + 470, 220, "Beneficiaire", ["id (PK)", "IMQ-id permanent", "nom, prenom, naissance", "statut", "structure_origine"])
    entite(p, 320, y0 + 470, 220, "RepresentantLegal", ["id (PK)", "nom", "lien", "autorite", "validite"])
    entite(p, 600, y0 + 470, 200, "LienRepresentation", ["beneficiaire_id", "representant_id", "droits", "base_legale"])
    entite(p, 40, y0 + 720, 240, "DossierVaccinal / Historique", ["id (PK)", "beneficiaire_id", "source", "niveau_verif"])
    entite(p, 330, y0 + 720, 240, "ActeVaccinal", ["id (PK)", "beneficiaire_id", "vaccin_id", "dose", "date_heure", "professionnel_id", "lot_id", "statut", "campagne_id"])
    entite(p, 620, y0 + 720, 200, "EvenementPostVaccinal", ["id (PK)", "acte_id", "type", "description", "declare_par"])
    entite(p, 40, y0 + 1010, 240, "Referentiel / Calendrier", ["id (PK)", "type", "version", "statut", "source_officielle", "date_effet", "approbateur"])
    entite(p, 330, y0 + 1010, 240, "RegleVaccinale", ["id (PK)", "referentiel_id", "tranche_age", "dose", "intervalle", "contexte"])
    entite(p, 620, y0 + 1010, 200, "Campagne", ["id (PK)", "nom", "objectif", "population_cible", "periode", "statut", "responsable_id"])
    entite(p, 40, y0 + 1280, 240, "Stock / Lot", ["id (PK)", "produit_id", "quantite", "peremption", "depot_id", "seuil_alerte"])
    entite(p, 330, y0 + 1280, 240, "MouvementStock", ["id (PK)", "type (entree/sortie/transfert)", "origine", "destination", "quantite", "motif", "auteur", "date"])
    entite(p, 620, y0 + 1280, 200, "EquipementFroid", ["id (PK)", "type", "site_id", "responsable", "statut"])
    entite(p, 40, y0 + 1540, 240, "ReleveTemperature", ["id (PK)", "equipement_id", "valeur", "date_heure", "source", "auteur"])
    entite(p, 330, y0 + 1540, 240, "IncidentFroid", ["id (PK)", "debut/fin", "statut", "responsable", "decision", "lots_concernes"])
    entite(p, 620, y0 + 1540, 200, "Notification", ["id (PK)", "type", "canal", "destinataire", "statut_envoi", "relance"])
    entite(p, 40, y0 + 1800, 240, "JournalAudit", ["id (PK)", "auteur_id", "action", "objet", "horodatage", "resultat"])
    entite(p, 330, y0 + 1800, 240, "SyncOperation / Conflit", ["id (PK)", "appareil_id", "id_local", "statut", "conflit", "resolution"])
    entite(p, 620, y0 + 1800, 200, "Export / Rapport", ["id (PK)", "type", "perimetre", "auteur", "finalite", "date"])
    # relations principales (traits simples relies)
    rels = [
        ((260, y0+50), (320, y0+50), "1,N"),   # Utilisateur-Role
        ((260, y0+230), (320, y0+230), "1,N"), # Structure-Territoire
        ((160, y0+270), (160, y0+470), "1,N"), # Structure-Beneficiaire (origine)
        ((260, y0+510), (320, y0+510), "N,N"), # Beneficiaire-Representant
        ((160, y0+540), (160, y0+720), "1,N"), # Beneficiaire-Dossier
        ((450, y0+560), (450, y0+720), "1,N"), # Dossier-Acte (via dossier)
        ((260, y0+780), (330, y0+780), "1,N"), # Referentiel-Regle
        ((550, y0+780), (620, y0+780), "1,N"), # Campagne-Acte
        ((160, y0+790), (330, y0+1010), ""),   # Acte-Lot? skip crossing
        ((160, y0+1400), (160, y0+1540), "1,N"),# Equipement-Releve (approx)
        ((160, y0+1670), (160, y0+1800), "1,N"),
    ]
    for (a, b, card) in rels:
        p.edge(_mk_edge_stub(p, a, b), _mk_edge_stub(p, a, b)) if False else None
    # plus simple: dessiner les relations avec des edges entre boites via ids stockes - on simplifie: traits textuels
    p.text(40, y0 + 2080, "Relations cles : Utilisateur N-N Role (via affectation) ; Beneficiaire 1-N ActeVaccinal ; "
         "ActeVaccinal N-1 Lot/Campagne ; EquipementFroid 1-N ReleveTemperature 1-N IncidentFroid ; "
         "Referentiel 1-N RegleVaccinale ; JournalAudit et SyncOperation transverses.", 10, False, "#666666", 780)
    return p

def _mk_edge_stub(p, a, b):
    return "0"

# Pour les relations MCD, on relie les boites par leur id : on doit stocker les ids.
# Version simplifiee: on ajoute des edges entre les ids retournes par entite().
def build_mcd2():
    p = Page("Modele conceptuel de donnees")
    p.text(40, 15, "Modele conceptuel de donnees - ImmuniQ (cartographie M01-M13)", 16, True)
    p.text(40, 38, "Entites principales et relations (cardinalites simplifiees)", 10, False, "#666666", 520)
    y0 = 90
    u, _  = entite(p, 40, y0, 220, "Utilisateur", ["id PK", "identifiant", "statut", "role_id FK"])
    r, _  = entite(p, 320, y0, 220, "Role", ["id PK", "code", "permissions", "perimetre"])
    s, _  = entite(p, 600, y0, 200, "Session", ["id PK", "utilisateur_id", "expire", "revoquee"])
    st, _ = entite(p, 40, y0+210, 220, "Structure", ["id PK", "type", "code", "territoire_id", "statut"])
    t, _  = entite(p, 320, y0+210, 220, "Territoire", ["id PK", "niveau", "parent_id", "nom"])
    a, _  = entite(p, 600, y0+210, 200, "Affectation", ["id PK", "user_id", "structure_id", "debut/fin"])
    b, _  = entite(p, 40, y0+470, 220, "Beneficiaire", ["id PK", "IMQ-id", "naissance", "statut"])
    rl, _ = entite(p, 320, y0+470, 220, "RepresentantLegal", ["id PK", "lien", "autorite", "validite"])
    dv, _ = entite(p, 600, y0+470, 200, "DossierVaccinal", ["id PK", "beneficiaire_id", "source", "verif"])
    act,_ = entite(p, 40, y0+720, 240, "ActeVaccinal", ["id PK", "beneficiaire_id", "vaccin", "dose", "date", "pro_id", "lot_id", "statut"])
    epv,_ = entite(p, 330, y0+720, 240, "EvtPostVaccinal", ["id PK", "acte_id", "type", "declarant"])
    rf, _ = entite(p, 620, y0+720, 200, "Campagne", ["id PK", "objectif", "cible", "periode", "statut"])
    ref,_ = entite(p, 40, y0+1010, 240, "Referentiel", ["id PK", "type", "version", "statut", "source", "approbateur"])
    rg, _ = entite(p, 330, y0+1010, 240, "RegleVaccinale", ["id PK", "ref_id", "age", "dose", "intervalle"])
    lot,_ = entite(p, 620, y0+1010, 200, "Lot / Stock", ["id PK", "produit", "qte", "peremption", "depot"])
    mv, _ = entite(p, 40, y0+1280, 240, "MouvementStock", ["id PK", "type", "orig/dest", "qte", "motif", "auteur"])
    eq, _ = entite(p, 330, y0+1280, 240, "EquipementFroid", ["id PK", "type", "site", "responsable", "statut"])
    tmp,_ = entite(p, 620, y0+1280, 200, "ReleveTemperature", ["id PK", "equip_id", "valeur", "date", "source"])
    inc,_ = entite(p, 40, y0+1540, 240, "IncidentFroid", ["id PK", "debut/fin", "statut", "decision", "lots"])
    ntf,_ = entite(p, 330, y0+1540, 240, "Notification", ["id PK", "type", "canal", "dest", "statut", "relance"])
    aud,_ = entite(p, 620, y0+1540, 200, "JournalAudit", ["id PK", "auteur", "action", "objet", "horodatage"])
    syn,_ = entite(p, 40, y0+1800, 240, "SyncOperation", ["id PK", "appareil", "id_local", "statut", "conflit"])
    exp,_ = entite(p, 330, y0+1800, 240, "Export / Rapport", ["id PK", "type", "perimetre", "auteur", "finalite"])
    # relations
    rel = [
        (u, r, "possede"), (u, s, "1-N"), (u, a, "1-N"), (st, t, "1-N"),
        (st, a, "1-N"), (a, r, ""), (b, rl, "N-N"), (b, dv, "1-N"),
        (dv, act, "1-N"), (act, epv, "1-N"), (act, rf, "N-1"),
        (act, lot, "N-1"), (ref, rg, "1-N"), (lot, mv, "1-N"),
        (eq, tmp, "1-N"), (tmp, inc, "N-1"), (eq, inc, "1-N"),
        (u, aud, "1-N"), (syn, act, "alimente"), (u, exp, "1-N"),
    ]
    for i, (s1, s2, lbl) in enumerate(rel):
        p.edge(s1, s2, lbl, dashed=True, color=PURPLE_B, width=1)
    p.text(40, y0 + 2080, "Regles : identifiant IMQ permanent et non reutilise ; aucune suppression d'historique ; "
         "toute modification sensible historisee (JournalAudit) ; SyncOperation garantit idempotence et absence de doublons.",
         10, False, "#666666", 780)
    return p

# ============================================================
# FICHIER 4 : FLUX METIER
# ============================================================
def flow_page(title, steps, lanes=None):
    """steps: list of (label, kind) kind: start/act/end/decision ; lanes: optional list of (name,x) """
    p = Page(title)
    p.text(40, 15, title, 15, True)
    if lanes:
        for name, x in lanes:
            p.rect(x, 60, 160, 30, name, fill=GREY, border=GREY_B, fs=11, bold=True)
    x, y = 60, 130
    prev = None
    kind_map = {"start": "ellipse", "act": "box", "end": "ellipse", "decision": "diamond"}
    for i, st in enumerate(steps):
        label, kind = st if isinstance(st, tuple) else (st, "act")
        if kind == "start":
            cid = p.ellipse(x, y, 40, 40, "", fill=GREEN, border=GREEN_B)
            p.text(x + 4, y + 12, "", 1)
        elif kind == "end":
            cid = p.ellipse(x, y, 40, 40, "", fill=PINK, border=PINK_B)
        elif kind == "decision":
            cid = p.diamond(x, y, 170, 80, label, fill=YELLOW, border=YELLOW_B, fs=10)
            if prev: p.edge(prev, cid, "")
            prev = cid
            y += 110
            continue
        else:
            cid = p.box(x, y, 190, 55, label, fs=10)
        if prev: p.edge(prev, cid, "")
        prev = cid
        y += 85
        if y > 950:
            y = 130; x += 280
    return p

def build_flux():
    pages = []
    # Parcours vaccination (4.2 CDC)
    pages.append(flow_page("Parcours : prise en charge et vaccination",
        [("Authentification + verification affectation", "act"),
         ("Recherche beneficiaire (IMQ-id / criteres)", "act"),
         ("Verification identite + consultation dossier", "act"),
         ("Consultation echeances (referentiel publie)", "act"),
         ("Verifications prealables protocole", "decision"),
         ("Contre-indication / precaution ?", "decision"),
         ("Decision clinique du professionnel", "act"),
         ("Enregistrement acte + lot + contexte", "act"),
         ("Mise a jour dossier + preparation notifications", "act"),
         ("Sync si hors ligne", "act")],
        lanes=[("Professionnel", 40), ("Systeme ImmuniQ", 320), ("Beneficiaire", 600)]))
    # Mission mobile (4.3)
    pages.append(flow_page("Parcours : mission mobile",
        [("Creation mission (periode, zone, objectifs)", "act"),
         ("Affectation equipe + droits temporaires", "act"),
         ("Preparation donnees hors ligne autorisees", "act"),
         ("Realisation activites terrain", "act"),
         ("Saisie actes/mouvements en local", "act"),
         ("Reconnexion -> synchronisation", "act"),
         ("Traitement conflits / doublons", "decision"),
         ("Conflit sensible ?", "act"),
         ("Cloture mission + expiration droits", "act")]))
    # Incident chaine du froid (4.4)
    pages.append(flow_page("Parcours : incident chaine du froid",
        [("Detection mesure hors seuil", "act"),
         ("Alerte + identification equipements/lots", "act"),
         ("Notification responsable", "act"),
         ("Mesures conservatoires", "act"),
         ("Evaluation par autorite competente", "act"),
         ("Decision documentee (reutilisation lot ?)", "decision"),
         ("Cloture justifiee + actions correctives", "act"),
         ("Historisation complete", "act")]))
    # Cycle referentiel
    pages.append(flow_page("Cycle de vie : referentiel vaccinal",
        [("Creation regles (brouillon)", "act"),
         ("Soumission pour validation", "act"),
         ("Validation autorite medicale", "decision"),
         ("Approbation ?", "act"),
         ("Publication + date effet", "act"),
         ("Calculs echeances utilisent version publiee", "act"),
         ("Remplacement par nouvelle version (pas d'ecrasement)", "act"),
         ("Retrait controle + archivage", "act")]))
    # Synchronisation hors ligne
    pages.append(flow_page("Synchronisation hors ligne (M12)",
        [("Preparation : telechargement donnees autorisees", "act"),
         ("Consultation locale (donnees synchronisees)", "act"),
         ("Saisie locale avec identifiant unique", "act"),
         ("Marquage 'en attente de sync'", "act"),
         ("Reconnexion -> sync auto/manuelle", "act"),
         ("Controle idempotence + doublons", "decision"),
         ("Conflit ?", "act"),
         ("Resolution selon type de donnee", "act"),
         ("Conflit sensible -> utilisateur habilite", "act"),
         ("Confirmation serveur = synchronise", "act")]))
    # Notifications
    pages.append(flow_page("Notifications et rappels (M10)",
        [("Calcul rappels depuis referentiel valide", "act"),
         ("Verification preferences/consentement", "act"),
         ("Envoi multicanal (SMS/push/portail)", "act"),
         ("Enregistrement statut envoi/livraison", "act"),
         ("Echec ?", "decision"),
         ("Relance controlee / canal secours", "act"),
         ("Accuse prise en compte (alertes pro)", "act"),
         ("Recalcul si dossier/referentiel change", "act")]))
    return pages

# ============================================================
# FICHIER 5 : SECURITE / RBAC
# ============================================================
def build_securite():
    pages = []
    # Matrice RBAC
    p = Page("Matrice roles x permissions (RBAC + perimetre)")
    p.text(40, 15, "Matrice des habilitations - ImmuniQ (extrait M01/M16)", 15, True)
    p.text(40, 38, "X = autorise ; perimetre organisationnel toujours applique", 10, False, "#666666", 500)
    roles = ["Admin national", "Autorite sanitaire", "Resp. structure", "Gestionnaire stock",
             "Vaccinateur", "Agent campagne", "Beneficiaire"]
    perms = ["Lire dossiers", "Creer comptes", "Valider referentiel", "Saisir acte",
             "Mouvements stock", "Exporter data", "Administrer systeme"]
    x0, y0, cw, rh = 200, 90, 130, 42
    # entete colonnes
    for j, perm in enumerate(perms):
        p.rect(x0 + j*cw, y0, cw, 60, perm, fill=GREY, border=GREY_B, fs=9, bold=True)
    matrix = [
        # Admin, Autorite, RespStruct, GestStock, Vaccinateur, AgentCamp, Benef
        ["X","X","-","-","-","X","-"],
        ["X","X","-","-","-","X","-"],
        ["X","-","-","-","X","-","-"],
        ["-","-","X","X","-","-","-"],
        ["X*","-","-","-","X","X","-"],
        ["X*","-","-","-","X","X","-"],
        ["X*","-","-","-","-","-","X"],
    ]
    for i, role in enumerate(roles):
        y = y0 + 60 + i*rh
        p.rect(40, y, 150, rh, role, fill=BLUE, border=BLUE_B, fs=10, bold=True)
        for j, val in enumerate(matrix[i]):
            fill = GREEN if val == "X" else (YELLOW if val == "X*" else "#ffffff")
            p.rect(x0 + j*cw, y0 + 60 + i*rh, cw, rh, val if val != "-" else "", fill=fill, border=GREY_B, fs=10)
    p.text(40, y0 + 60 + 7*rh + 20, "* = restreint au perimetre/affectation de l'utilisateur. "
         "Separation lecture/creation/modification/validation/export/administration. "
         "Toute action sensible journalisee (JournalAudit).", 10, False, "#666666", 760)
    pages.append(p)
    # Authentification / session
    p2 = Page("Authentification et sessions (M01)")
    p2.text(40, 15, "Flux d'authentification et gestion des sessions", 15, True)
    steps = [
        ("Saisie identifiant + mot de passe", "act"),
        ("Verification credentials", "decision"),
        ("Echec -> compteur / blocage progressif", "act"),
        ("Profil sensible ?", "decision"),
        ("Second facteur (OTP / app auth)", "act"),
        ("Creation session + appareil", "act"),
        ("Expiration inactivite / duree max", "act"),
        ("Revocation session/appareil", "act"),
        ("Detection connexion inhabituelle -> alerte", "act"),
    ]
    # flow horizontal simple en 2 colonnes
    x, y, prev = 60, 130, None
    for label, kind in steps:
        cid = p2.box(x, y, 200, 55, label, fs=10)
        if prev: p2.edge(prev, cid, "")
        prev = cid
        y += 80
        if y > 900: y = 130; x += 280
    pages.append(p2)
    # Sync offline architecture
    p3 = Page("Architecture synchronisation hors ligne (M12)")
    p3.text(40, 15, "Mode hors ligne : preparation, local, synchronisation, conflits", 15, True)
    # zones
    p3.rect(40, 80, 300, 900, "", fill=GREY, border=GREY_B)
    p3.text(60, 95, "APPAREIL MOBILE (local chiffre)", 12, True)
    p3.rect(460, 80, 320, 900, "", fill=BLUE, border=BLUE_B)
    p3.text(480, 95, "SERVEUR IMMUNIQ", 12, True)
    local_items = [
        (60, 140, "Cache chiffre (dossiers autorises)"),
        (60, 210, "Referentiels telecharges"),
        (60, 280, "File d'attente d'operations (id local unique)"),
        (60, 350, "Saisie actes / mouvements / releves"),
        (60, 420, "Marquage 'en attente de sync'"),
        (60, 490, "Verrouillage + expiration donnees locales"),
        (60, 560, "Effacement sur perte/retrait appareil"),
    ]
    for x, y, lbl in local_items:
        p3.box(x, y, 260, 50, lbl, fill=GREEN, border=GREEN_B, fs=10)
    server_items = [
        (480, 140, "Controle habilitations a chaque sync"),
        (480, 210, "Idempotence : pas de doublons"),
        (480, 280, "Detection conflits de modification"),
        (480, 350, "Regles de resolution par type de donnee"),
        (480, 420, "Conflits sensibles -> file de traitement"),
        (480, 490, "Historique des versions conserve"),
        (480, 560, "JournalAudit des synchronisations"),
    ]
    for x, y, lbl in server_items:
        p3.box(x, y, 280, 50, lbl, fill=PURPLE, border=PURPLE_B, fs=10)
    # flux
    p3.edge(p3.cells and "0" or "0", "0") if False else None
    p3.text(60, 700, "Telechargement initial : uniquement donnees\nautorisees + duree de validite", 10, False, "#555555", 260)
    p3.text(480, 700, "Upload : lot d'operations -> accusé de\nreception -> etat 'synchronise'", 10, False, "#555555", 280)
    p3.text(60, 780, "Regle : le mode hors ligne ne donne JAMAIS\nplus de droits que le mode connecte.", 10, False, "#b85450", 260)
    p3.text(480, 780, "Une operation locale n'est 'sync' qu'apres\nconfirmation serveur. Conflits sans perte\nsilencieuse d'acte vaccinal.", 10, False, "#b85450", 280)
    pages.append(p3)
    return pages

# ============================================================
if __name__ == "__main__":
    write_file("01_Contexte_et_Acteurs.drawio", [build_contexte(), build_usecases()])
    write_file("02_Machines_a_etats.drawio", build_etats())
    write_file("03_Modele_de_donnees.drawio", [build_mcd2()])
    write_file("04_Flux_metier.drawio", build_flux())
    write_file("05_Securite_RBAC.drawio", build_securite())
