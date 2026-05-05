import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useWorkspaces } from "@/hooks/useWorkspaces";

export const WorkspaceGate = ({ children }: { children: ReactNode }) => {
  const { workspaces, loading } = useWorkspaces();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-primary/30" />
      </div>
    );
  }

  if (workspaces.length === 0) return <Navigate to="/onboarding" replace />;

  return <>{children}</>;
};
