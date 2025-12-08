import Link from "next/link";
import { auth } from "@/lib/auth";
import { assertHoaOwnership } from "@/lib/hoa";
import { GlassPanel } from "@/components/ui/glass-panel";
import { pillButtonClasses } from "@/components/ui/pill-button";

interface HoaDetailPageProps {
  params?: Promise<{ hoaId: string }>;
}

export default async function HoaDetailPage({ params }: HoaDetailPageProps) {
  const { hoaId } = params ? await params : { hoaId: "" };
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const hoa = await assertHoaOwnership(hoaId, session.user.id);
  const status = hoa.gmailAccount
    ? {
        label: "Gmail connected",
        badgeClass: "bg-emerald-100 text-emerald-700",
        helper: `Email: ${hoa.gmailAccount.email}`,
      }
    : {
        label: "Connection pending",
        badgeClass: "bg-amber-100 text-amber-800",
        helper: "Authorize Gmail to enable AI replies.",
      };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pb-16 pt-12 md:px-6">
      <Link href="/app/dashboard" className={pillButtonClasses({ variant: "secondary", className: "w-fit" })}>
        ← Dashboard
      </Link>
      <GlassPanel className="p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">HOA workspace</p>
            <h1 className="text-4xl font-semibold text-slate-900">{hoa.name}</h1>
            <p className="text-sm text-slate-500">Created {hoa.createdAt.toLocaleDateString()}</p>
          </div>
          <span className={`inline-flex items-center rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${status.badgeClass}`}>
            {status.label}
          </span>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <GlassPanel className="p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Workspace ID</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{hoa.id}</p>
            <p className="text-sm text-slate-500">Store this when generating automation rules.</p>
          </GlassPanel>
          <GlassPanel className="p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Gmail status</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{status.label}</p>
            <p className="text-sm text-slate-500">{status.helper}</p>
            {hoa.gmailAccount ? <p className="mt-3 text-sm text-slate-600">Sync runs automatically in the background.</p> : null}
          </GlassPanel>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`/connect/gmail?hoaId=${hoa.id}`} className={pillButtonClasses({ variant: "primary" })}>
            {hoa.gmailAccount ? "Reconnect Gmail" : "Connect Gmail"}
          </a>
          <Link href={`/app/hoa/${hoa.id}/inbox`} className={pillButtonClasses({ variant: "secondary" })}>
            View inbox
          </Link>
        </div>
      </GlassPanel>
    </div>
  );
}
