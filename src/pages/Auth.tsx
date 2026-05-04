import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "Min 8 characters").max(72),
});

const Auth = () => {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmail = async () => {
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    const fn = mode === "signup"
      ? supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } })
      : supabase.auth.signInWithPassword({ email, password });
    const { error } = await fn;
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success(mode === "signup" ? "Account created" : "Welcome back");
    nav("/", { replace: true });
  };

  const handleGoogle = async () => {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Google sign-in failed");
    if (result.redirected) return;
    nav("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl glow-primary" style={{ background: "var(--gradient-primary)" }}>
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-semibold tracking-tight">Track'm</span>
        </div>
        <Card className="surface-card border-white/5 p-6">
          <h1 className="text-lg font-semibold">{mode === "signup" ? "Create account" : "Sign in"}</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {mode === "signup" ? "Start organising your work in minutes." : "Welcome back to your workspace."}
          </p>

          <Button onClick={handleGoogle} variant="outline" className="mt-5 w-full gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#fff" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.7 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.78 4.04 14.6 3 12 3 6.99 3 3 7 3 12s3.99 9 9 9c5.2 0 8.65-3.65 8.65-8.79 0-.59-.07-1.04-.3-1.11Z"/></svg>
            Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-white/5" /> or <span className="h-px flex-1 bg-white/5" />
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button disabled={loading} onClick={handleEmail} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </div>

          <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground">
            {mode === "signup" ? "Already have an account? Sign in" : "No account? Sign up"}
          </button>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
