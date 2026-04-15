"use client";

import { type FormEvent, useEffect, useState } from "react";
import { forgotPassword, login, register, resetPassword } from "../../lib/api-client";
import type { AuthSession } from "../../lib/api-client";
import { BrandLogo } from "./brand";
import { detailImage } from "./shared";
import type { AuthMode } from "./shared";

export function AuthPanel({ onSession }: { onSession: (session: AuthSession) => void }) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const resetToken = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("resetToken") : null;

  useEffect(() => {
    if (resetToken) {
      setMode("reset");
    }
  }, [resetToken]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");

    try {
      if (mode === "register") {
        const nextSession = await register({
          email: String(form.get("email")),
          username: String(form.get("username")),
          displayName: String(form.get("displayName")),
          password: String(form.get("password")),
          platform: "web"
        });
        onSession(nextSession);
        return;
      }

      if (mode === "forgot") {
        await forgotPassword(String(form.get("email")));
        setMessage("Check Mailpit for the reset link.");
        return;
      }

      if (mode === "reset") {
        await resetPassword(String(form.get("token") || resetToken), String(form.get("password")));
        window.history.replaceState({}, "", "/");
        setMode("login");
        setMessage("Password updated. Sign in with the new password.");
        return;
      }

      const nextSession = await login({
        identifier: String(form.get("identifier")),
        password: String(form.get("password")),
        platform: "web"
      });
      onSession(nextSession);
    } catch {
      setMessage("That did not work. Check the fields and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8 text-charcoal">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-charcoal/10 bg-cloud/90 shadow-2xl shadow-charcoal/10 backdrop-blur lg:grid-cols-[1.2fr_420px]">
        <div className="relative hidden min-h-[720px] overflow-hidden lg:block">
          <img alt="Omochat workspace" className="h-full w-full object-cover" src={detailImage} />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(242,193,79,0.16),rgba(255,255,255,0)_42%,rgba(217,138,209,0.18))]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(17,13,10,0.06),rgba(17,13,10,0.28)_48%,rgba(17,13,10,0.78))]" />
          <div className="absolute inset-x-6 bottom-6 rounded-[30px] border border-white/16 bg-[rgba(22,17,13,0.48)] p-6 shadow-[0_24px_60px_rgba(12,10,8,0.28)] backdrop-blur-md">
            <BrandLogo theme="light" />
            <h1 className="font-display mt-6 max-w-lg text-[2.5rem] font-bold leading-[1.02] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:text-[3.15rem]">
              State-of-the-art chat, calm enough to live in.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-white/90 drop-shadow-[0_6px_18px_rgba(0,0,0,0.28)]">
              Sign in with email, username, verified phone, or your short identity code. Every new account now gets a unique tag like{" "}
              <span className="font-bold text-white">@23yg2</span>.
            </p>
          </div>
        </div>

        <div className="p-6 sm:p-8">
          <BrandLogo compact />
          <h2 className="font-display mt-2 text-[2rem] font-bold">{authTitle(mode)}</h2>
          <p className="mt-2 text-[14px] leading-6 text-graphite/80">
            Sign in with your email, username, verified phone, or short code. Password reset stays local through Mailpit.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <AuthInput label="Email" name="email" placeholder="mira@omochat.local" type="email" />
                <AuthInput label="Username" name="username" placeholder="mira" />
                <AuthInput label="Display name" name="displayName" placeholder="Mira Stone" />
                <AuthInput label="Password" name="password" placeholder="ChangeMe123!" type="password" />
              </>
            ) : null}

            {mode === "login" ? (
              <>
                <AuthInput label="Email, username, phone, or @code" name="identifier" placeholder="@23yg2 or +16155543592" />
                <AuthInput label="Password" name="password" placeholder="ChangeMe123!" type="password" />
              </>
            ) : null}

            {mode === "forgot" ? <AuthInput label="Email" name="email" placeholder="mira@omochat.local" type="email" /> : null}

            {mode === "reset" ? (
              <>
                {!resetToken ? <AuthInput label="Reset token" name="token" placeholder="Paste token" /> : null}
                <AuthInput label="New password" name="password" placeholder="NewChangeMe123!" type="password" />
              </>
            ) : null}

            <button className="w-full rounded-lg bg-charcoal px-4 py-4 font-bold text-cloud transition hover:bg-black" disabled={busy}>
              {busy ? "Working..." : authButton(mode)}
            </button>
          </form>

          {message ? <p className="mt-4 rounded-lg bg-sweet px-4 py-3 text-sm font-semibold text-graphite">{message}</p> : null}

          <div className="mt-6 flex flex-wrap gap-3 text-sm font-semibold text-graphite">
            {mode !== "login" ? <button onClick={() => setMode("login")}>Sign in</button> : null}
            {mode !== "register" ? <button onClick={() => setMode("register")}>Create account</button> : null}
            {mode !== "forgot" ? <button onClick={() => setMode("forgot")}>Forgot password</button> : null}
          </div>
        </div>
      </section>
    </main>
  );
}

function AuthInput({
  label,
  name,
  placeholder,
  type = "text"
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block text-sm font-semibold">
      <span>{label}</span>
      <input
        className="mt-1 w-full rounded-lg border border-charcoal/10 bg-white px-4 py-4 outline-none ring-honey/30 transition focus:ring-4"
        name={name}
        placeholder={placeholder}
        required
        type={type}
      />
    </label>
  );
}

function authTitle(mode: AuthMode) {
  if (mode === "register") {
    return "Create your room";
  }
  if (mode === "forgot") {
    return "Reset access";
  }
  if (mode === "reset") {
    return "Choose a new password";
  }
  return "Welcome back";
}

function authButton(mode: AuthMode) {
  if (mode === "register") {
    return "Create account";
  }
  if (mode === "forgot") {
    return "Send reset link";
  }
  if (mode === "reset") {
    return "Update password";
  }
  return "Sign in";
}
