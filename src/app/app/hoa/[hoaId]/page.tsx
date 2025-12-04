import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertHoaOwnership } from "@/lib/hoa";

interface HoaDetailPageProps {
  params: Promise<{ hoaId: string }>;
}

export default async function HoaDetailPage({ params }: HoaDetailPageProps) {
  const { hoaId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const hoa = await assertHoaOwnership(hoaId, session.user.id);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <Link href="/app/dashboard" className="text-sm text-blue-600">
        ← Back to dashboard
      </Link>
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-lg shadow-slate-100">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">HOA</p>
        <h1 className="text-3xl font-semibold text-slate-900">{hoa.name}</h1>
        <p className="text-sm text-slate-500">Created {hoa.createdAt.toLocaleDateString()}</p>
        <div className="mt-6 flex flex-wrap gap-4">
          <a
            href={`/connect/gmail?hoaId=${hoa.id}`}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500"
          >
            {hoa.gmailAccount ? "Reconnect Gmail" : "Connect Gmail"}
          </a>
          <Link
            href={`/app/hoa/${hoa.id}/inbox`}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            View inbox
          </Link>
        </div>
        {hoa.gmailAccount ? (
          <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            Gmail connected: {hoa.gmailAccount.email}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Gmail not connected yet.
          </div>
        )}
      </div>
    </div>
  );
}
