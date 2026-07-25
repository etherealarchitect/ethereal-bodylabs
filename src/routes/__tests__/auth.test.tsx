import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------- Mocks (must precede the component import) ----------
const signInWithPassword = vi.fn<(a: any) => Promise<any>>();
const signUp = vi.fn<(a: any) => Promise<any>>();
const signInWithOtp = vi.fn<(a: any) => Promise<any>>();
const signOut = vi.fn<() => Promise<any>>(async () => ({ error: null }));
const resend = vi.fn<(a: any) => Promise<any>>(async () => ({ error: null }));
const oauthMock = vi.fn<(...a: any[]) => Promise<any>>(async () => ({ redirected: true, error: null }));
const navigateMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      getSession: async () => ({ data: { session: null } }),
      signInWithPassword: (a: any) => signInWithPassword(a),
      signUp: (a: any) => signUp(a),
      signInWithOtp: (a: any) => signInWithOtp(a),
      signOut: () => signOut(),
      resend: (a: any) => resend(a),
      verifyOtp: vi.fn(async () => ({ error: null })),
    },
    from: () => ({ upsert: async () => ({ error: null }) }),
  },
}));

vi.mock("@/integrations/lovable", () => ({
  lovable: { auth: { signInWithOAuth: (...a: any[]) => oauthMock(...a) } },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@tanstack/react-router", () => {
  const React = require("react");
  return {
    createFileRoute: () => (opts: any) => opts,
    useNavigate: () => navigateMock,
    Link: ({ children, ...rest }: any) => React.createElement("a", rest, children),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ session: null, loading: false, user: null }),
}));

import { AuthPage } from "@/routes/auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Auth page — mode switching", () => {
  it("toggles between sign-in and registration and updates CTA + fields", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Starts in sign-in mode
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText(/Display name/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /No account yet\? Create one\./i }));

    expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
    expect(screen.getByText(/Display name/i)).toBeInTheDocument();

    // Toggle back
    await user.click(
      screen.getByRole("button", { name: /Already have an account\? Sign in\./i }),
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
    expect(screen.queryByText(/Display name/i)).not.toBeInTheDocument();
  });

  it("uses the same OAuth entry point in both modes (interchangeable SIWG/SIWA)", async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.click(screen.getByRole("button", { name: /Continue with Google/i }));
    expect(oauthMock).toHaveBeenCalledWith(
      "google",
      expect.objectContaining({ redirect_uri: expect.stringContaining("/auth/callback") }),
    );

    // Switch to signup and confirm the same button still calls the same handler.
    await user.click(screen.getByRole("button", { name: /No account yet\? Create one\./i }));
    await user.click(screen.getByRole("button", { name: /Continue with Apple/i }));
    expect(oauthMock).toHaveBeenCalledWith("apple", expect.any(Object));
    expect(oauthMock).toHaveBeenCalledTimes(2);
  });
});

describe("Auth page — email-not-confirmed handling", () => {
  it("surfaces the resend CTA and moves user into the OTP screen", async () => {
    signInWithPassword.mockResolvedValueOnce({
      error: { message: "Email not confirmed" },
    });

    const user = userEvent.setup();
    render(<AuthPage />);

    await user.type(screen.getByRole("textbox", { name: /Email/i }), "pending@ethereal.test");
    // Password field is not a "textbox" role (type=password). Query by label.
    const pw = screen.getByLabelText(/^Password$/i);
    await user.type(pw, "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Friendly error + resend CTA appear
    await waitFor(() =>
      expect(screen.getByText(/Confirm your email to sign in\./i)).toBeInTheDocument(),
    );
    const resendBtn = await screen.findByRole("button", { name: /Send verification code/i });

    await user.click(resendBtn);

    expect(resend).toHaveBeenCalledWith(
      expect.objectContaining({ type: "signup", email: "pending@ethereal.test" }),
    );

    // OTP screen mounted (6-digit code input)
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /Confirm your email/i })).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Verification code/i)).toBeInTheDocument();
  });
});
