import Link from "next/link";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#workflow" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Security", href: "/#security" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "mailto:hello@hoareply.ai" },
      { label: "Support", href: "/auth/login" },
      { label: "Status", href: "#" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Data deletion", href: "/privacy#data-deletion" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/60 bg-white/90">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 text-sm text-slate-600 md:grid-cols-4 md:px-6">
        <div>
          <p className="text-lg font-semibold text-slate-900">HOA Reply AI</p>
          <p className="mt-2 text-sm">AI inbox assistant for HOA managers and boards.</p>
          <p className="mt-2 text-xs text-slate-500">Powered by HOA Reply AI</p>
        </div>
        {footerLinks.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold text-slate-900">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="transition hover:text-slate-900">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/80 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} HOA Reply AI. All rights reserved.
      </div>
    </footer>
  );
}
