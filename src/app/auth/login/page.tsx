import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const registered = Boolean(resolvedSearchParams?.registered);

  return (
    <div className="space-y-8 text-left">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Sign in</p>
        <h2 className="text-2xl font-semibold text-slate-900">Review every board thread from one command center</h2>
        <p className="text-sm text-slate-500">Use your BoardInbox AI operator account to monitor AI drafts, approvals, and escalations.</p>
      </div>
      {registered ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
          Account created successfully. You can sign in now.
        </div>
      ) : null}
      <LoginForm />
      <p className="text-center text-sm text-slate-500">
        Need an account?{" "}
        <Link href="/auth/signup" className="font-semibold text-blue-600 hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
