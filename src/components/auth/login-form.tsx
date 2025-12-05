"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { loginSchema } from "@/lib/validators";

export function LoginForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuth, setIsOAuth] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError("Enter a valid email and password.");
      return;
    }

    setIsSubmitting(true);

    const response = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    setIsSubmitting(false);

    if (response?.error) {
      setFormError("Invalid credentials");
      return;
    }

    router.push("/app/dashboard");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <button
        type="button"
        onClick={() => {
          setIsOAuth(true);
          void signIn("google", { callbackUrl: "/app/dashboard" });
        }}
        disabled={isOAuth}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-[0_14px_35px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-500 text-[11px] font-semibold text-white">
          G
        </span>
        {isOAuth ? "Redirecting to Google..." : "Sign in with Google"}
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        <span>or use email</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-slate-600">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_12px_35px_rgba(15,23,42,0.08)] transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200/60"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-slate-600">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 shadow-[0_12px_35px_rgba(15,23,42,0.08)] transition focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200/60"
        />
      </div>
      {formError ? (
        <p
          className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-2 text-sm text-red-700"
          aria-live="polite"
        >
          {formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
      <p className="text-center text-xs uppercase tracking-[0.35em] text-slate-400">SSO + audit ready</p>
    </form>
  );
}
