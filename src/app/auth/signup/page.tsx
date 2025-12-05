import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";
import { buildMetadata } from "@/lib/seo";

export const generateMetadata = () =>
  buildMetadata({
    title: "Create your HOA Reply AI account",
    description: "Sign up in seconds with Google or email. Connect Gmail after signup and start drafting replies automatically.",
    canonicalPath: "/auth/signup",
  });

export default function SignupPage() {
  return (
    <div className="space-y-8 text-left">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Create workspace</p>
        <h2 className="text-2xl font-semibold text-slate-900">Start with Google OAuth, finish in minutes</h2>
        <p className="text-sm text-slate-500">
          Connect Gmail securely after signup. We collect HOA details only after your account is ready.
        </p>
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
