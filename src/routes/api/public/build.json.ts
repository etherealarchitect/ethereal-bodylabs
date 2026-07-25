import { createFileRoute } from "@tanstack/react-router";
import { BUILD_ID } from "@/lib/build-id";

export const Route = createFileRoute("/api/public/build/json")({
  server: {
    handlers: {
      GET: () =>
        new Response(JSON.stringify({ id: BUILD_ID, ts: Date.now() }), {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-cache, no-store, must-revalidate",
            "x-build-id": BUILD_ID,
          },
        }),
    },
  },
});
