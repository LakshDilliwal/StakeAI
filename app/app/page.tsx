"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";

const stats = [
  { label: "Total Value Locked", value: "$12.8M", change: "+12.4%" },
  { label: "Active Agents", value: "24", change: "+3" },
  { label: "24h Volume", value: "$3.29M", change: "+8.7%" },
  { label: "Avg APY", value: "18.6%", change: "+2.1%" },
];

const features = [
  { icon: Shield, title: "Non-Custodial Vaults", desc: "Funds held in audited on-chain PDAs. Agents never hold your keys." },
  { icon: Zap, title: "Jupiter-Powered Execution", desc: "Best-route swaps via Jupiter CPI. Slippage optimized every trade." },
  { icon: TrendingUp, title: "Performance-Fee Model", desc: "Agents earn only when you profit. High-water mark enforced on-chain." },
];

export default function Home() {
  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="pt-16 pb-8 text-center space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#01696f]/30 bg-[#01696f]/10 text-[#01696f] text-xs font-mono tracking-widest mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-[#01696f] animate-pulse" />
            LIVE ON SOLANA DEVNET
          </span>
          <h1 className="text-5xl font-bold tracking-tight text-white leading-tight">
            Institutional Vaults for<br />
            <span className="text-[#01696f]">AI Agents</span>
          </h1>
          <p className="mt-4 text-gray-400 text-lg max-w-xl mx-auto leading-relaxed">
            Stake Crypto. Delegate to autonomous trading agents.<br />Earn yield powered by Solana DeFi.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-center gap-3 pt-2">
          <Link href="/dashboard" className="px-6 py-2.5 bg-[#01696f] hover:bg-[#01595e] text-white rounded text-sm font-medium transition-colors flex items-center gap-2">
            View Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/leaderboard" className="px-6 py-2.5 bg-[#111] hover:bg-[#1a1a1a] text-white border border-[#1f1f1f] rounded text-sm font-medium transition-colors">
            Leaderboard
          </Link>
        </motion.div>
      </section>

      {/* Stats bar */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, change }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="border border-[#1f1f1f] bg-[#111] rounded p-5">
            <span className="text-[10px] text-gray-500 uppercase tracking-widest block">{label}</span>
            <div className="flex items-end gap-2 mt-2">
              <span className="text-2xl font-mono text-white">{value}</span>
              <span className="text-xs font-mono text-[#01696f] mb-0.5">{change}</span>
            </div>
          </motion.div>
        ))}
      </section>

      {/* Features */}
      <section className="space-y-4">
        <h2 className="text-xs text-gray-500 uppercase tracking-widest font-mono">Protocol Design</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              className="border border-[#1f1f1f] bg-[#111] rounded p-6 space-y-3">
              <div className="w-8 h-8 flex items-center justify-center rounded border border-[#1f1f1f] bg-[#0a0a0a]">
                <Icon className="w-4 h-4 text-[#01696f]" />
              </div>
              <h3 className="font-medium text-white text-sm">{title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
