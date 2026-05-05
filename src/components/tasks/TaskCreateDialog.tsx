import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/stores/useAppStore";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Save } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().min(1, "Title required").max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  category_id: z.string().optional(),
  due_date: z.string().optional(),
});

interface Template {
  id: string;
  workspace_id: string;
  name: string;
  title: string;
  description: string | null;
  priority: string;
  category_id: string | null;
  tags: string[];
  subtasks: string[];
}

export const TaskCreateDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { currentWorkspace } = useAppStore();
  const { user } = useAuth();
  const { categories, refetch } = useTasks();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [categoryId, setCategoryId] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateName, setTemplateName] = useState("");

  useEffect(() => {
    if (open && currentWorkspace) {
      loadTemplates();
    }
  }, [open, currentWorkspace]);

  const loadTemplates = async () => {
    if (!currentWorkspace) return;
    const { data } = await supabase.from("task_templates").select("*").eq("workspace_id", currentWorkspace.id).order("name");
    setTemplates((data as Template[]) ?? []);
  };

  const applyTemplate = (id: string) => {
    const t = templates.find((tmpl) => tmpl.id === id);
    if (!t) return;
    setTitle(t.title);
    setDescription(t.description ?? "");
    setPriority(t.priority as typeof priority);
    setCategoryId(t.category_id ?? "");
    setSelectedTemplate(id);
  };

  const saveTemplate = async () => {
    if (!currentWorkspace || !templateName.trim() || !title.trim()) {
      toast.error("Donnez un nom au template et un titre à la tâche");
      return;
    }
    const { error } = await supabase.from("task_templates").insert({
      workspace_id: currentWorkspace.id,
      name: templateName.trim(),
      title: title.trim(),
      description: description || null,
      priority,
      category_id: categoryId || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Template sauvegardé");
    setTemplateName("");
    loadTemplates();
  };

  const reset = () => { setTitle(""); setDescription(""); setPriority("medium"); setCategoryId(""); setDueDate(""); setSelectedTemplate(""); setTemplateName(""); };

  const handleSubmit = async () => {
    if (!currentWorkspace || !user) return;
    const parsed = schema.safeParse({ title, description, priority, category_id: categoryId || undefined, due_date: dueDate || undefined });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      workspace_id: currentWorkspace.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      category_id: parsed.data.category_id || null,
      due_date: parsed.data.due_date ? new Date(parsed.data.due_date).toISOString() : null,
      created_by: user.id,
      assigned_to: [user.id],
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tâche créée");
    refetch();
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle tâche</DialogTitle>
        </DialogHeader>

        {/* Template picker */}
        {templates.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedTemplate} onValueChange={applyTemplate}>
              <SelectTrigger className="flex-1 text-sm">
                <SelectValue placeholder="Charger un template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <Label htmlFor="t-title">Titre</Label>
            <Input id="t-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Qu'y a-t-il à faire ?" />
          </div>
          <div>
            <Label htmlFor="t-desc">Description</Label>
            <Textarea id="t-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priorité</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Basse</SelectItem>
                  <SelectItem value="medium">Moyenne</SelectItem>
                  <SelectItem value="high">Élevée</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
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
          </div>
          <div>
            <Label htmlFor="t-due">Échéance</Label>
            <Input id="t-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        {/* Save as template */}
        <div className="flex items-center gap-2 border-t border-border pt-3">
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Nom du template..."
            className="h-8 text-xs"
          />
          <Button variant="outline" size="sm" className="shrink-0 gap-1 text-xs" onClick={saveTemplate}>
            <Save className="h-3 w-3" /> Sauvegarder
          </Button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving ? "Création..." : "Créer la tâche"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
