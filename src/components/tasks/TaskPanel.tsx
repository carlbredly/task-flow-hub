import { useEffect, useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/stores/useAppStore";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, type Task } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useAi } from "@/hooks/useAi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Trash2, Plus, MapPin, UserPlus2, Paperclip, X, MessageSquare,
  Send, Clock, Tag, FileText, History, UserMinus2, Sparkles, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profile?: { display_name: string | null; email: string | null; avatar_url: string | null } | null;
}

interface TaskFile {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string;
  uploaded_at: string;
}

interface Activity {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  detail: string | null;
  created_at: string;
}

interface Tag {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
}

interface WorkspaceStatus {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  position: number;
}

const priorityBadge: Record<string, { label: string; className: string; dot: string }> = {
  low: { label: "Basse", className: "border border-muted-foreground/20 bg-muted/60 text-muted-foreground", dot: "bg-muted-foreground/50" },
  medium: { label: "Moyenne", className: "border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
  high: { label: "Élevée", className: "border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
  urgent: { label: "Urgent", className: "border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400", dot: "bg-red-500" },
};

const activityLabel: Record<string, string> = {
  created: "a créé la tâche",
  updated: "a modifié",
  commented: "a commenté",
  file_uploaded: "a ajouté un fichier",
  status_changed: "a changé le statut",
};

export const TaskPanel = () => {
  const { taskPanelOpenId, openTaskPanel, currentWorkspace } = useAppStore();
  const { tasks, categories, refetch } = useTasks();
  const { user } = useAuth();
  const { members } = useWorkspaceMembers();
  const task = tasks.find((t) => t.id === taskPanelOpenId);
  const subtasks = tasks.filter((t) => t.parent_task_id === taskPanelOpenId);
  const [draft, setDraft] = useState<Task | null>(null);
  const [newSub, setNewSub] = useState("");

  const myRole = members.find((m) => m.user_id === user?.id)?.role;
  const canAssignOthers = myRole === "owner" || myRole === "admin";
  const memberFor = (uid: string) => members.find((m) => m.user_id === uid);
  const displayName = (uid: string) => {
    const m = memberFor(uid);
    return m?.profile?.display_name ?? m?.profile?.email ?? uid.slice(0, 8);
  };

  // Comments
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  // Files
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tags
  const [tags, setTags] = useState<Tag[]>([]);
  const [taskTags, setTaskTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  // Activity
  const [activity, setActivity] = useState<Activity[]>([]);

  // Custom statuses
  const [statuses, setStatuses] = useState<WorkspaceStatus[]>([]);

  // AI
  const ai = useAi();
  const [aiChatMsg, setAiChatMsg] = useState("");
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);

  useEffect(() => { setDraft(task ?? null); }, [task?.id]);

  // Load comments, files, tags, activity when task changes
  useEffect(() => {
    if (!draft?.id) return;
    loadComments();
    loadFiles();
    loadTags();
    loadActivity();
    loadStatuses();
  }, [draft?.id]);

  const loadComments = async () => {
    if (!draft) return;
    const { data } = await supabase
      .from("task_comments")
      .select("*, profile:profiles(display_name, email, avatar_url)")
      .eq("task_id", draft.id)
      .order("created_at", { ascending: true });
    setComments((data as Comment[]) ?? []);
  };

  const loadFiles = async () => {
    if (!draft) return;
    const { data } = await supabase
      .from("task_files")
      .select("*")
      .eq("task_id", draft.id)
      .order("uploaded_at", { ascending: false });
    setFiles((data as TaskFile[]) ?? []);
  };

  const loadTags = async () => {
    if (!draft) return;
    const [{ data: allTags }, { data: linked }] = await Promise.all([
      supabase.from("tags").select("*").eq("workspace_id", draft.workspace_id),
      supabase.from("task_tags").select("tag_id").eq("task_id", draft.id),
    ]);
    setTags((allTags as Tag[]) ?? []);
    const linkedIds = (linked as { tag_id: string }[] | null)?.map((r) => r.tag_id) ?? [];
    setTaskTags((allTags as Tag[] | null)?.filter((t) => linkedIds.includes(t.id)) ?? []);
  };

  const loadActivity = async () => {
    if (!draft) return;
    const { data } = await supabase
      .from("task_activity")
      .select("*")
      .eq("task_id", draft.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setActivity((data as Activity[]) ?? []);
  };

  const loadStatuses = async () => {
    if (!draft || !currentWorkspace) return;
    const { data } = await supabase
      .from("workspace_statuses")
      .select("*")
      .eq("workspace_id", currentWorkspace.id)
      .order("position", { ascending: true });
    setStatuses((data as WorkspaceStatus[]) ?? []);
  };

  const logActivity = async (action: string, detail?: string) => {
    if (!draft || !user) return;
    await supabase.from("task_activity").insert({
      task_id: draft.id,
      user_id: user.id,
      action,
      detail: detail ?? null,
    });
  };

  if (!draft) return (
    <Sheet open={!!taskPanelOpenId} onOpenChange={(o) => !o && openTaskPanel(null)}>
      <SheetContent className="border-border bg-card" />
    </Sheet>
  );

  const update = async (patch: Partial<Task>) => {
    setDraft({ ...draft, ...patch });
    const { error } = await supabase.from("tasks").update(patch).eq("id", draft.id);
    if (error) { toast.error(error.message); return; }
    if (patch.status && patch.status !== task?.status) {
      await logActivity("status_changed", patch.status);
    }
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
    await logActivity("updated", "sous-tâche ajoutée");
  };

  const assignSelf = async () => {
    if (!user) return;
    await update({ assigned_to: [...(draft.assigned_to ?? []), user.id] });
  };

  const removeAssignee = async (uid: string) => {
    await update({ assigned_to: (draft.assigned_to ?? []).filter((id) => id !== uid) });
  };

  const addAssignee = async (uid: string) => {
    if (!draft || (draft.assigned_to ?? []).includes(uid)) return;
    const newList = [...(draft.assigned_to ?? []), uid];
    await update({ assigned_to: newList });
    const { error: notifErr } = await (supabase.rpc as any)("insert_notification", {
      p_user_id: uid,
      p_title: "Vous avez été assigné à une tâche",
      p_message: draft.title,
      p_type: "assignation",
      p_task_id: draft.id,
    });
    if (notifErr) console.error("Notification insert failed:", notifErr);
  };

  const unassignedMembers = members.filter((m) => !(draft.assigned_to ?? []).includes(m.user_id));

  const remove = async () => {
    if (!confirm("Supprimer cette tâche ?")) return;
    await supabase.from("tasks").delete().eq("id", draft.id);
    openTaskPanel(null);
    refetch();
  };

  // Comments handlers
  const addComment = async () => {
    if (!newComment.trim() || !user || !draft || sendingComment) return;
    setSendingComment(true);
    const { error } = await supabase.from("task_comments").insert({
      task_id: draft.id,
      user_id: user.id,
      content: newComment.trim(),
    });
    setSendingComment(false);
    if (error) { toast.error(error.message); return; }
    setNewComment("");
    loadComments();
    await logActivity("commented");
  };

  // File handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !draft || !user) return;
    setUploading(true);
    const path = `${draft.workspace_id}/${draft.id}/${Date.now()}-${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("task-attachments").upload(path, file);
    if (uploadErr) { toast.error(uploadErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("task-attachments").getPublicUrl(path);
    const { error: insertErr } = await supabase.from("task_files").insert({
      task_id: draft.id,
      file_url: urlData.publicUrl,
      file_name: file.name,
      file_size: file.size,
      uploaded_by: user.id,
    });
    setUploading(false);
    if (insertErr) { toast.error(insertErr.message); return; }
    loadFiles();
    await logActivity("file_uploaded", file.name);
  };

  const deleteFile = async (fileId: string) => {
    await supabase.from("task_files").delete().eq("id", fileId);
    loadFiles();
    toast.success("Fichier supprimé");
  };

  // Tags handlers
  const toggleTag = async (tag: Tag) => {
    if (!draft || !user) return;
    const has = taskTags.some((t) => t.id === tag.id);
    if (has) {
      await supabase.from("task_tags").delete().eq("task_id", draft.id).eq("tag_id", tag.id);
      setTaskTags(taskTags.filter((t) => t.id !== tag.id));
    } else {
      await supabase.from("task_tags").insert({ task_id: draft.id, tag_id: tag.id });
      setTaskTags([...taskTags, tag]);
    }
    await logActivity("updated", `tag ${has ? "retiré" : "ajouté"}: ${tag.name}`);
  };

  const addTag = async () => {
    if (!newTagName.trim() || !draft || !currentWorkspace || addingTag) return;
    setAddingTag(true);
    const { data, error } = await supabase
      .from("tags")
      .insert({ workspace_id: currentWorkspace.id, name: newTagName.trim(), color: "#6366F1" })
      .select()
      .single();
    setAddingTag(false);
    if (error) { toast.error(error.message); return; }
    if (data) {
      setTags([...tags, data as Tag]);
      setNewTagName("");
    }
  };

  const cat = categories.find((c) => c.id === draft.category_id);

  const statusOptions = statuses.length > 0
    ? statuses.map((s) => ({ value: s.name.toLowerCase().replace(/\s+/g, "_"), label: s.name, color: s.color }))
    : [
        { value: "todo", label: "À faire", color: "#6366F1" },
        { value: "in_progress", label: "En cours", color: "#F59E0B" },
        { value: "delayed", label: "En retard", color: "#EF4444" },
        { value: "done", label: "Terminé", color: "#10B981" },
      ];

  return (
    <Sheet open={!!taskPanelOpenId} onOpenChange={(o) => !o && openTaskPanel(null)}>
      <SheetContent className="flex w-full flex-col overflow-hidden border-l border-border bg-card sm:max-w-lg">
        <SheetHeader className="shrink-0">
          <SheetTitle className="sr-only">Task details</SheetTitle>
          <div className="flex items-start gap-2">
            <Input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onBlur={(e) => update({ title: e.target.value })}
              className="border-0 bg-transparent text-xl font-semibold px-0 focus-visible:ring-0"
            />
            <Button type="button" size="icon" variant="ghost" className="mt-1 h-7 w-7 shrink-0 rounded-lg"
              disabled={ai.loading || !draft.title}
              onClick={async () => {
                const r = await ai.reformulateTitle(draft.title);
                if (r) setDraft({ ...draft, title: r });
              }}
              title="Améliorer le titre"
            >
              <Sparkles className="h-3.5 w-3.5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 space-y-5 overflow-y-auto px-1 scrollbar-thin">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {taskTags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t)}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium hover:bg-destructive/10 hover:text-destructive"
                style={{ borderColor: t.color + "40", backgroundColor: t.color + "15", color: t.color }}
              >
                {t.name}
                <X className="h-3 w-3 opacity-60" />
              </button>
            ))}
            <div className="flex items-center gap-1">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                placeholder="+ Tag"
                className="h-6 w-20 rounded-full border-border bg-muted/50 px-2 text-[11px]"
              />
              {tags.filter((t) => !taskTags.some((tt) => tt.id === t.id)).length > 0 && (
                <Select onValueChange={(v) => { const t = tags.find((tag) => tag.id === v); if (t) toggleTag(t); }}>
                  <SelectTrigger className="h-6 w-6 rounded-full border-border bg-muted/50 p-0 text-[11px]">
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tags.filter((t) => !taskTags.some((tt) => tt.id === t.id)).map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 rounded-lg"
                disabled={ai.loading || !draft.title}
                onClick={async () => {
                  const r = await ai.generateDescription(draft.title, draft.description);
                  if (r) update({ description: r });
                }}
                title="Générer la description"
              >
                <Sparkles className="h-3 w-3" />
              </Button>
            </div>
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
              <Label className="text-xs text-muted-foreground">Statut</Label>
              <Select value={draft.status} onValueChange={(v) => update({ status: v as Task["status"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Priorité</Label>
              <span className={cn("mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium", priorityBadge[draft.priority].className)}>
                <span className={cn("h-1.5 w-1.5 rounded-full", priorityBadge[draft.priority].dot)} />
                {priorityBadge[draft.priority].label}
              </span>
              <Select value={draft.priority} onValueChange={(v) => update({ priority: v as Task["priority"] })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Catégorie</Label>
              <Select value={draft.category_id ?? ""} onValueChange={(v) => update({ category_id: v || null })}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucune">
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
              <Label className="text-xs text-muted-foreground">Échéance</Label>
              <Input
                type="datetime-local"
                value={draft.due_date ? new Date(draft.due_date).toISOString().slice(0, 16) : ""}
                onChange={(e) => update({ due_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3 w-3" /> Lieu</Label>
            <Input
              value={draft.location ?? ""}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
              onBlur={(e) => update({ location: e.target.value })}
              placeholder="Optionnel"
            />
          </div>

          <div>
            <Label className="mb-2 block text-xs text-muted-foreground">Assigné(s)</Label>
            {(draft.assigned_to ?? []).length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {(draft.assigned_to ?? []).map((uid) => {
                  const m = memberFor(uid);
                  const name = displayName(uid);
                  return (
                    <span key={uid} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-1 text-xs">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m?.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary/10 text-[8px] text-primary">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="max-w-[120px] truncate">{name}</span>
                      {canAssignOthers && uid !== user?.id && (
                        <button type="button" onClick={() => removeAssignee(uid)} className="ml-0.5 text-muted-foreground hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            )}

            {canAssignOthers ? (
              <div className="flex gap-2">
                <Select onValueChange={(uid) => addAssignee(uid)} value="">
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Ajouter un membre…" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedMembers.length === 0 ? (
                      <SelectItem value="_none" disabled>Tous les membres sont assignés</SelectItem>
                    ) : (
                      unassignedMembers.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          <span className="inline-flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={m.profile?.avatar_url ?? undefined} />
                              <AvatarFallback className="bg-primary/10 text-[8px] text-primary">
                                {(m.profile?.display_name ?? m.profile?.email ?? m.user_id).slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {m.profile?.display_name ?? m.profile?.email ?? m.user_id.slice(0, 8)}
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {user && !(draft.assigned_to ?? []).includes(user.id) && (
                  <Button size="sm" variant="outline" onClick={assignSelf} className="shrink-0 gap-1.5" title="M'assigner">
                    <UserPlus2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              !(draft.assigned_to ?? []).includes(user?.id ?? "") && (
                <Button onClick={assignSelf} variant="outline" className="w-full gap-1.5" size="sm">
                  <UserPlus2 className="h-4 w-4" /> M'assigner
                </Button>
              )
            )}
          </div>

          {/* Sub-tasks */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                Sous-tâches {subtasks.length > 0 && `(${subtasks.filter((s) => s.status === "done").length}/${subtasks.length})`}
              </Label>
              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 rounded-lg"
                disabled={ai.loading || !draft.title}
                onClick={async () => {
                  const r = await ai.generateSubtasks(draft.title, draft.description);
                  if (r) {
                    for (const sub of r) {
                      await supabase.from("tasks").insert({
                        workspace_id: draft.workspace_id,
                        parent_task_id: draft.id,
                        title: sub,
                        created_by: user?.id,
                      });
                    }
                    refetch();
                  }
                }}
                title="Générer des sous-tâches"
              >
                <Sparkles className="h-3 w-3" />
              </Button>
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
                  placeholder="Ajouter une sous-tâche"
                  className="h-8"
                />
                <Button size="sm" variant="ghost" onClick={addSubtask}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground flex items-center gap-1.5">
              <Paperclip className="h-3 w-3" /> Fichiers {files.length > 0 && `(${files.length})`}
            </Label>
            <div className="space-y-1.5">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-2 rounded-md bg-secondary/40 px-2 py-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={f.file_url} target="_blank" rel="noopener" className="min-w-0 flex-1 truncate text-sm hover:underline">
                    {f.file_name}
                  </a>
                  <button type="button" onClick={() => deleteFile(f.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="w-full gap-1.5"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-3.5 w-3.5" />
                {uploading ? "Envoi..." : "Ajouter un fichier"}
              </Button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
          </div>

          {/* Activity log */}
          {activity.length > 0 && (
            <div>
              <Label className="mb-2 block text-xs text-muted-foreground flex items-center gap-1.5">
                <History className="h-3 w-3" /> Activité récente
              </Label>
              <div className="space-y-2">
                {activity.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs">
                    <Clock className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <span className="text-muted-foreground">{activityLabel[a.action] ?? a.action}</span>
                      {a.detail && <span className="text-muted-foreground"> — {a.detail}</span>}
                      <span className="ml-1 text-[10px] text-muted-foreground/70">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3 w-3" /> Commentaires {comments.length > 0 && `(${comments.length})`}
            </Label>
            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                      {(c.profile?.display_name ?? c.profile?.email ?? "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium">{c.profile?.display_name ?? c.profile?.email ?? "Utilisateur"}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-foreground">{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addComment(); } }}
                  placeholder="Écrire un commentaire..."
                  rows={2}
                  className="min-h-0 resize-none bg-secondary/50 text-sm"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="shrink-0 self-end"
                  disabled={!newComment.trim() || sendingComment}
                  onClick={addComment}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* AI Chat */}
          <div>
            <Label className="mb-2 block text-xs text-muted-foreground flex items-center gap-1.5">
              <Bot className="h-3 w-3" /> Assistant IA
            </Label>
            {aiAnswer && (
              <div className="mb-2 rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-sm text-foreground">
                {aiAnswer}
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={aiChatMsg}
                onChange={(e) => setAiChatMsg(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter" && !e.shiftKey && aiChatMsg.trim() && !ai.loading) {
                    e.preventDefault();
                    setAiAnswer("Réflexion…");
                    const r = await ai.chat(draft.title, aiChatMsg.trim(), draft.description);
                    setAiAnswer(r ?? "Je n'ai pas pu répondre. Vérifie la clé API DeepSeek.");
                    setAiChatMsg("");
                  }
                }}
                placeholder="Demander à l'IA..."
                rows={2}
                className="min-h-0 resize-none bg-secondary/50 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 self-end"
                disabled={!aiChatMsg.trim() || ai.loading}
                onClick={async () => {
                  setAiAnswer("Réflexion…");
                  const r = await ai.chat(draft.title, aiChatMsg.trim(), draft.description);
                  setAiAnswer(r ?? "Je n'ai pas pu répondre. Vérifie la clé API DeepSeek.");
                  setAiChatMsg("");
                }}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" onClick={remove}>
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
