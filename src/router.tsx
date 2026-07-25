import { QueryClient } from "@tanstack/react-query";
import { createRouter, ErrorComponent } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultErrorComponent: ErrorComponent,
    defaultNotFoundComponent: () => (
      <div className="min-h-screen grid place-items-center p-8 text-center">
        <div>
          <div className="font-mono text-xs text-muted-foreground">404</div>
          <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
          <a href="/" className="mt-4 inline-block text-sm text-primary underline">Return home</a>
        </div>
      </div>
    ),
  });

  return router;
};
