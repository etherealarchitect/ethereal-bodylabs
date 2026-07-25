import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// ---------- Mock supabase client BEFORE importing the hook ----------
type Listener = (evt: string, session: any) => void;
const listeners: Listener[] = [];
const upsertMock = vi.fn<(row: any, opts: any) => Promise<{ error: null }>>(async () => ({ error: null }));
const getSessionMock = vi.fn<() => Promise<{ data: { session: any } }>>(async () => ({ data: { session: null } }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (cb: Listener) => {
        listeners.push(cb);
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
      getSession: () => getSessionMock(),
    },
    from: (_table: string) => ({
      upsert: (row: any, opts: any) => upsertMock(row, opts),
    }),
  },
}));

import { useAuth } from "@/hooks/useAuth";

beforeEach(() => {
  listeners.length = 0;
  upsertMock.mockClear();
  getSessionMock.mockClear();
  getSessionMock.mockResolvedValue({ data: { session: null } });
});

describe("useAuth — new-user OAuth provisioning", () => {
  it("upserts a profile row for a brand-new Google user on SIGNED_IN", async () => {
    const { result } = renderHook(() => useAuth());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate the Lovable/Supabase OAuth callback firing SIGNED_IN.
    const user = {
      id: "user-new-123",
      email: "newbie@ethereal.test",
      user_metadata: {
        full_name: "Nova Newbie",
        avatar_url: "https://cdn.example/nova.png",
      },
    };
    listeners.forEach((l) => l("SIGNED_IN", { user }));

    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
    const [row, opts] = upsertMock.mock.calls[0]!;
    expect(row).toMatchObject({
      id: "user-new-123",
      display_name: "Nova Newbie",
      avatar_url: "https://cdn.example/nova.png",
    });
    expect(opts).toMatchObject({ onConflict: "id" });
  });

  it("derives display_name from email when metadata is missing (Apple hide-my-email)", async () => {
    renderHook(() => useAuth());
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    listeners.forEach((l) =>
      l("SIGNED_IN", {
        user: { id: "u2", email: "priv8@icloud.com", user_metadata: {} },
      }),
    );
    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    expect(upsertMock.mock.calls[0]![0].display_name).toBe("priv8");
    expect(upsertMock.mock.calls[0]![0].avatar_url).toBeNull();
  });

  it("provisions only once per user id across repeated auth events", async () => {
    renderHook(() => useAuth());
    await waitFor(() => expect(listeners.length).toBeGreaterThan(0));
    const evt = { user: { id: "user-dup", email: "a@b.co", user_metadata: {} } };
    listeners.forEach((l) => l("SIGNED_IN", evt));
    listeners.forEach((l) => l("TOKEN_REFRESHED", evt));
    listeners.forEach((l) => l("USER_UPDATED", evt));
    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1));
  });
});
