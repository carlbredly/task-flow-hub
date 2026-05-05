-- Task Templates
CREATE TABLE IF NOT EXISTS public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  title text NOT NULL DEFAULT 'Nouvelle tâche',
  description text,
  priority public.task_priority NOT NULL DEFAULT 'medium',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT ARRAY[]::text[],
  subtasks text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_select_workspace" ON public.task_templates FOR SELECT TO authenticated
USING (public.is_workspace_member(workspace_id, auth.uid()));
CREATE POLICY "templates_modify_admin" ON public.task_templates FOR ALL TO authenticated
USING (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]))
WITH CHECK (public.has_workspace_role(workspace_id, auth.uid(), ARRAY['owner','admin']::public.workspace_role[]));
