import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface WorkspacePreview {
  id: string;
  name: string;
}

const Join = () => {
  const { token } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspacePreview | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!token) return;
      const { data } = await supabase.from("workspaces").select("id,name").eq("invite_token", token).maybeSingle();
      setWorkspace(data);
    };
    loadWorkspace();
  }, [token]);

  const joinWorkspace = async () => {
    if (!workspace || !user) {
      nav("/auth");
      return;
    }

    setJoining(true);

    // Check if already a member
    const { data: existing } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspace.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      setJoining(false);
      nav("/", { replace: true });
      return;
    }

    const { error } = await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "viewer",
      visible_categories: ["all"],
    });
    setJoining(false);
    if (error) {
      if (error.code === "23505") {
        nav("/", { replace: true });
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("Workspace joined");
    nav("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md border-white/5 p-6">
        {!workspace ? (
          <>
            <h1 className="text-xl font-semibold">Invitation invalide</h1>
            <p className="mt-2 text-sm text-muted-foreground">Ce lien est invalide ou a expire.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Rejoindre {workspace.name}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Rejoignez cet espace de travail en tant que membre viewer.
            </p>
            <Button className="mt-6 w-full" disabled={joining} onClick={joinWorkspace}>
              {joining ? "Joining..." : "Join workspace"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default Join;
