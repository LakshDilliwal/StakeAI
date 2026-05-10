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
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-label="StakeAI Logo">
            <rect x="3" y="3" width="22" height="22" rx="5" stroke="#01696f" strokeWidth="1.5" fill="rgba(1,105,111,0.1)"/>
            <path d="M9 10.5 C9 8.5 11 7.5 13 7.5 C15.5 7.5 17 9 17 11 C17 13 15 13.5 14 14 C12.5 14.5 11 15 11 17 C11 18.5 12.5 20.5 15 20.5 C17 20.5 19 19 19 17.5" stroke="#01696f" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
          </svg>
          <span className="font-bold text-white tracking-tight text-base">
            Stake<span className="text-[#01696f]">AI</span>
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
