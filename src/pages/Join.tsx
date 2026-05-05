import { useEffect, useState } from "react";
import SEO from "@/components/seo/SEO";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface WorkspacePreview {
  id: string;
  name: string;
}

const Join = () => {
  const { token } = useParams();
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspacePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const loadWorkspace = async () => {
      if (!token) {
        setError("Lien d'invitation invalide.");
        setLoading(false);
        return;
      }
      try {
        const { data, error: err } = await supabase
          .from("workspaces")
          .select("id,name")
          .eq("invite_token", token)
          .maybeSingle();
        if (err) throw err;
        setWorkspace(data);
        if (!data) setError("Ce lien d'invitation est invalide ou a expiré.");
      } catch (e) {
        setError("Impossible de vérifier cette invitation. Réessayez plus tard.");
      } finally {
        setLoading(false);
      }
    };
    loadWorkspace();
  }, [token]);

  const handleJoin = () => {
    if (!user) {
      nav("/auth", { state: { from: `/join/${token}` } });
      return;
    }
    joinWorkspace();
  };

  const joinWorkspace = async () => {
    if (!workspace || !user) return;
    setJoining(true);

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

    const { error: err } = await supabase.from("workspace_members").insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: "viewer",
      visible_categories: ["all"],
    });
    setJoining(false);
    if (err) {
      if (err.code === "23505") {
        nav("/", { replace: true });
        return;
      }
      toast.error(err.message);
      return;
    }
    toast.success("Vous avez rejoint l'espace !");
    nav("/", { replace: true });
  };

  return (
    <>
      <SEO title="Rejoindre un espace" description="Rejoignez un espace de travail Track'm via un lien d'invitation." noindex />
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl glow-primary" style={{ background: "var(--gradient-primary)" }}>
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-semibold tracking-tight">Track'm</span>
          </div>
          <Card className="w-full border-white/5 p-6">
            {loading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Vérification de l'invitation…</p>
              </div>
            ) : error || !workspace ? (
              <>
                <h1 className="text-lg font-semibold">Lien invalide</h1>
                <p className="mt-2 text-sm text-muted-foreground">{error ?? "Ce lien d'invitation est invalide ou a expiré."}</p>
                <Button asChild className="mt-6 w-full rounded-xl" variant="outline">
                  <Link to="/auth">Retour à l'accueil</Link>
                </Button>
              </>
            ) : (
              <>
                <h1 className="text-lg font-semibold">Rejoindre {workspace.name}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Vous êtes invité à rejoindre cet espace de travail en tant que membre.
                </p>
                <Button className="mt-6 w-full rounded-xl" disabled={joining || authLoading} onClick={handleJoin}>
                  {joining ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inscription…</>
                  ) : !user ? (
                    "Se connecter pour rejoindre"
                  ) : (
                    "Rejoindre l'espace"
                  )}
                </Button>
                {!user && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    Vous serez redirigé vers la page de connexion.
                  </p>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default Join;
