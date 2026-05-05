import { useMemo, useState } from "react";
import SEO from "@/components/seo/SEO";
import { useAuth } from "@/contexts/AuthContext";
import { useAppStore } from "@/stores/useAppStore";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useWorkspaceMembers } from "@/hooks/useWorkspaceMembers";
import { useTasks } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { randomUUID } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Eye, EyeOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SettingsPage = () => {
  const { user } = useAuth();
  const { currentWorkspace, openTaskPanel } = useAppStore();
  const { setCurrentWorkspace } = useWorkspaces();
  const { members, updateMemberRole, updateVisibleCategories } = useWorkspaceMembers();
  const { categories, tasks, refetch: refetchTasks } = useTasks();
  const [workspaceName, setWorkspaceName] = useState(currentWorkspace?.name ?? "");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryColor, setNewCategoryColor] = useState("#6366F1");
  const [reminderTime, setReminderTime] = useState("18:00");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [resetTasksOpen, setResetTasksOpen] = useState(false);
  const [resettingTasks, setResettingTasks] = useState(false);

  const myRole = useMemo(() => members.find((m) => m.user_id === user?.id)?.role, [members, user?.id]);
  const canResetAllTasks = myRole === "owner" || myRole === "admin" || currentWorkspace?.owner_id === user?.id;

  const inviteLink = useMemo(() => {
    if (!currentWorkspace) return "";
    return `${window.location.origin}/join/${currentWorkspace.invite_token}`;
  }, [currentWorkspace]);

  const saveProfile = async () => {
    if (!user) return;
    const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User";
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Profile saved");
  };

  const saveWorkspace = async () => {
    if (!currentWorkspace) return;
    const { error } = await supabase.from("workspaces").update({ name: workspaceName }).eq("id", currentWorkspace.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrentWorkspace({ ...currentWorkspace, name: workspaceName });
    toast.success("Workspace updated");
  };

  const regenerateInvite = async () => {
    if (!currentWorkspace) return;
    const { data, error } = await supabase
      .from("workspaces")
      .update({ invite_token: randomUUID() })
      .eq("id", currentWorkspace.id)
      .select("id,name,owner_id,invite_token")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Unable to regenerate invite token");
      return;
    }
    setCurrentWorkspace(data);
    toast.success("Invitation link regenerated");
  };

  const createCategory = async () => {
    if (!currentWorkspace || !newCategoryName.trim()) return;
    const { error } = await supabase.from("categories").insert({
      workspace_id: currentWorkspace.id,
      name: newCategoryName.trim(),
      color: newCategoryColor,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewCategoryName("");
    toast.success("Category created");
  };

  const deleteAllWorkspaceTasks = async () => {
    if (!currentWorkspace || !canResetAllTasks) return;
    setResettingTasks(true);
    try {
      const { error } = await supabase.from("tasks").delete().eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
      openTaskPanel(null);
      await refetchTasks();
      toast.success("Toutes les tâches de l’espace ont été supprimées.");
      setResetTasksOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Suppression impossible";
      toast.error(msg);
    } finally {
      setResettingTasks(false);
    }
  };

  const saveNotificationSettings = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("user_settings")
      .update({
        reminder_time: reminderTime,
        push_notifications: pushNotifications,
        email_notifications: emailNotifications,
      })
      .eq("user_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Notification settings saved");
  };

  return (
    <>
      <SEO title="Paramètres" description="Gérez votre profil, workspace, membres, catégories et notifications Track'm." url="https://taskflowhub.app/settings" />
      <div className="mx-auto max-w-6xl px-3 py-4 animate-fade-in sm:p-6">
      <Tabs defaultValue="profile" className="space-y-4">
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="inline-flex w-max min-w-full gap-1 bg-transparent p-0">
            <TabsTrigger value="profile" className="shrink-0 text-xs sm:text-sm">Profile</TabsTrigger>
            <TabsTrigger value="workspace" className="shrink-0 text-xs sm:text-sm">Workspace</TabsTrigger>
            <TabsTrigger value="members" className="shrink-0 text-xs sm:text-sm">Members</TabsTrigger>
            <TabsTrigger value="categories" className="shrink-0 text-xs sm:text-sm">Categories</TabsTrigger>
            <TabsTrigger value="notifications" className="shrink-0 text-xs sm:text-sm">Notifications</TabsTrigger>
            <TabsTrigger value="integrations" className="shrink-0 text-xs sm:text-sm">Integrations</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile">
          <Card className="space-y-4 border-white/5 p-5">
            <h3 className="text-sm font-semibold">Profile</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div>
                <Label>Display name</Label>
                <Input value={user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? ""} disabled />
              </div>
            </div>
            <Button onClick={saveProfile}>Save profile</Button>
          </Card>
        </TabsContent>

        <TabsContent value="workspace">
          <Card className="space-y-4 border-white/5 p-5">
            <h3 className="text-sm font-semibold">Workspace</h3>
            <div>
              <Label>Workspace name</Label>
              <Input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Invitation link</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input value={inviteLink} readOnly />
                <Button
                  variant="outline"
                  onClick={() => navigator.clipboard.writeText(inviteLink).then(() => toast.success("Invite link copied"))}
                >
                  Copy
                </Button>
                <Button variant="outline" onClick={regenerateInvite}>
                  Regenerate
                </Button>
              </div>
            </div>
            <Button onClick={saveWorkspace}>Save workspace</Button>
            
            {canResetAllTasks && currentWorkspace && (
              <div className="mt-8 space-y-3 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
                <h3 className="text-sm font-semibold text-destructive">Zone danger</h3>
                <p className="text-sm text-muted-foreground">
                  Supprime définitivement toutes les tâches de « {currentWorkspace.name} » ({tasks.length} tâche
                  {tasks.length !== 1 ? "s" : ""}, y compris sous-tâches et pièces jointes liées).
                </p>
                <Button type="button" variant="destructive" className="w-full rounded-xl sm:w-auto" onClick={() => setResetTasksOpen(true)}>
                  Supprimer toutes les tâches
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="members">
          <Card className="space-y-4 border-white/5 p-5">
            <h3 className="text-sm font-semibold">Membres</h3>
            <div className="space-y-3">
              {members.map((member) => {
                const isAll = member.visible_categories.includes("all");
                const catCount = isAll ? categories.length : member.visible_categories.length;
                return (
                  <div key={member.id} className="rounded-lg border border-white/5 p-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-medium">{member.profile?.display_name ?? member.profile?.email ?? member.user_id}</p>
                        <p className="text-xs text-muted-foreground">{member.profile?.email ?? member.user_id}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={member.role} onValueChange={(value) => updateMemberRole(member.id, value as typeof member.role)}>
                          <SelectTrigger className="w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="owner">owner</SelectItem>
                            <SelectItem value="admin">admin</SelectItem>
                            <SelectItem value="editor">editor</SelectItem>
                            <SelectItem value="viewer">viewer</SelectItem>
                          </SelectContent>
                        </Select>

                        <CategoryVisibilityPopover
                          memberId={member.id}
                          categories={categories}
                          visibleCategories={member.visible_categories}
                          onSave={updateVisibleCategories}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && <p className="text-sm text-muted-foreground">Aucun membre pour cet espace.</p>}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="space-y-4 border-white/5 p-5">
            <h3 className="text-sm font-semibold">Categories</h3>
            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[1fr,120px,auto]">
              <Input
                placeholder="Category name"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
              />
              <Input type="color" value={newCategoryColor} onChange={(event) => setNewCategoryColor(event.target.value)} />
              <Button onClick={createCategory} className="w-full sm:w-auto">Add</Button>
            </div>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between rounded-lg border border-white/5 p-3">
                  <span className="inline-flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: category.color }} />
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="space-y-4 border-white/5 p-5">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="space-y-2">
              <Label>Reminder time</Label>
              <Input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/5 p-3">
              <p className="text-sm">Push notifications</p>
              <Switch checked={pushNotifications} onCheckedChange={setPushNotifications} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/5 p-3">
              <p className="text-sm">Email notifications</p>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Button onClick={saveNotificationSettings}>Save notification settings</Button>
          </Card>
        </TabsContent>

        <TabsContent value="integrations">
          <Card className="space-y-4 border-white/5 p-5">
            <h3 className="text-sm font-semibold">Integrations</h3>
            <p className="text-sm text-muted-foreground">
              Google Calendar OAuth and sync endpoint are ready to be wired through Supabase Edge Functions.
            </p>
            <Button variant="outline" onClick={() => toast.info("Connect Google Calendar flow can be linked to Edge Function")}>
              Connect Google Calendar
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={resetTasksOpen} onOpenChange={setResetTasksOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer toutes les tâches ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les tâches de cet espace de travail seront effacées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={resettingTasks}>
              Annuler
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="rounded-xl"
              disabled={resettingTasks}
              onClick={() => void deleteAllWorkspaceTasks()}
            >
              {resettingTasks ? "Suppression…" : "Oui, tout supprimer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
    </>
  );
};

const CategoryVisibilityPopover = ({
  memberId,
  categories,
  visibleCategories,
  onSave,
}: {
  memberId: string;
  categories: { id: string; name: string; color: string }[];
  visibleCategories: string[];
  onSave: (memberId: string, cats: string[]) => Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(visibleCategories);
  const [saving, setSaving] = useState(false);

  const isAll = selected.includes("all");

  const toggleAll = () => {
    setSelected(isAll ? [] : ["all"]);
  };

  const toggleCategory = (name: string) => {
    setSelected((prev) => {
      const next = prev.includes(name) ? prev.filter((c) => c !== name) : [...prev.filter((c) => c !== "all"), name];
      return next.length === 0 ? ["all"] : next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(memberId, selected);
    setSaving(false);
    setOpen(false);
    toast.success("Visibilité des catégories mise à jour");
  };

  const label = isAll ? "Toutes les catégories" : `${selected.length} catégorie${selected.length > 1 ? "s" : ""}`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1.5">
          {isAll ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Catégories visibles</p>
        <div className="space-y-2">
          <label className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 cursor-pointer text-sm">
            <Checkbox checked={isAll} onCheckedChange={toggleAll} />
            <span className={cn(isAll ? "font-medium text-foreground" : "text-muted-foreground")}>
              Toutes les catégories
            </span>
          </label>
          <div className="border-t border-border pt-1.5 space-y-0.5">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={isAll || selected.includes(cat.name)}
                  onCheckedChange={() => toggleCategory(cat.name)}
                  disabled={isAll}
                />
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                  <span className={cn(isAll ? "text-muted-foreground" : "text-foreground")}>{cat.name}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <Button size="sm" className="mt-3 w-full rounded-xl" onClick={handleSave} disabled={saving}>
          {saving ? "Enregistrement…" : "Appliquer"}
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default SettingsPage;
