import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Sparkles, X, Send, Loader2, Plus, History, Trash2 } from "lucide-react";
import { askAlice, listAliceThreads, loadAliceThread, deleteAliceThread } from "@/lib/alice.functions";
import { useAuth } from "@/hooks/useAuth";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's a high-protein breakfast idea?",
  "How do I log a workout?",
  "Tips for better sleep tonight?",
  "Explain progressive overload",
];

const ACTIVE_KEY = "ebl.alice.activeThread";

export function AliceFab() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const askFn = useServerFn(askAlice);
  const listFn = useServerFn(listAliceThreads);
  const loadFn = useServerFn(loadAliceThread);
  const delFn = useServerFn(deleteAliceThread);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const qc = useQueryClient();

  // Restore active thread id from localStorage on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(ACTIVE_KEY);
    if (saved) setThreadId(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (threadId) window.localStorage.setItem(ACTIVE_KEY, threadId);
    else window.localStorage.removeItem(ACTIVE_KEY);
  }, [threadId]);

  // Load messages when a thread is selected.
  useEffect(() => {
    if (!threadId || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await loadFn({ data: { threadId } });
        if (cancelled) return;
        setMessages(
          (res.messages ?? [])
            .filter((m: any) => m.role === "user" || m.role === "assistant")
            .map((m: any) => ({ role: m.role, content: m.content })),
        );
      } catch {
        setThreadId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [threadId, user, loadFn]);

  const threadsQuery = useQuery({
    queryKey: ["alice", "threads"],
    queryFn: () => listFn({ data: {} }),
    enabled: !!user && open && showHistory,
  });

  const mutation = useMutation({
    mutationFn: async (text: string) => {
      return askFn({ data: { threadId, message: text } });
    },
    onSuccess: (res) => {
      setThreadId(res.threadId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      qc.invalidateQueries({ queryKey: ["alice", "threads"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    },
  });

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mutation.isPending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setInput("");
    mutation.mutate(trimmed);
  }

  function newChat() {
    setThreadId(null);
    setMessages([]);
    setShowHistory(false);
    setInput("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function pickThread(id: string) {
    setThreadId(id);
    setShowHistory(false);
  }

  async function removeThread(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await delFn({ data: { threadId: id } });
      qc.invalidateQueries({ queryKey: ["alice", "threads"] });
      if (id === threadId) newChat();
    } catch {
      // silent
    }
  }

  const firstName = useMemo(() => {
    const dn = user?.user_metadata?.display_name;
    return typeof dn === "string" ? dn.split(" ")[0] : null;
  }, [user]);

  if (!user) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Ask Alice"
          className="fixed z-30 rounded-full shadow-lg shadow-primary/30 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground grid place-items-center tap animate-scale-in"
          style={{
            right: "1rem",
            bottom: "calc(5.5rem + env(safe-area-inset-bottom))",
            width: 56,
            height: 56,
          }}
        >
          <span
            className="absolute inset-0 rounded-full bg-primary/40 -z-10"
            style={{ animation: "pulse 2.2s cubic-bezier(0.4,0,0.6,1) infinite" }}
          />
          <Sparkles className="size-6" />
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center sm:items-end sm:justify-end p-3 sm:p-4"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        >
          <button
            aria-label="Close Alice"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-background/40 backdrop-blur-sm animate-fade-in"
          />

          <div
            className="relative w-full sm:max-w-md rounded-3xl glass-strong shadow-2xl border border-border/50 flex flex-col overflow-hidden animate-scale-in"
            style={{ maxHeight: "min(88vh, 640px)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-gradient-to-r from-primary/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="size-9 rounded-full bg-gradient-to-br from-primary to-primary/60 grid place-items-center text-primary-foreground">
                    <Sparkles className="size-4" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                </div>
                <div>
                  <div className="text-sm font-semibold leading-none">Alice</div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-1">
                    Your AI guide
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory((v) => !v)}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary tap"
                  aria-label="Chat history"
                  title="History"
                >
                  <History className="size-4" />
                </button>
                <button
                  onClick={newChat}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary tap"
                  aria-label="New chat"
                  title="New chat"
                >
                  <Plus className="size-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary tap"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* History drawer */}
            {showHistory && (
              <div className="border-b border-border/40 bg-surface-1/40 max-h-56 overflow-y-auto p-2 space-y-1">
                {threadsQuery.isLoading && (
                  <div className="text-xs text-muted-foreground p-2">Loading…</div>
                )}
                {threadsQuery.data?.threads?.length === 0 && (
                  <div className="text-xs text-muted-foreground p-2">No chats yet.</div>
                )}
                {threadsQuery.data?.threads?.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => pickThread(t.id)}
                    className={`group w-full text-left rounded-lg px-2.5 py-1.5 text-xs flex items-center justify-between gap-2 hover:bg-secondary tap ${
                      t.id === threadId ? "bg-secondary" : ""
                    }`}
                  >
                    <span className="truncate flex-1">{t.title}</span>
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(t.last_message_at).toLocaleDateString()}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => removeThread(t.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="space-y-3">
                  <div className="rounded-2xl bg-secondary/60 p-3 text-sm">
                    Hi{firstName ? `, ${firstName}` : ""} 👋 I'm Alice. Ask me about the app, food,
                    training, recovery, sleep — anything wellness. I'll remember our chat.
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    Try asking
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-xs rounded-full border border-border/60 bg-surface-1/70 px-2.5 py-1.5 hover:bg-secondary tap"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary/70 text-foreground rounded-bl-md"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-headings:mt-2 prose-headings:mb-1">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    )}
                  </div>
                </div>
              ))}
              {mutation.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-secondary/70 px-3 py-2 text-sm inline-flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Alice is thinking…
                  </div>
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="border-t border-border/40 p-2.5 flex items-end gap-2 bg-background/60"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask Alice anything…"
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-border/60 bg-surface-1/80 px-3 py-2 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 max-h-32"
              />
              <button
                type="submit"
                disabled={!input.trim() || mutation.isPending}
                className="rounded-full bg-primary text-primary-foreground p-2.5 tap disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send"
              >
                {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              </button>
            </form>
            <div className="px-3 pb-2 text-[9px] font-mono text-muted-foreground text-center">
              Alice is an AI guide. Not medical advice.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
