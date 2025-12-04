import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="space-y-8 text-left">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Create workspace</p>
        <h2 className="text-2xl font-semibold text-slate-900">Launch a concierge-grade inbox for every HOA</h2>
        <p className="text-sm text-slate-500">Invite your operators, connect Gmail, and sync automations with n8n in minutes.</p>
      </div>
      <SignupForm />
      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
