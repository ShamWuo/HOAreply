import type { ReactNode } from "react";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl bg-white p-8 shadow-xl shadow-blue-100">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
            BoardInbox AI Connect
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Manage HOA conversations with confidence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Securely connect HOA Gmail inboxes to your AI reply workflow.
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
