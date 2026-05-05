import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  LayoutDashboard, ListChecks, CalendarDays, Bell, Settings,
  Columns3, GanttChart, Tags, MessageSquare, Paperclip, Clock,
  Moon, Download, Timer, Users, CheckCircle2, ArrowRight,
} from "lucide-react";

const sections = [
  {
    icon: LayoutDashboard,
    title: "Tableau de bord",
    items: [
      "Vue d'ensemble de votre workspace : tâches actives, terminées, en retard.",
      "Graphique d'analyse projet : barres de progression sur 7 jours (créées vs terminées).",
      "Projets & priorités : les 5 tâches racines les plus urgentes, classées par priorité.",
      "Collaboration d'équipe : liste des membres avec leur tâche en cours.",
      "Progression du workspace : jauge circulaire du % de tâches terminées.",
      "Minuteur : session de focus avec chronomètre intégré.",
    ],
  },
  {
    icon: ListChecks,
    title: "Tâches & Kanban",
    items: [
      <><strong>Liste</strong> : vue linéaire avec filtres (catégorie, statut, priorité, assignation).</>,
      <><strong>Kanban</strong> : 4 colonnes par statut — À faire, En cours, En retard, Terminé. Glissez-déposez les cartes pour changer de colonne.</>,
      <><strong>Calendrier</strong> : grille mensuelle avec navigation, les tâches apparaissent sur leur date d'échéance.</>,
      <><strong>Gantt</strong> : timeline horizontale montrant la répartition des tâches dans le temps.</>,
      "Filtres combinables : catégorie, statut, priorité, membre assigné.",
      "Recherche textuelle en temps réel.",
      "Glissez-déposez pour réorganiser l'ordre des tâches.",
    ],
  },
  {
    icon: CheckCircle2,
    title: "Créer & gérer une tâche",
    items: [
      "Cliquez sur <strong>Créer une tâche</strong> ou sur le <strong>+</strong> dans la section Projets.",
      "Remplissez le titre (obligatoire), la description, la priorité, la catégorie et l'échéance.",
      "Utilisez un <strong>template</strong> pour pré-remplir les champs.",
      "Sauvegardez vos tâches fréquentes comme template pour les réutiliser.",
      "Ouvrez le panneau de détail en cliquant sur une carte pour modifier tous les champs.",
    ],
  },
  {
    icon: Tags,
    title: "Tags, commentaires & fichiers",
    items: [
      "Ajoutez des <strong>tags</strong> colorés à vos tâches pour les catégoriser finement.",
      "Créez de nouveaux tags à la volée ou sélectionnez parmi les existants.",
      "Laissez des <strong>commentaires</strong> sur les tâches (Enter pour envoyer).",
      "Ajoutez des <strong>pièces jointes</strong> : images, PDF, documents (10 Mo max).",
      "L'historique d'activité enregistre automatiquement chaque modification.",
    ],
  },
  {
    icon: CalendarDays,
    title: "Calendrier & import téléphone",
    items: [
      "Le calendrier affiche toutes les tâches avec une date d'échéance.",
      "Naviguez entre les mois avec les flèches.",
      "Cliquez sur une tâche dans le calendrier pour ouvrir son panneau de détail.",
      <><strong>Importer dans mon calendrier téléphone</strong> : génère un lien iCal (format .ics).</>,
      "iPhone : Réglages → Calendrier → Comptes → Ajouter → Autre → Agenda abonné → collez le lien.",
      "Android / Google Calendar : Paramètres → Ajouter un calendrier → À partir d'une URL.",
      "Cliquez sur l'icône 📋 pour copier le lien sans ouvrir.",
    ],
  },
  {
    icon: Users,
    title: "Équipe & workspace",
    items: [
      "Invitez des membres via le lien d'invitation (Paramètres → Workspace).",
      "Rôles disponibles : Owner (tout), Admin (tout), Editor (créer/modifier tâches), Viewer (lecture seule).",
      "Chaque membre peut avoir des catégories visibles personnalisées.",
      "Régénérez le lien d'invitation à tout moment.",
      "Zone danger : supprimez toutes les tâches du workspace (Owner/Admin uniquement).",
    ],
  },
  {
    icon: Timer,
    title: "Minuteur & productivité",
    items: [
      "Le minuteur est disponible sur le tableau de bord.",
      "Lancez une session de focus, mettez en pause, réinitialisez.",
      "Idéal pour la technique Pomodoro : 25 min de travail, 5 min de pause.",
    ],
  },
  {
    icon: Moon,
    title: "Mode sombre",
    items: [
      "Activez le mode sombre depuis la barre latérale (icône lune/soleil).",
      "La préférence est sauvegardée et restaurée automatiquement.",
    ],
  },
  {
    icon: Bell,
    title: "Notifications & rappels",
    items: [
      "L'onglet Notifications liste toutes les alertes (tâches en retard, échéances proches).",
      "Marquez comme lu individuellement ou toutes en une fois.",
      "Les notifications apparaissent aussi dans la cloche de l'en-tête.",
      "Configurez l'heure de rappel et les préférences (push/email) dans Paramètres.",
    ],
  },
  {
    icon: Settings,
    title: "Paramètres",
    items: [
      "<strong>Workspace</strong> : renommer, lien d'invitation, zone danger.",
      "<strong>Membres</strong> : gérer les rôles et la visibilité des catégories.",
      "<strong>Catégories</strong> : créer de nouvelles catégories avec couleur personnalisée.",
      "<strong>Notifications</strong> : heure de rappel, push, email.",
      "<strong>Intégrations</strong> : Google Calendar (branchement à venir).",
    ],
  },
];

const HelpPage = () => (
  <div className="mx-auto max-w-4xl space-y-6 px-3 py-4 animate-fade-in sm:p-6">
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Guide d'utilisation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tout ce que vous devez savoir pour maîtriser Track'm.
      </p>
    </div>

    <div className="grid gap-4 sm:grid-cols-2">
      {sections.map(({ icon: Icon, title, items }) => (
        <Card key={title} className="rounded-2xl border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-sm font-semibold">{title}</h2>
          </div>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary/60" />
                <span className="text-xs text-muted-foreground leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>

    <Card className="rounded-2xl border-border bg-primary/5 p-6 text-center shadow-sm">
      <p className="text-sm text-muted-foreground">
        Besoin d'aide supplémentaire ?{" "}
        <Link to="/settings" className="font-medium text-primary hover:underline">
          Contactez le support
        </Link>
        {" "}ou consultez les{" "}
        <Link to="/settings" className="font-medium text-primary hover:underline">
          paramètres
        </Link>
        .
      </p>
    </Card>
  </div>
);

export default HelpPage;
