"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Crosshair,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react";
import { Badge, Button, Field, Input, buttonClass } from "@/components/ui";
import { Logo } from "@/components/brand/logo";
import { useApp } from "@/components/providers/app-provider";
import { useToast } from "@/components/ui/toast";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

/**
 * Supabase returns raw provider errors ("Unsupported provider: provider is not
 * enabled"). Translate the two that actually happen when a deployment is not
 * wired up yet.
 */
function oauthError(message: string) {
  const text = message.toLowerCase();
  if (text.includes("provider is not enabled") || text.includes("unsupported provider")) {
    return "Google sign-in is not enabled on this deployment yet. Use email and password below, or enable Google in Supabase → Authentication → Providers.";
  }
  if (text.includes("redirect_uri_mismatch") || text.includes("redirect uri")) {
    return "Google rejected the redirect URI. Add the Supabase callback URL to your Google OAuth client.";
  }
  return message;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C37 40.4 44 35 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}

export function LoginClient({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const { mode, ready, profile, signInDemo } = useApp();
  const [tab, setTab] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Server-resolved; flips to false if the provider turns out to be disabled.
  const [googleAvailable, setGoogleAvailable] = useState(googleEnabled);

  useEffect(() => {
    if (ready && profile) router.replace(next);
  }, [ready, profile, next, router]);

  useEffect(() => {
    setGoogleAvailable(googleEnabled);
  }, [googleEnabled]);

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === "demo") {
      signInDemo();
      toast({ title: "Welcome to the demo", description: "You're signed in as a demo captain." });
      router.replace(next);
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      return;
    }
    if (!email.trim() || password.length < 6) {
      setError("Enter your email and password (6+ characters).");
      return;
    }

    setBusy(true);
    try {
      if (tab === "signup") {
        const origin = window.location.origin;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { display_name: name.trim() || email.split("@")[0] },
            emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setNotice("Check your inbox — confirm your email, then you'll be dropped straight back here.");
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
      router.replace(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setError(null);
    setNotice(null);
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      return;
    }

    setGoogleBusy(true);
    try {
      // PKCE is handled by supabase-js: the code verifier stays in this browser
      // and is exchanged once on /auth/callback. No Google secret touches the app.
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (oauthError) throw oauthError;
      // The browser is leaving for Google. Keep the button locked so a double
      // click cannot start two authorization requests.
    } catch (cause) {
      setGoogleBusy(false);
      const message = cause instanceof Error ? cause.message : "Could not start Google sign-in.";
      if (/provider is not enabled|unsupported provider/i.test(message)) {
        setGoogleAvailable(false);
      }
      setError(oauthError(message));
    }
  }

  async function magicLink() {
    setError(null);
    setNotice(null);
    if (!email.trim()) {
      setError("Enter your email first.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured for this deployment.");
      return;
    }
    setBusy(true);
    try {
      const origin = window.location.origin;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (otpError) throw otpError;
      setNotice("Magic link sent. Open it on this device to sign in — no password needed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send the link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[calc(100dvh-64px)] max-w-6xl items-stretch gap-0 lg:grid-cols-[1fr_460px]">
      <aside className="relative hidden overflow-hidden border-r border-white/[0.06] lg:block">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -left-24 top-20 size-80 rounded-full bg-violet-deep/[0.22] blur-[90px]" />
        <div className="absolute bottom-0 right-0 size-72 rounded-full bg-violet/[0.07] blur-[90px]" />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Logo />
          <div>
            <Badge tone="violet">
              <Sparkles className="size-3" /> SEASON 07 IS LIVE
            </Badge>
            <h1 className="display mt-4 max-w-md text-[64px] leading-[0.85] text-mist">
              Own the
              <br />
              <span className="text-violet text-glow">lobby.</span>
            </h1>
            <p className="mt-5 max-w-sm text-[12px] leading-relaxed text-muted">
              One account for every scrim. Save your roster once, lock slots in seconds, pull room
              credentials the moment they drop.
            </p>

            <div className="mt-8 space-y-3">
              {[
                { icon: Crosshair, label: "Verified BGMI lobbies", detail: "ID checks + manual marshals" },
                { icon: Zap, label: "Instant slot confirmation", detail: "UPI checkout, zero markup" },
                { icon: Trophy, label: "Payouts inside 24h", detail: "Direct to the registered IGL" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-violet/25 bg-violet/[0.08] text-violet">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-mist/90">
                        {item.label}
                      </p>
                      <p className="text-[8px] font-semibold uppercase tracking-[0.1em] text-muted/60">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-muted/45">
            Forged in the lobby · Made in India
          </p>
        </div>
      </aside>

      <main className="flex items-start px-4 pb-14 pt-7 sm:px-8 lg:items-center lg:py-12">
        <div className="w-full">
          <div className="mt-7 flex items-start justify-between gap-3 lg:mt-0">
            <div>
              <p className="eyebrow text-violet">
                <span className="h-px w-4 bg-violet/50" />
                {mode === "demo" ? "Preview access" : "Account"}
              </p>
              <h2 className="display mt-2.5 text-[clamp(2.3rem,10.5vw,2.9rem)] leading-[0.92] tracking-[-0.045em] text-mist">
                {tab === "signin" ? "Back to the grind" : "Join the lobby"}
              </h2>
            </div>
            <span className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl border border-violet/25 bg-violet/[0.08] text-violet shadow-[inset_0_1px_0_rgba(183,166,255,0.12)]">
              {tab === "signin" ? <LogIn className="size-5" /> : <UserPlus className="size-5" />}
            </span>
          </div>

          {mode === "demo" ? (
            <div className="mt-5 rounded-xl border border-ice/20 bg-ice/[0.045] p-3.5">
              <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-[#a8efff]">
                <ShieldCheck className="size-3.5" /> Demo build
              </p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-muted">
                No Supabase keys detected. You can explore the full booking flow with simulated UPI
                payments and local data.
              </p>
            </div>
          ) : null}

          {mode === "live" ? (
            <div className="mt-5 flex rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
              {[
                { id: "signin" as const, label: "Sign in" },
                { id: "signup" as const, label: "Create account" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setError(null);
                    setNotice(null);
                  }}
                  className={cn(
                    "h-9 flex-1 rounded-lg text-[9px] font-extrabold uppercase tracking-[0.12em] transition",
                    tab === item.id
                      ? "bg-violet text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                      : "text-muted hover:text-mist",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          {mode === "live" && googleAvailable ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void googleSignIn()}
                disabled={busy || googleBusy || ready === false}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.12] bg-white/[0.045] text-[10px] font-extrabold uppercase tracking-[0.09em] text-mist shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-white/20 hover:bg-white/[0.07] disabled:pointer-events-none disabled:opacity-50"
              >
                {googleBusy ? (
                  <Loader2 className="size-4 animate-spin text-muted" />
                ) : (
                  <GoogleIcon className="size-4" />
                )}
                Continue with Google
              </button>
              <div className="mt-4 flex items-center gap-3">
                <span className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[7.5px] font-bold uppercase tracking-[0.16em] text-muted/50">
                  or use email
                </span>
                <span className="h-px flex-1 bg-white/[0.07]" />
              </div>
            </div>
          ) : null}

          {mode === "live" && !googleAvailable ? (
            <p className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[9px] leading-relaxed text-muted">
              Google sign-in is not enabled on this deployment. Use email and password below.
            </p>
          ) : null}

          <form onSubmit={(event) => void signIn(event)} className="mt-4 space-y-3.5">
            {mode === "live" && tab === "signup" ? (
              <Field label="Captain name">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Aarav"
                  autoComplete="nickname"
                  maxLength={28}
                />
              </Field>
            ) : null}

            {mode === "live" ? (
              <>
                <Field label="Email">
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted/50" />
                    <Input
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      type="email"
                      autoComplete="email"
                      className="pl-10"
                      required
                    />
                  </div>
                </Field>

                <Field label="Password" hint={tab === "signup" ? "8+ characters" : undefined}>
                  <div className="relative">
                    <Input
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      autoComplete={tab === "signup" ? "new-password" : "current-password"}
                      className="pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted/60 transition hover:text-mist"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </Field>
              </>
            ) : (
              <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                <p className="flex items-center gap-1.5 text-[7.5px] font-bold uppercase tracking-[0.12em] text-muted/70">
                  <span className="size-1 rounded-full bg-lime shadow-[0_0_8px_rgba(211,255,85,0.8)]" />
                  Demo captain
                </p>
                <p className="mt-1.5 font-display text-[15px] font-bold uppercase tracking-[-0.02em] text-mist">
                  Aarav · RIFT ESPORTS
                </p>
                <p className="mt-1 text-[9px] leading-relaxed text-muted">
                  Admin access enabled so you can test the results desk.
                </p>
              </div>
            )}

            {error ? (
              <p className="rounded-lg border border-orange/25 bg-orange/[0.06] px-3 py-2 text-[10px] leading-relaxed text-[#ffaf9b]">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="rounded-lg border border-ice/25 bg-ice/[0.06] px-3 py-2 text-[10px] leading-relaxed text-[#c4f5ff]">
                {notice}
              </p>
            ) : null}

            <Button type="submit" disabled={busy || googleBusy || ready === false} size="lg" className="w-full">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : tab === "signin" || mode === "demo" ? (
                <LogIn className="size-4" />
              ) : (
                <UserPlus className="size-4" />
              )}
              {mode === "demo" ? "Enter the demo lobby" : tab === "signin" ? "Sign in" : "Create account"}
              <ArrowRight className="size-4" />
            </Button>
          </form>

          {mode === "live" ? (
            <button
              type="button"
              onClick={() => void magicLink()}
              disabled={busy || googleBusy}
              className={cn(buttonClass("ghost", "md"), "mt-2 w-full text-muted")}
            >
              <Mail className="size-3.5" /> Email me a sign-in link
            </button>
          ) : null}

          <div className="mt-6 space-y-2 border-t border-white/[0.06] pt-4">
            {["No spam. No resale of your data.", "Room credentials only visible to your squad.", "Refunds if a lobby is cancelled."].map(
              (line) => (
                <p key={line} className="flex items-center gap-2 text-[9px] font-semibold text-muted/70">
                  <Check className="size-3 shrink-0 text-violet/70" strokeWidth={3} />
                  {line}
                </p>
              ),
            )}
          </div>

          <p className="mt-6 text-[9px] leading-relaxed text-muted/50">
            By continuing you agree to the{" "}
            <Link href="/legal/terms" className="text-muted underline-offset-4 hover:text-violet hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/legal/refund" className="text-muted underline-offset-4 hover:text-violet hover:underline">
              refund policy
            </Link>
            .
          </p>

          <Link
            href="/scrims"
            className="mt-4 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-muted transition hover:text-mist"
          >
            Browse lobbies without signing in <ArrowRight className="size-3" />
          </Link>
        </div>
      </main>
    </div>
  );
}
