import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const registered = Boolean(resolvedSearchParams?.registered);

  return (
    <div className="space-y-6">
      {registered ? (
        <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-800">
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
