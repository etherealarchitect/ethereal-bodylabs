import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ReactNode } from "react";

const ADMIN_EMAIL = "scottkbrown1337@gmail.com";

export function isAdminEmail(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

/**
 * Client-side gate for admin-only surfaces (docs, design system).
 * SSR renders a neutral placeholder; on the client we check the session
 * and either render children (admin) or a lock screen (everyone else).
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
        Checking access…
      </div>
    );
  }

  if (!isAdminEmail(user?.email)) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Lock className="size-5" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Admin only
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to the platform administrator.
          </p>
          <div className="mt-6 flex items-center justify-center gap-2">
            <Link
              to="/"
              className="h-10 px-4 rounded-lg border border-border/60 bg-surface-2 text-sm inline-flex items-center"
            >
              Home
            </Link>
            <Link
              to="/app"
              className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center"
            >
              Open app
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
