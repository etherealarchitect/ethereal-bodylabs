import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/app/AppShell";
import { coachChat } from "@/lib/coach.functions";
import { Send, Sparkles } from "lucide-react";

export const Route = createFileRoute("/app/coach")({
  component: CoachPage,
});

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Review my last 7 days.",
  "Suggest a push workout for tomorrow.",
  "Am I hitting enough protein?",
  "Design a 4-week hypertrophy block.",
];

function CoachPage() {
  const { user } = useAuth();
  const chat = useServerFn(coachChat);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || busy || !user) return;
    const next: Message[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setErr(null);
    try {
      const res = await chat({ data: { messages: next } });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch (e: any) {
      setErr(e?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-9rem)]">
      <PageHeader eyebrow="Coach" title="Ethereal Coach" />

      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-border/60 bg-surface-1/70 p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="size-4 text-primary" /> Ask about your training.
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              I have your last week of workouts, meals, and measurements in context.
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-border/60 bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/60 bg-surface-1/70 text-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-border/60 bg-surface-1/70 px-3.5 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                <span className="size-1.5 rounded-full bg-primary animate-pulse [animation-delay:120ms]" />
                <span className="size-1.5 rounded-full bg-primary animate-pulse [animation-delay:240ms]" />
              </span>
            </div>
          </div>
        )}

        {err && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {err}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-16 left-0 right-0 mt-4 flex gap-2 bg-background pt-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message the coach…"
          className="flex-1 h-11 rounded-xl border border-border/60 bg-surface-2 px-3.5 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={busy || !input.trim()}
          type="submit"
          className="h-11 w-11 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 inline-flex items-center justify-center"
        >
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}
