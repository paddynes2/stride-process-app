"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [confirmEmail, setConfirmEmail] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name || null },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // If email confirmation is required, no session yet
    if (!data.session) {
      setConfirmEmail(true);
      setLoading(false);
      return;
    }

    // Session exists — bootstrap workspace via RPC
    const { data: bootstrapResult, error: bootstrapError } = await supabase.rpc(
      "bootstrap_workspace",
      { p_workspace_name: "My Workspace" }
    );

    if (bootstrapError) {
      console.error("Bootstrap error:", bootstrapError);
    }

    // Store workspace ID in cookie
    const wsId = bootstrapResult?.workspace_id;
    if (wsId) {
      document.cookie = `stride_workspace_id=${wsId}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    }

    router.push("/workspaces");
    router.refresh();
  };

  const handleGoogleSignup = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  if (confirmEmail) {
    return (
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
        style={{ background: "var(--bg-surface)", padding: 32 }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <div
            className="flex items-center justify-center"
            style={{ width: 36, height: 36, borderRadius: 8, background: "var(--brand)" }}
          >
            <span className="text-white text-[16px] font-bold leading-none">S</span>
          </div>
          <h1
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            Check your email
          </h1>
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", lineHeight: 1.5 }}>
            We sent a confirmation link to <strong style={{ color: "var(--text-primary)" }}>{email}</strong>.
            Click the link to activate your account.
          </p>
          <a
            href="/login"
            style={{ marginTop: 12, fontSize: "var(--text-sm)", color: "var(--accent-blue)", fontWeight: 500 }}
            className="hover:underline"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-[var(--radius-lg)] border border-[var(--border-subtle)]"
      style={{ background: "var(--bg-surface)", padding: 32 }}
    >
      <div className="flex flex-col items-center gap-3" style={{ marginBottom: 28 }}>
        <div
          className="flex items-center justify-center"
          style={{ width: 36, height: 36, borderRadius: 8, background: "var(--brand)" }}
        >
          <span className="text-white text-[16px] font-bold leading-none">S</span>
        </div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          Create your account
        </h1>
      </div>

      {/* Google OAuth */}
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full mb-4"
        onClick={handleGoogleSignup}
      >
        <svg width="18" height="18" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        Continue with Google
      </Button>

      <div className="flex items-center gap-3 mb-4">
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>or</span>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>
            Name <span style={{ color: "var(--text-quaternary)" }}>(optional)</span>
          </label>
          <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" autoFocus />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>Email</label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: 500 }}>Password</label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a password (min 6 characters)" required autoComplete="new-password" minLength={6} />
        </div>

        {error && <p style={{ fontSize: "var(--text-sm)", color: "var(--accent-red)" }}>{error}</p>}

        <Button type="submit" loading={loading} size="lg" className="w-full" style={{ marginTop: 4 }}>
          Create account
        </Button>
      </form>

      <p className="text-center" style={{ marginTop: 20, fontSize: "var(--text-sm)", color: "var(--text-tertiary)" }}>
        Already have an account?{" "}
        <a href="/login" style={{ color: "var(--accent-blue)", fontWeight: 500 }} className="hover:underline">Sign in</a>
      </p>
    </div>
  );
}
