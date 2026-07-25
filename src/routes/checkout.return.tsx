import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/checkout/return")({
  head: () => ({
    meta: [
      { title: "Welcome to Premium — Ethereal Bodylabs" },
      { name: "description", content: "Your 30-day free trial of Ethereal Bodylabs Premium has started." },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" ? search.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary mb-4">
          <CheckCircle2 className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">You're in.</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Your 30-day free trial of Premium has started. You won't be charged until day 30 — cancel anytime from Settings.
        </p>
        <Link to="/app" className="inline-flex h-11 items-center px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          Enter the app
        </Link>
        {session_id && <div className="mt-6 text-[10px] font-mono text-muted-foreground/60">ref: {session_id.slice(0, 24)}…</div>}
      </div>
    </div>
  );
}
