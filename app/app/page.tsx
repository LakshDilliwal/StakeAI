"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, TrendingUp } from "lucide-react";
import { GlassBox } from "../components/GlassBox";

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
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#01696f] to-[#4f98a3]">
              Autonomous AI Agents
            </span>
          </h1>
          <p className="mt-4 text-gray-400 text-lg max-w-xl mx-auto">
            Back AI trading agents with real capital — without ever handing over your keys.
            Security enforced by math, not trust.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#01696f] hover:bg-[#01595e] text-white rounded-lg text-sm font-medium transition-colors">
              Explore Vaults <ArrowRight size={14} />
            </Link>
            <Link href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#2a2a2a] hover:border-[#01696f]/50 text-gray-300 hover:text-white rounded-lg text-sm font-medium transition-colors">
              Deploy Agent
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Glass Box Visualizer */}
      <section className="max-w-3xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <div className="text-center mb-4">
            <span className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">
              How it works — live simulation
            </span>
          </div>
          <div className="border border-[#1f1f1f] rounded-2xl bg-[#0d0d0d] p-6 shadow-xl shadow-black/40">
            <GlassBox
              vaultUsdc={128450.72}
              totalShares={128450720000}
              aps={1.000000}
              trades={2847}
              active={true}
            />
          </div>
          <p className="text-center text-[10px] text-gray-700 mt-3 font-mono">
            Agent signs trades via CPI · USDC never leaves the vault PDA · Output always returns to same address
          </p>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {stats.map(s => (
            <div key={s.label} className="border border-[#1f1f1f] bg-[#111] rounded-xl p-4 space-y-1">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest">{s.label}</p>
              <p className="text-xl font-bold font-mono text-white">{s.value}</p>
              <p className="text-[11px] text-[#01696f] font-mono">{s.change}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <h2 className="text-xs text-gray-600 uppercase tracking-widest font-mono text-center mb-8">
            Protocol Guarantees
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {features.map(f => (
              <div key={f.title}
                className="border border-[#1f1f1f] bg-[#111] rounded-xl p-5 space-y-3 hover:border-[#01696f]/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[#01696f]/10 flex items-center justify-center">
                  <f.icon size={16} className="text-[#01696f]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="border border-[#01696f]/20 bg-gradient-to-br from-[#01696f]/10 to-transparent rounded-2xl p-10 text-center space-y-4"
        >
          <h2 className="text-2xl font-bold text-white">
            The missing financial primitive<br />
            <span className="text-[#4f98a3]">in the agentic stack.</span>
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Everyone built the brain (ElizaOS), the hands (Agent Kit), the expense account (Agent-Cred).
            Nobody built the <span className="text-white font-medium">bank account</span>.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#01696f] hover:bg-[#01595e] text-white rounded-lg text-sm font-medium transition-colors">
              Start Staking <ArrowRight size={14} />
            </Link>
          </div>
        </motion.div>
      </section>

    </div>
  );
}
