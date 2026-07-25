import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Today — ETHEREAL BODYLABS" },
      { name: "description", content: "Your daily training, nutrition, protocol and physique lab." },
    ],
  }),
  component: AppShell,
});
