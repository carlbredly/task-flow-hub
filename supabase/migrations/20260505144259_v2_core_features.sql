-- =========================================
-- V2: Comments, Activity Log, Tags, Custom Statuses
-- =========================================

-- COMMENTS
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_task ON public.task_comments(task_id, created_at);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select_workspace" ON public.task_comments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_workspace_member(t.workspace_id, auth.uid())));
CREATE POLICY "comments_insert_own" ON public.task_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "comments_update_own" ON public.task_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "comments_delete_own_or_admin" ON public.task_comments FOR DELETE TO authenticated
USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_workspace_role(t.workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[])
));

-- ACTIVITY LOG
CREATE TABLE IF NOT EXISTS public.task_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,           -- 'created','updated','commented','file_uploaded','status_changed'
  detail text,                    -- JSON or human-readable diff
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_task ON public.task_activity(task_id, created_at);

ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_select_workspace" ON public.task_activity FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_workspace_member(t.workspace_id, auth.uid())));
CREATE POLICY "activity_insert_authenticated" ON public.task_activity FOR INSERT TO authenticated WITH CHECK (true);

-- TAGS
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366F1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS public.task_tags (
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, tag_id)
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select_workspace" ON public.tags FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "tags_modify_admin" ON public.tags FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]))
WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]));

CREATE POLICY "task_tags_select_workspace" ON public.task_tags FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.is_workspace_member(t.workspace_id, auth.uid())));
CREATE POLICY "task_tags_modify_editors" ON public.task_tags FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_workspace_role(t.workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.workspace_role[])))
WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.has_workspace_role(t.workspace_id, auth.uid(), ARRAY['owner','admin','editor']::public.workspace_role[])));

-- CUSTOM WORKFLOW STATUSES
CREATE TABLE IF NOT EXISTS public.workspace_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366F1',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, name)
);

ALTER TABLE public.workspace_statuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "statuses_select_workspace" ON public.workspace_statuses FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "statuses_modify_admin" ON public.workspace_statuses FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]))
WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]));

-- Seed default statuses for existing workspaces
INSERT INTO public.workspace_statuses (workspace_id, name, color, position)
SELECT id, 'À faire', '#6366F1', 0 FROM public.workspaces
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_statuses ws WHERE ws.workspace_id = workspaces.id)
UNION ALL
SELECT id, 'En cours', '#F59E0B', 1 FROM public.workspaces
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_statuses ws WHERE ws.workspace_id = workspaces.id)
UNION ALL
SELECT id, 'En retard', '#EF4444', 2 FROM public.workspaces
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_statuses ws WHERE ws.workspace_id = workspaces.id)
UNION ALL
SELECT id, 'Terminé', '#10B981', 3 FROM public.workspaces
WHERE NOT EXISTS (SELECT 1 FROM public.workspace_statuses ws WHERE ws.workspace_id = workspaces.id);

-- Add description to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS description text;

COMMENT ON TABLE public.task_comments IS 'Comments on tasks';
COMMENT ON TABLE public.task_activity IS 'Activity/audit log for tasks';
COMMENT ON TABLE public.tags IS 'Custom tags per workspace';
COMMENT ON TABLE public.task_tags IS 'Many-to-many task-tag relation';
COMMENT ON TABLE public.workspace_statuses IS 'Custom workflow statuses per workspace';
