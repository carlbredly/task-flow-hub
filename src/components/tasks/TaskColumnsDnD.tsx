import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TaskCard } from "@/components/tasks/TaskCard";
import type { Category, Task } from "@/hooks/useTasks";
import type { WorkspaceMemberWithProfile } from "@/hooks/useWorkspaceMembers";
import { cn } from "@/lib/utils";

export interface TaskGroup {
  key: string;
  label: string;
  color?: string;
  items: Task[];
}

interface Props {
  groups: TaskGroup[];
  groupBy: "category" | "status";
  categories: Category[];
  tasks: Task[];
  refetch: () => Promise<void>;
  subtaskStats: (parentId: string) => { done: number; total: number };
  layout?: "list" | "kanban";
  members?: WorkspaceMemberWithProfile[];
}

function findContainerForTask(taskId: string, groups: TaskGroup[]): string | null {
  for (const g of groups) {
    if (g.items.some((t) => t.id === taskId)) return String(g.key);
  }
  return null;
}

function columnTitleTone(groupBy: "category" | "status", key: string): string {
  if (groupBy !== "status") return "text-foreground";
  const map: Record<string, string> = {
    todo: "text-foreground",
    in_progress: "text-[hsl(217_91%_48%)]",
    delayed: "text-[hsl(330_70%_48%)]",
    done: "text-[hsl(145_55%_30%)]",
  };
  return map[key] ?? "text-foreground";
}

function EmptyDropRow({ groupKey }: { groupKey: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: `empty::${groupKey}` });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-10 rounded-xl border border-dashed border-transparent transition-colors",
        isOver && "border-primary/40 bg-primary/5",
      )}
    />
  );
}

function SortableTaskRow({
  task,
  groupKey,
  category,
  subtaskStats,
  cardVariant,
  members,
}: {
  task: Task;
  groupKey: string;
  category?: Category;
  subtaskStats?: { done: number; total: number };
  cardVariant: "list" | "board";
  members?: WorkspaceMemberWithProfile[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "task", groupKey },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const handle = (
    <button
      type="button"
      className={cn(
        "touch-none cursor-grab rounded-lg p-1.5 text-muted-foreground hover:bg-muted active:cursor-grabbing",
        cardVariant === "board" && "shrink-0",
      )}
      aria-label="Déplacer la tâche"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4 shrink-0" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "relative z-10 opacity-60")}>
      <TaskCard
        task={task}
        category={category}
        subtaskStats={subtaskStats}
        variant={cardVariant}
        leadingSlot={handle}
        members={members}
      />
    </div>
  );
}

export const TaskColumnsDnD = ({
  groups,
  groupBy,
  categories,
  tasks,
  refetch,
  subtaskStats,
  layout = "list",
  members,
}: Props) => {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const cardVariant = layout === "kanban" ? "board" : "list";

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const t = tasks.find((x) => x.id === id);
    setActiveTask(t ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeContainer = findContainerForTask(activeId, groups);
    if (!activeContainer) return;

    let overContainer: string | undefined;
    if (overId.startsWith("empty::")) {
      overContainer = overId.slice("empty::".length);
    } else if (groups.some((g) => String(g.key) === overId)) {
      overContainer = overId;
    } else {
      overContainer = findContainerForTask(overId, groups) ?? undefined;
    }

    if (!overContainer) return;

    const task = tasks.find((t) => t.id === activeId);
    if (!task || task.parent_task_id) return;

    if (activeContainer === overContainer) {
      const group = groups.find((g) => String(g.key) === activeContainer);
      if (!group) return;
      const ids = group.items.map((t) => t.id);
      const oldIndex = ids.indexOf(activeId);
      let newIndex: number;
      if (overId === `empty::${activeContainer}`) {
        newIndex = Math.max(0, ids.length - 1);
      } else {
        newIndex = ids.indexOf(overId);
      }
      if (oldIndex === -1 || newIndex === -1) return;
      if (oldIndex === newIndex) return;
      const newIds = arrayMove(ids, oldIndex, newIndex);
      setSaving(true);
      try {
        const results = await Promise.all(
          newIds.map((id, idx) => supabase.from("tasks").update({ sort_order: idx }).eq("id", id)),
        );
        const firstErr = results.find((r) => r.error)?.error;
        if (firstErr) throw firstErr;
        toast.success("Ordre enregistré");
        await refetch();
      } catch {
        toast.error("Impossible d'enregistrer l'ordre des tâches");
        await refetch();
      } finally {
        setSaving(false);
      }
      return;
    }

    const sourceGroup = groups.find((g) => String(g.key) === activeContainer);
    const destGroup = groups.find((g) => String(g.key) === overContainer);
    if (!sourceGroup || !destGroup) return;

    const sourceIds = sourceGroup.items.map((t) => t.id).filter((id) => id !== activeId);
    let destIds = destGroup.items.map((t) => t.id);

    if (overId.startsWith("empty::")) {
      destIds = [...destIds, activeId];
    } else {
      const j = destIds.indexOf(overId);
      if (j === -1) destIds = [...destIds, activeId];
      else destIds = [...destIds.slice(0, j), activeId, ...destIds.slice(j)];
    }

    const patch: { status?: Task["status"]; category_id?: string | null } = {};
    if (groupBy === "status") {
      patch.status = overContainer as Task["status"];
    } else {
      patch.category_id = overContainer === "uncategorized" ? null : overContainer;
    }

    setSaving(true);
    try {
      const { error: uErr } = await supabase.from("tasks").update(patch).eq("id", activeId);
      if (uErr) throw uErr;
      const reindex = async (orderedIds: string[]) => {
        const results = await Promise.all(
          orderedIds.map((id, idx) => supabase.from("tasks").update({ sort_order: idx }).eq("id", id)),
        );
        const err = results.find((r) => r.error)?.error;
        if (err) throw err;
      };
      await reindex(sourceIds);
      await reindex(destIds);
      toast.success("Tâche déplacée");
      await refetch();
    } catch {
      toast.error("Échec du déplacement");
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={(e) => void handleDragEnd(e)}
    >
      <div
        className={cn(
          "relative",
          layout === "kanban" && "flex gap-4 overflow-x-auto pb-2 pt-1 scrollbar-thin md:gap-5",
        )}
      >
        {saving && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-background/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-lg">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Enregistrement…
            </div>
          </div>
        )}
        {groups.map((g, i) => (
          <section
            key={g.key}
            className={cn(
              layout === "list" && i > 0 && "mt-10",
              layout === "kanban" &&
                "flex max-h-[min(72vh,calc(100vh-280px))] w-[min(100%,320px)] shrink-0 flex-col rounded-2xl border border-border bg-muted/30 p-3 shadow-sm md:w-[300px]",
            )}
          >
            <h3
              className={cn(
                "mb-2 flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide",
                columnTitleTone(groupBy, String(g.key)),
              )}
            >
              {g.color && <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />}
              <span className="normal-case">{g.label}</span>
              <span className="font-semibold text-muted-foreground">({g.items.length})</span>
            </h3>
            <SortableContext id={String(g.key)} items={g.items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <div
                className={cn(
                  "space-y-2",
                  layout === "kanban" && "min-h-0 flex-1 overflow-y-auto pr-0.5 scrollbar-thin",
                )}
              >
                {g.items.map((t) => (
                  <SortableTaskRow
                    key={t.id}
                    task={t}
                    groupKey={String(g.key)}
                    category={categories.find((c) => c.id === t.category_id)}
                    subtaskStats={subtaskStats(t.id)}
                    cardVariant={cardVariant}
                    members={members}
                  />
                ))}
                <EmptyDropRow groupKey={String(g.key)} />
              </div>
            </SortableContext>
          </section>
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="rounded-2xl border border-primary/25 bg-card p-4 shadow-xl">
            <p className="text-sm font-semibold">{activeTask.title}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
