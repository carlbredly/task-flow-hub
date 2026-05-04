import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Onboarding = () => {
  const { user } = useAuth();
  const { workspaces, loading, setCurrentWorkspace } = useWorkspaces();
  const [name, setName] = useState("My workspace");
  const [creating, setCreating] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && workspaces.length > 0) nav("/", { replace: true });
  }, [loading, workspaces, nav]);

  const create = async () => {
    if (!user) return;
    setCreating(true);
    const { data, error } = await supabase.from("workspaces").insert({ name: name.trim() || "My workspace", owner_id: user.id }).select().single();
    if (error) { toast.error(error.message); setCreating(false); return; }
    // seed default categories
    await supabase.from("categories").insert([
      { workspace_id: data.id, name: "Work", color: "#6366F1", icon: "Briefcase" },
      { workspace_id: data.id, name: "Personal", color: "#10B981", icon: "User" },
      { workspace_id: data.id, name: "Sport", color: "#F59E0B", icon: "Dumbbell" },
    ]);
    setCurrentWorkspace(data);
    nav("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="surface-card w-full max-w-md border-white/5 p-6">
        <h1 className="text-xl font-semibold">Welcome to Track'm</h1>
        <p className="mt-1 text-sm text-muted-foreground">Create your first workspace to get started.</p>
        <div className="mt-6 space-y-3">
          <Label htmlFor="ws">Workspace name</Label>
          <Input id="ws" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Team" />
          <Button disabled={creating} onClick={create} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            {creating ? "Creating…" : "Create workspace"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Onboarding;
