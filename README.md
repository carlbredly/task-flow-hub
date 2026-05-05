# 🎯 Track'm — Prompt Complet de Développement

> **Stack** : React · TypeScript · Tailwind CSS · shadcn/ui · Supabase  
> **Type** : Personal Task Manager avec collaboration et intégration Google Calendar

---

## 🧠 Prompt Principal

Tu es un développeur fullstack senior. Crée une webapp complète appelée **"Track'm"** — un gestionnaire de tâches personnel avec collaboration, intégration Google Calendar, et tableau de bord analytique.

---

## ⚙️ STACK TECHNIQUE

| Couche | Technologie |
|---|---|
| Frontend | React + TypeScript + Vite |
| UI | Tailwind CSS + shadcn/ui (Dialog, Sheet, Popover, Badge, Avatar, etc.) |
| Backend / DB | Supabase (Auth, Database, Storage, Realtime, Edge Functions) |
| Calendrier | Google Calendar API (OAuth2 via Supabase Auth) |
| Notifications | Supabase Realtime + Web Push API |
| Icons | Lucide React |
| Charts | Recharts ou Tremor |
| Dates | date-fns |
| State | Zustand |
| Forms | React Hook Form + Zod |

---

## 🎨 DESIGN SYSTEM

**Aesthetic** : Dark productivity tool — style *"Linear meets Notion"* avec une touche premium.

| Token | Valeur |
|---|---|
| Background principal | `#0A0A0F` (quasi-noir) |
| Surface cards | `#111118` |
| Accent principal | `#6366F1` (indigo-500, glow subtil) |
| Accent secondaire | `#10B981` (vert émeraude — tâches "done") |
| Warning | `#F59E0B` (amber — delayed) |
| Danger | `#EF4444` |
| Texte primaire | `#F1F5F9` |
| Texte secondaire | `#64748B` |
| Border | `rgba(255,255,255,0.06)` |
| Border radius | `12px` par défaut |

**Typographie**
- Display : `DM Sans` (import Google Fonts)
- Mono : `JetBrains Mono` pour codes/liens

**Layout**
- Sidebar : 240px fixe, collapse possible
- Animations : Framer Motion pour transitions de page et modals

---

## 🗄️ ARCHITECTURE BASE DE DONNÉES (Supabase)

### Schéma SQL complet

```sql
-- Workspaces (espaces partagés)
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES auth.users NOT NULL,
  invite_token uuid UNIQUE DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now()
);

-- Membres du workspace
CREATE TABLE workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  role text CHECK (role IN ('owner','admin','editor','viewer')) DEFAULT 'viewer',
  visible_categories text[] DEFAULT '{"all"}',
  joined_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Catégories de tâches
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- Tâches (avec support sous-tâches via parent_task_id)
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces ON DELETE CASCADE,
  parent_task_id uuid REFERENCES tasks NULL,
  title text NOT NULL,
  description text,
  location text,
  status text CHECK (status IN ('todo','in_progress','done','delayed')) DEFAULT 'todo',
  priority text CHECK (priority IN ('low','medium','high','urgent')) DEFAULT 'medium',
  category_id uuid REFERENCES categories,
  assigned_to uuid[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users,
  due_date timestamptz,
  reminder_at timestamptz,
  google_event_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Fichiers attachés aux tâches
CREATE TABLE task_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tasks ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size int,
  uploaded_by uuid REFERENCES auth.users,
  uploaded_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  task_id uuid REFERENCES tasks NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Paramètres utilisateur
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  reminder_time time DEFAULT '18:00',
  push_notifications boolean DEFAULT true,
  email_notifications boolean DEFAULT false,
  default_workspace_id uuid REFERENCES workspaces NULL
);
```

### Row Level Security (RLS) — obligatoire sur toutes les tables

```sql
-- Exemple RLS pour tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view workspace tasks"
  ON tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Editors and above can insert tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner','admin','editor')
    )
  );
```

> Appliquer des policies similaires pour `workspaces`, `workspace_members`, `categories`, `notifications`, `task_files`, `user_settings`.

---

## ✨ FONCTIONNALITÉS À IMPLÉMENTER

### 1. AUTHENTIFICATION

- Login / Register via Supabase Auth (email + Google OAuth)
- Page d'onboarding après inscription : créer ou rejoindre un workspace
- Protected routes avec redirection automatique

---

### 2. LAYOUT PRINCIPAL

**Sidebar gauche fixe (240px)**
- Logo "Track'm" avec badge du workspace actif
- Navigation : Dashboard · Tasks · Calendar · Notifications · Settings
- En bas : Avatar user + nom + bouton logout
- Badge rouge sur l'icône Tasks si des tâches sont en retard

**Header**
- Breadcrumb contextuel
- Bouton `+ New Task` (shortcut : `Cmd+K`)
- Cloche notifications avec badge count
- Switcher de vue List / Calendar (visible seulement sur la page Tasks)

---

### 3. PAGE TASKS — Vue Liste

**Filtres et contrôles**
- Barre de recherche globale
- Filtres multi-select : Catégorie · Assigné à · Statut · Priorité · Date
- Toggle "Mes tâches uniquement"
- Bouton "📱 Importer dans mon téléphone" (visible uniquement en vue Calendar)

**Affichage des tâches**
- Liste groupée par catégorie OU par statut (toggle)
- Chaque carte affiche : checkbox statut, titre, badge catégorie coloré, avatars assignés, due date, dot priorité, indicateur sous-tâches `X/Y`
- Clic sur une tâche → Panel latéral droit (shadcn Sheet)

**Sous-tâches**
- Section "Sub-tasks" dans le panel avec liste indentée
- Bouton `+ Add sub-task`
- Les sous-tâches héritent de la catégorie de la tâche parent
- Progression parent calculée automatiquement (X/Y sous-tâches complétées)

**Auto-assignation**
- Si `assigned_to` est vide, afficher le bouton `Assign to me`
- Un utilisateur peut s'auto-assigner si personne n'est encore assigné

---

### 4. PANEL DÉTAIL D'UNE TÂCHE (Sheet droite)

Tous les champs sont éditables inline :

| Champ | Type |
|---|---|
| Titre | `input` avec autofocus |
| Description | `textarea` (markdown simple) |
| Catégorie | `select` avec pastilles de couleur |
| Statut | `select` : Todo / In Progress / Done / Delayed |
| Priorité | `select` : Low / Medium / High / Urgent |
| Date d'échéance | Date + Time picker |
| Lieu / Location | `input` avec icône `MapPin` |
| Assignés | Multi-select parmi les membres, avec avatars |
| Rappel personnalisé | Date + heure optionnelle |
| Fichiers joints | Upload Supabase Storage, preview miniature, téléchargement |
| Sous-tâches | Liste avec checkbox + `add` |
| Activité | Log chronologique des changements |

**Boutons d'action**
- Sync Google Calendar
- Marquer comme Done
- Supprimer (avec dialog de confirmation)

---

### 5. VUE CALENDRIER

- Calendrier mensuel / hebdomadaire (`react-big-calendar` ou implémentation custom)
- Les tâches apparaissent sur leur `due_date` avec la couleur de leur catégorie
- Clic sur une tâche → Panel détail identique à la vue Liste
- **Bouton visible uniquement ici** : `📱 Importer dans mon calendrier téléphone`
  - Génère un lien iCal public : `https://[domain]/api/calendar/[workspace_id]/[user_token].ics`
  - Supabase Edge Function génère le fichier `.ics` à la volée
  - L'utilisateur colle ce lien dans iOS Calendrier / Google Calendar / Outlook

---

### 6. GOOGLE CALENDAR INTEGRATION

- Connexion via OAuth2 Google (scope: `calendar.events`) dans les Settings
- Option `Sync to Google Calendar` dans le panel de chaque tâche (si `due_date` renseignée)
- L'event Google Calendar créé contient :
  - Titre = `task.title`
  - Description = `task.description`
  - Location = `task.location`
  - Start/End = `task.due_date` (durée d'1h par défaut)
- Le `google_event_id` est stocké en base pour les mises à jour et suppressions futures
- **Les appels à l'API Google sont faits via une Supabase Edge Function** (sécurisé côté serveur)

---

### 7. SYSTÈME D'INVITATION ET RÔLES

**Générer un lien d'invitation**
- Bouton "Invite Members" dans Settings > Workspace
- Lien généré : `https://[domain]/join/[invite_token]`

**Page `/join/[token]`**
- Affiche le nom du workspace et le nombre de membres
- Si connecté → rejoint directement avec rôle `viewer`
- Si non connecté → redirection vers login puis join automatique

**Rôles et permissions**

| Rôle | Permissions |
|---|---|
| **Owner** | Tout faire + supprimer le workspace |
| **Admin** | Gérer membres, rôles, catégories, toutes les tâches |
| **Editor** | Créer / modifier / assigner des tâches |
| **Viewer** | Voir uniquement (filtré par `visible_categories`) |

**Visibilité par catégorie** (Settings > Members > Edit Permissions)
- L'admin définit quelles catégories chaque membre peut voir
- Exemples : `["all"]`, `["sport"]`, `["graphic_design","work"]`
- Interface : modal avec checkboxes multi-select des catégories disponibles

---

### 8. DASHBOARD

**Row 1 — KPI Cards (avec count-up animation au chargement)**
- 📋 Total tâches actives
- ✅ Complétées cette semaine
- ⏳ En attente (todo + in_progress)
- 🔴 En retard (due_date < now ET status ≠ done)

**Row 2 — Charts (Recharts)**
- Donut : répartition Done / Pending / Delayed
- Barres : tâches créées vs complétées par semaine (6 dernières semaines)
- Ligne : productivité quotidienne (tâches terminées par jour)

**Row 3 — Sections rapides**
- "Aujourd'hui" : tâches dues ce jour
- "En retard" : liste rouge avec badge
- "Récemment terminées" : 5 dernières tâches done

---

### 9. SYSTÈME DE NOTIFICATIONS ET RAPPELS

**Edge Function cron (exécutée toutes les heures)**

```typescript
// Logique de la cron
1. Rappel J-1 : à user_settings.reminder_time (défaut 18h00),
   notifier pour toutes les tâches dues DEMAIN assignées à l'utilisateur

2. Rappel delayed : 30 min avant due_date pour toute tâche non complétée,
   envoyer notification "Ta tâche expire bientôt"

3. Détection auto delayed : toutes les tâches où
   due_date < now() AND status != 'done'
   → passer status à 'delayed' + créer notification
```

**Types de notifications**

| Type | Description |
|---|---|
| `reminder_tomorrow` | 🔔 Tâche due demain |
| `task_overdue` | ⚠️ Tâche en retard |
| `task_done` | ✅ Tâche marquée done (par un autre membre) |
| `task_assigned` | 📋 Tu as été assigné à une tâche |
| `member_joined` | 👥 Nouveau membre dans le workspace |
| `task_updated` | 💬 Tâche mise à jour (si tu es assigné) |

**Page Notifications**
- Liste chronologique avec icône type, titre, message, timestamp relatif ("il y a 5 min")
- Clic → marque comme lu + navigate vers la tâche
- Bouton "Mark all as read"
- Filtre par type
- Supabase Realtime pour les notifications temps réel

**Settings > Notifications**
- Time picker pour l'heure du rappel quotidien (défaut 18:00)
- Toggle : Push notifications
- Toggle : Email notifications
- Toggle par type de notification

---

### 10. SETTINGS — Onglets

| Onglet | Contenu |
|---|---|
| **Profile** | Nom, avatar (upload Supabase Storage), email (read-only) |
| **Workspace** | Nom, lien d'invitation (copier + régénérer), danger zone |
| **Members** | Liste membres + rôles (dropdown) + visibilité catégories |
| **Categories** | CRUD : nom, couleur (color picker), icône (Lucide select) |
| **Notifications** | Heure rappel, tous les toggles |
| **Integrations** | Connect / Disconnect Google Calendar + statut de connexion |

---

## 📁 STRUCTURE DU PROJET

```
src/
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   ├── tasks/
│   │   ├── TaskList.tsx
│   │   ├── TaskCard.tsx
│   │   ├── TaskPanel.tsx          ← Sheet latérale
│   │   ├── TaskForm.tsx
│   │   ├── SubTaskList.tsx
│   │   └── TaskFilters.tsx
│   ├── calendar/
│   │   ├── CalendarView.tsx
│   │   └── ICalLink.tsx
│   ├── dashboard/
│   │   ├── KPICards.tsx
│   │   ├── TaskChart.tsx
│   │   └── UpcomingTasks.tsx
│   ├── notifications/
│   │   ├── NotificationBell.tsx
│   │   └── NotificationList.tsx
│   ├── workspace/
│   │   ├── InviteModal.tsx
│   │   ├── MemberTable.tsx
│   │   └── CategoryManager.tsx
│   └── ui/                        ← Composants shadcn
├── hooks/
│   ├── useTasks.ts
│   ├── useWorkspace.ts
│   ├── useNotifications.ts
│   └── useGoogleCalendar.ts
├── lib/
│   ├── supabase.ts
│   ├── google-calendar.ts
│   └── ical-generator.ts
├── stores/
│   └── useAppStore.ts             ← Zustand global store
├── pages/
│   ├── Dashboard.tsx
│   ├── Tasks.tsx
│   ├── Calendar.tsx
│   ├── Notifications.tsx
│   ├── Settings.tsx
│   └── Join.tsx                   ← /join/[token]
└── supabase/
    └── functions/
        ├── send-reminders/        ← Cron toutes les heures
        │   └── index.ts
        ├── google-calendar-sync/  ← Proxy API Google
        │   └── index.ts
        └── generate-ical/         ← Génère le fichier .ics
            └── index.ts
```

---

## 📐 RÈGLES DE DÉVELOPPEMENT

1. **TypeScript strict** — types pour toutes les entités Supabase (générer avec `supabase gen types typescript`)
2. **Zod validation** sur tous les formulaires React Hook Form
3. **Optimistic updates** — mettre à jour l'UI avant la réponse Supabase pour la fluidité
4. **Error handling** — toasts via shadcn/ui Sonner pour toutes les erreurs
5. **Loading states** — Skeleton components pendant les fetches initiaux
6. **Mobile responsive** — sidebar collapse sur mobile, bottom navigation bar
7. **Accessibility** — `aria-label` sur tous les boutons icônes, focus management dans les modals
8. **RLS obligatoire** sur toutes les tables Supabase (jamais de bypass côté client)
9. **Variables d'environnement** : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`

---

## 🚀 ORDRE D'IMPLÉMENTATION RECOMMANDÉ

```
Phase 1 — Fondations
  1. Setup Supabase : schéma SQL + RLS policies + types TypeScript générés
  2. Auth (email + Google OAuth) + protected routes
  3. Layout principal : Sidebar + Header + routing React Router

Phase 2 — Core Features
  4. CRUD tâches : liste + panel détail + formulaire de création
  5. Sous-tâches (liste indentée dans le panel)
  6. Catégories + filtres (par catégorie, assigné, statut, priorité)

Phase 3 — Analytics & Collaboration
  7. Dashboard : KPI Cards + Charts Recharts
  8. Système d'invitation : lien + page /join/[token]
  9. Rôles + visibilité par catégorie

Phase 4 — Intégrations
  10. Vue Calendrier (react-big-calendar)
  11. Lien iCal (Edge Function generate-ical)
  12. Google Calendar API sync (Edge Function google-calendar-sync)

Phase 5 — Notifications & Polish
  13. Notifications Realtime (Supabase Realtime subscription)
  14. Cron rappels (Edge Function send-reminders)
  15. Settings complets (tous les onglets)
  16. Mobile responsive + animations Framer Motion + polish final
```

---

## 🔑 POINTS D'ATTENTION CRITIQUES

- Le filtre de visibilité par catégorie doit être appliqué **à la fois via RLS côté Supabase ET côté client** pour éviter les leaks
- Le lien iCal doit être **public** (pas d'auth requise) mais **sécurisé par un token unique** par utilisateur
- Les appels à l'API Google Calendar doivent **toujours passer par une Edge Function** (ne jamais exposer le refresh token côté client)
- La détection des tâches "delayed" se fait dans la cron Edge Function et **met à jour le champ `status` en base** (pas de calcul côté client)
- Utiliser `supabase.channel()` avec Realtime pour les notifications en temps réel sans polling

---

*Prompt généré pour Track'm — Personal Task Manager*  
*Stack : React · TypeScript · Tailwind · shadcn/ui · Supabase*
