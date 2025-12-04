import Link from "next/link";
import { auth } from "@/lib/auth";
import { listUserHoas } from "@/lib/hoa";
import { CreateHoaForm } from "@/components/hoa/create-hoa-form";
import { SignOutButton } from "@/components/auth/signout-button";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const hoas = await listUserHoas(session.user.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Overview</p>
          <h1 className="text-3xl font-semibold text-slate-900">Welcome back, {session.user.name ?? session.user.email}</h1>
          <p className="text-sm text-slate-500">Connect HOA inboxes and review AI replies.</p>
        </div>
        <SignOutButton />
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/70 p-6 shadow-lg shadow-slate-100">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Your HOAs</h2>
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-slate-400">
              {hoas.length} connected
            </span>
          </div>
          <div className="mt-4 space-y-4">
            {hoas.length === 0 ? (
              <p className="text-sm text-slate-500">
                No HOAs yet. Create one and connect Gmail to start syncing conversations.
              </p>
            ) : (
              hoas.map((hoa) => (
                <div
                  key={hoa.id}
                  className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600 transition hover:border-blue-200 hover:bg-white/90 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-base font-semibold text-slate-900">{hoa.name}</p>
                    <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                      {hoa.gmailAccount ? "Gmail connected" : "Pending Gmail connect"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/app/hoa/${hoa.id}`}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                    >
                      Details
                    </Link>
                    <Link
                      href={`/app/hoa/${hoa.id}/inbox`}
                      className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow hover:bg-blue-500"
                    >
                      Inbox
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-blue-100">
          <h2 className="text-lg font-semibold text-slate-800">Create new HOA</h2>
          <CreateHoaForm />
        </div>
      </section>
    </div>
  );
}
