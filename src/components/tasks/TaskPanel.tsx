import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, type Task } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, MapPin, UserPlus2 } from "lucide-react";
import { toast } from "sonner";

export const TaskPanel = () => {
  const { taskPanelOpenId, openTaskPanel } = useAppStore();
  const { tasks, categories, refetch } = useTasks();
  const { user } = useAuth();
  const task = tasks.find((t) => t.id === taskPanelOpenId);
  const subtasks = tasks.filter((t) => t.parent_task_id === taskPanelOpenId);
  const [draft, setDraft] = useState<Task | null>(null);
  const [newSub, setNewSub] = useState("");

  useEffect(() => { setDraft(task ?? null); }, [task?.id]); // eslint-disable-line

  if (!draft) return (
    <Sheet open={!!taskPanelOpenId} onOpenChange={(o) => !o && openTaskPanel(null)}>
      <SheetContent className="bg-card border-white/5" />
    </Sheet>
  );

  const update = async (patch: Partial<Task>) => {
    setDraft({ ...draft, ...patch });
    const { error } = await supabase.from("tasks").update(patch).eq("id", draft.id);
    if (error) toast.error(error.message);
  };

  const addSubtask = async () => {
    if (!newSub.trim() || !user) return;
    const { error } = await supabase.from("tasks").insert({
      workspace_id: draft.workspace_id,
      parent_task_id: draft.id,
      title: newSub.trim(),
      category_id: draft.category_id,
      created_by: user.id,
      assigned_to: [user.id],
    });
    if (error) { toast.error(error.message); return; }
    setNewSub("");
    refetch();
  };

  const assignSelf = async () => {
    if (!user) return;
    await update({ assigned_to: [...(draft.assigned_to ?? []), user.id] });
  };

  const remove = async () => {
    if (!confirm("Delete this task?")) return;
    await supabase.from("tasks").delete().eq("id", draft.id);
    openTaskPanel(null);
    refetch();
  };

  const cat = categories.find((c) => c.id === draft.category_id);

  return (
    <Sheet open={!!taskPanelOpenId} onOpenChange={(o) => !o && openTaskPanel(null)}>
      <SheetContent className="w-full sm:max-w-lg bg-card border-l border-white/5 overflow-y-auto scrollbar-thin">
        <SheetHeader>
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <Input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            onBlur={(e) => update({ title: e.target.value })}
            className="border-0 bg-transparent text-xl font-semibold px-0 focus-visible:ring-0"
          />
        </SheetHeader>

        <div className="mt-4 space-y-5">
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              onBlur={(e) => update({ description: e.target.value })}
              rows={3}
              className="bg-secondary/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={draft.status} onValueChange={(v) => update({ status: v as Task["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in_progress">In progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={draft.priority} onValueChange={(v) => update({ priority: v as Task["priority"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={draft.category_id ?? ""} onValueChange={(v) => update({ category_id: v || null })}>
                <SelectTrigger>
                  <SelectValue placeholder="None">
                    {cat && (
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />{cat.name}
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due date</Label>
              <Input
                type="datetime-local"
                value={draft.due_date ? new Date(draft.due_date).toISOString().slice(0, 16) : ""}
                onChange={(e) => update({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Location</Label>
            <Input
              value={draft.location ?? ""}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              onBlur={(e) => update({ location: e.target.value })}
              placeholder="Optional"
            />
          </div>

          {(!draft.assigned_to || draft.assigned_to.length === 0) && (
            <Button onClick={assignSelf} variant="outline" className="w-full gap-1.5">
              <UserPlus2 className="h-4 w-4" /> Assign to me
            </Button>
          )}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Sub-tasks {subtasks.length > 0 && `(${subtasks.filter((s) => s.status === "done").length}/${subtasks.length})`}
              </Label>
            </div>
            <div className="space-y-1.5">
              {subtasks.map((s) => (
                <div key={s.id} className="flex items-center gap-2 rounded-md bg-secondary/40 px-2 py-1.5">
                  <Checkbox
                    checked={s.status === "done"}
                    onCheckedChange={(c) => supabase.from("tasks").update({ status: c ? "done" : "todo" }).eq("id", s.id)}
                  />
                  <span className={`text-sm ${s.status === "done" ? "line-through text-muted-foreground" : ""}`}>{s.title}</span>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newSub}
                  onChange={(e) => setNewSub(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSubtask()}
                  placeholder="Add sub-task"
                  className="h-8"
                />
                <Button size="sm" variant="ghost" onClick={addSubtask}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={remove}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete task
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
