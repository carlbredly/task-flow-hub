
-- =========================================
-- ENUMS
-- =========================================
CREATE TYPE public.workspace_role AS ENUM ('owner','admin','editor','viewer');
CREATE TYPE public.task_status AS ENUM ('todo','in_progress','done','delayed');
CREATE TYPE public.task_priority AS ENUM ('low','medium','high','urgent');

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- WORKSPACES
-- =========================================
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_token uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- WORKSPACE MEMBERS
-- =========================================
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.workspace_role NOT NULL DEFAULT 'viewer',
  visible_categories text[] NOT NULL DEFAULT ARRAY['all'],
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- =========================================
-- CATEGORIES
-- =========================================
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366F1',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- TASKS
-- =========================================
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  parent_task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  status public.task_status NOT NULL DEFAULT 'todo',
  priority public.task_priority NOT NULL DEFAULT 'medium',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  assigned_to uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date timestamptz,
  reminder_at timestamptz,
  google_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- TASK FILES
-- =========================================
CREATE TABLE public.task_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size int,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- NOTIFICATIONS
-- =========================================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- USER SETTINGS
-- =========================================
CREATE TABLE public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_time time NOT NULL DEFAULT '18:00',
  push_notifications boolean NOT NULL DEFAULT true,
  email_notifications boolean NOT NULL DEFAULT false,
  default_workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL
);

-- =========================================
-- SECURITY DEFINER HELPERS (avoid RLS recursion)
-- =========================================
CREATE OR REPLACE FUNCTION public.is_workspace_member(_workspace uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace AND user_id = _user
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_role_of(_workspace uuid, _user uuid)
RETURNS public.workspace_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.workspace_members
  WHERE workspace_id = _workspace AND user_id = _user
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.has_workspace_role(_workspace uuid, _user uuid, _roles public.workspace_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace AND user_id = _user AND role = ANY(_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_see_category(_workspace uuid, _user uuid, _category uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  visible text[];
  cat_name text;
BEGIN
  SELECT visible_categories INTO visible
  FROM public.workspace_members
  WHERE workspace_id = _workspace AND user_id = _user;

  IF visible IS NULL THEN RETURN false; END IF;
  IF 'all' = ANY(visible) THEN RETURN true; END IF;
  IF _category IS NULL THEN RETURN true; END IF;

  SELECT name INTO cat_name FROM public.categories WHERE id = _category;
  IF cat_name IS NULL THEN RETURN true; END IF;

  RETURN cat_name = ANY(visible);
END;
$$;

-- =========================================
-- TRIGGERS: profile + settings on signup
-- =========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER tasks_touch BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Auto-add workspace owner as member with 'owner' role
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role, visible_categories)
  VALUES (NEW.id, NEW.owner_id, 'owner', ARRAY['all'])
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_workspace_created
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- =========================================
-- ENABLE RLS
-- =========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- =========================================
-- PROFILES POLICIES
-- =========================================
CREATE POLICY "profiles_select_self_or_shared_workspace" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.workspace_members m1
    JOIN public.workspace_members m2 ON m1.workspace_id = m2.workspace_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = profiles.id
  )
);
CREATE POLICY "profiles_update_self" ON public.profiles
FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- =========================================
-- WORKSPACES POLICIES
-- =========================================
CREATE POLICY "workspaces_select_members" ON public.workspaces
FOR SELECT TO authenticated
USING (public.is_workspace_member(id, auth.uid()) OR owner_id = auth.uid());

CREATE POLICY "workspaces_insert_owner" ON public.workspaces
FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_owner_or_admin" ON public.workspaces
FOR UPDATE TO authenticated
USING (public.has_workspace_role(id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]));

CREATE POLICY "workspaces_delete_owner" ON public.workspaces
FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- =========================================
-- WORKSPACE MEMBERS POLICIES
-- =========================================
CREATE POLICY "members_select_same_workspace" ON public.workspace_members
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "members_insert_admin_or_self_join" ON public.workspace_members
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[])
);

CREATE POLICY "members_update_admin" ON public.workspace_members
FOR UPDATE TO authenticated
USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]));

CREATE POLICY "members_delete_admin_or_self" ON public.workspace_members
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[])
);

-- =========================================
-- CATEGORIES POLICIES
-- =========================================
CREATE POLICY "categories_select_members" ON public.categories
FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "categories_modify_admin" ON public.categories
FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]))
WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]));

-- =========================================
-- TASKS POLICIES
-- =========================================
CREATE POLICY "tasks_select_members_visible_categories" ON public.tasks
FOR SELECT TO authenticated
USING (
  public.is_workspace_member(workspace_id, auth.uid())
  AND public.user_can_see_category(workspace_id, auth.uid(), category_id)
);

CREATE POLICY "tasks_insert_editors" ON public.tasks
FOR INSERT TO authenticated
WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.workspace_role[]));

CREATE POLICY "tasks_update_editors" ON public.tasks
FOR UPDATE TO authenticated
USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.workspace_role[]));

CREATE POLICY "tasks_delete_admin_or_creator" ON public.tasks
FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[])
);

-- =========================================
-- TASK FILES POLICIES
-- =========================================
CREATE POLICY "task_files_select_members" ON public.task_files
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_files.task_id AND public.is_workspace_member(t.workspace_id, auth.uid())
));
CREATE POLICY "task_files_insert_editors" ON public.task_files
FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks t
  WHERE t.id = task_files.task_id
    AND public.has_workspace_role(t.workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.workspace_role[])
));
CREATE POLICY "task_files_delete_uploader_or_admin" ON public.task_files
FOR DELETE TO authenticated
USING (
  uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_files.task_id
      AND public.has_workspace_role(t.workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[])
  )
);

-- =========================================
-- NOTIFICATIONS POLICIES
-- =========================================
CREATE POLICY "notifications_select_self" ON public.notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_update_self" ON public.notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_delete_self" ON public.notifications
FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_self" ON public.notifications
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =========================================
-- USER SETTINGS POLICIES
-- =========================================
CREATE POLICY "user_settings_select_self" ON public.user_settings
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_settings_update_self" ON public.user_settings
FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user_settings_insert_self" ON public.user_settings
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- =========================================
-- INDEXES
-- =========================================
CREATE INDEX idx_tasks_workspace ON public.tasks(workspace_id);
CREATE INDEX idx_tasks_parent ON public.tasks(parent_task_id);
CREATE INDEX idx_tasks_due ON public.tasks(due_date);
CREATE INDEX idx_members_user ON public.workspace_members(user_id);
CREATE INDEX idx_categories_workspace ON public.categories(workspace_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id, read);
