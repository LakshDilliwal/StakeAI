"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "./WalletButton";

export function Navbar() {
  const path = usePathname();
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1f1f1f] bg-[#0a0a0a]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="Axiom6 Logo">
            <polygon points="14,2 26,22 2,22" stroke="#01696f" strokeWidth="1.5" fill="none" strokeLinejoin="round"/>
            <polygon points="14,8 21,20 7,20" fill="#01696f" opacity="0.25"/>
            <line x1="14" y1="8" x2="14" y2="16" stroke="#01696f" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="14" cy="18" r="1.2" fill="#01696f"/>
          </svg>
          <span className="font-bold text-white tracking-tight text-base">
            AXIOM<span className="text-[#01696f]">6</span>
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href}
              className={`px-3 py-1.5 rounded text-sm font-sans transition-colors ${
                path === href
                  ? "bg-[#01696f]/10 text-[#01696f] border border-[#01696f]/30"
                  : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
              }`}>
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#1f1f1f] bg-[#111] text-[10px] font-mono text-[#01696f] tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#01696f] animate-pulse"/>
            DEVNET
          </span>
          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
