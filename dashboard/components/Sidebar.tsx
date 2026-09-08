"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/quick-post", label: "Quick Post" },
  { href: "/scheduled", label: "Scheduled" },
  { href: "/drafts", label: "Drafts" },
  { href: "/comments", label: "Comments" },
  { href: "/idea-bank", label: "Idea Bank" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/logs", label: "Logs" },
  { href: "/settings", label: "Settings" },
];

const EQ_DELAYS = ["0s", "0.15s", "0.3s", "0.45s"];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-[264px] shrink-0 border-r border-term-soft px-5 py-8 flex flex-col gap-1 h-screen sticky top-0">
      <Link href="/" className="flex items-center gap-3 mb-10 px-2 no-underline hover:no-underline">
        <div
          className="w-8 h-8 flex items-center justify-center font-mono font-bold text-term-accent"
          style={{
            border: "1px solid oklch(0.82 0.19 150 / 0.6)",
            boxShadow: "0 0 12px oklch(0.82 0.19 150 / 0.35)",
          }}
        >
          P
        </div>
        <div className="font-mono font-semibold tracking-[0.12em] text-[15px] text-term-text">PULSE</div>
        <div className="flex items-end gap-[2px] h-[14px] ml-auto">
          {EQ_DELAYS.map((delay) => (
            <div
              key={delay}
              className="w-[2px] h-full bg-term-accent origin-bottom"
              style={{ animation: "pbar 1.1s ease-in-out infinite", animationDelay: delay }}
            />
          ))}
        </div>
      </Link>

      <ul className="space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block px-4 py-[11px] text-[14.5px] transition-colors ${
                  active
                    ? "bg-term-accent text-term-on-accent font-semibold"
                    : "text-[oklch(0.72_0.01_90)] font-medium hover:bg-[oklch(0.82_0.19_150_/_0.08)]"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto px-2 pt-3 font-mono text-[11px] text-[oklch(0.5_0.01_90)] border-t border-term-soft tracking-[0.04em]">
        v0.4.2 · claude-sonnet-5
      </div>
    </nav>
  );
}
