-- Ordre d'affichage des tâches pour drag-and-drop (liste / kanban)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_sort
  ON public.tasks (workspace_id, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_category_sort
  ON public.tasks (workspace_id, category_id, sort_order);
