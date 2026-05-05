import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
          <h1 className="text-lg font-semibold text-foreground">Une erreur a bloqué l’affichage</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            Ouvre la console du navigateur (F12) pour le détail. Cause fréquente après un{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">git pull</code> : dépendances
            manquantes — exécute <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">npm install</code> puis
            redémarre <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">npm run dev</code>.
          </p>
          <pre className="max-h-40 max-w-full overflow-auto rounded-lg border border-border bg-muted p-3 text-left text-xs text-destructive">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Recharger la page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
