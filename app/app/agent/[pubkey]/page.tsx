"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

const MOCK_TRADES = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  pair: i % 3 === 0 ? "SOL/USDC" : i % 3 === 1 ? "JTO/USDC" : "JUP/USDC",
  side: i % 2 === 0 ? "BUY" : "SELL",
  pnl: +((Math.random() - 0.35) * 800).toFixed(2),
  time: `${Math.floor(Math.random() * 23)}h ago`,
  size: `$${(Math.random() * 5000 + 500).toFixed(0)}`,
}));

const MOCK_APS = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  aps: +(1 + (i / 30) * 0.186 + (Math.random() - 0.4) * 0.008).toFixed(4),
}));

const MOCK_PNL = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  pnl: +((Math.random() - 0.3) * 1200).toFixed(0),
}));

const AGENT_META: Record<string, { name: string; apy: number; tvl: number; trades: number; aps: number; hwm: number; status: string; stakers: number }> = {
  default: { name: "Alpha-7", apy: 18.6, tvl: 4200000, trades: 847, aps: 1.1860, hwm: 1.1860, status: "Active", stakers: 312 },
};

export default function AgentDetail() {
  const { pubkey } = useParams<{ pubkey: string }>();
  const { connected } = useWallet();
  const [tab, setTab] = useState<"overview" | "trades" | "stakers">("overview");
  const [stakeAmt, setStakeAmt] = useState("");

  const agent = AGENT_META["default"];
  const shortKey = pubkey ? `${pubkey.slice(0, 6)}...${pubkey.slice(-4)}` : "2aFg...ykJ";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono mb-6">
          <a href="/dashboard" className="hover:text-gray-400 transition-colors">Dashboard</a>
          <span>/</span>
          <span className="text-gray-400">Agent {shortKey}</span>
        </div>

        {/* Hero row */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: "linear-gradient(135deg, #01696f30, #01696f10)", border: "1px solid #01696f40" }}>
                🤖
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{agent.name}</h1>
                <p className="text-xs text-gray-500 font-mono">{shortKey}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#01696f]/15 text-[#01696f] border border-[#01696f]/30">
                ● {agent.status}
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#111] text-gray-500 border border-[#1f1f1f]">
                Solana Devnet
              </span>
              <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#111] text-gray-500 border border-[#1f1f1f]">
                Jupiter CPI
              </span>
            </div>
          </div>

          {/* Stake card */}
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5 min-w-[260px]"
            style={{ boxShadow: "inset 0 1px 0 rgba(1,105,111,0.08)" }}>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-mono">Stake USDC</p>
            <div className="flex gap-2 mb-3">
              {["100", "500", "1000"].map(v => (
                <button key={v} onClick={() => setStakeAmt(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all border ${stakeAmt === v ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10" : "border-[#1f1f1f] text-gray-500 hover:border-[#333]"}`}>
                  ${v}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder="Custom amount"
              value={stakeAmt}
              onChange={e => setStakeAmt(e.target.value)}
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/50 transition-colors mb-3"
            />
            <button
              disabled={!connected || !stakeAmt}
              onClick={() => alert("Deploy program first: anchor build && anchor deploy")}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)" }}>
              {connected ? "Stake" : "Connect Wallet"}
            </button>
            {!connected && (
              <p className="text-[10px] text-yellow-500/60 mt-2 text-center font-mono">⚠ Wallet not connected</p>
            )}
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "APY",          value: `${agent.apy}%`,                       color: "#4ade80" },
            { label: "TVL",          value: `$${(agent.tvl / 1e6).toFixed(2)}M`,   color: "#01696f" },
            { label: "Assets/Share", value: agent.aps.toFixed(4),                  color: "#4f98a3" },
            { label: "High Water",   value: agent.hwm.toFixed(4),                  color: "#9945ff" },
            { label: "Total Trades", value: agent.trades.toString(),               color: "#2775ca" },
            { label: "Stakers",      value: agent.stakers.toString(),              color: "#c7843a" },
            { label: "Epoch",        value: "Daily",                               color: "#888" },
            { label: "Perf Fee",     value: "20%",                                 color: "#888" },
          ].map(k => (
            <div key={k.label} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5 font-mono">{k.label}</p>
              <p className="text-lg font-bold font-mono tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["overview", "trades", "stakers"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-mono capitalize transition-all border ${tab === t ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10" : "border-[#1f1f1f] text-gray-500 hover:border-[#2a2a2a]"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab: Overview */}
        {tab === "overview" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Assets Per Share — 30d</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={MOCK_APS} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#01696f" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#01696f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="day" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto","auto"]} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, fontSize: 11 }} itemStyle={{ color: "#01696f" }} labelStyle={{ color: "#888" }} />
                  <Area type="monotone" dataKey="aps" stroke="#01696f" strokeWidth={2} fill="url(#g1)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Daily PnL — 14d</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={MOCK_PNL} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="day" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#888" }} />
                  <Bar dataKey="pnl" radius={[3, 3, 0, 0]}
                    fill="#01696f"
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Protocol info */}
            <div className="md:col-span-2 border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Protocol Mechanics</p>
              <div className="grid md:grid-cols-3 gap-4">
                {[
                  { title: "Non-Custodial", body: "Funds held in vault PDA. Agent signs trades via CPI. USDC never leaves the PDA to an external wallet." },
                  { title: "High-Water Mark", body: "Performance fees only charged on new all-time-highs in APS. Zero fees during drawdowns." },
                  { title: "Epoch Settlement", body: "APS recalculates daily. Unstake available after 1 full epoch. Locked capital earns full yield." },
                ].map(p => (
                  <div key={p.title} className="bg-[#111] rounded-lg p-4">
                    <p className="text-xs font-semibold text-white mb-2">{p.title}</p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">{p.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Trades */}
        {tab === "trades" && (
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a]">
              <p className="text-xs font-mono text-gray-500">Recent Trades (mock — live after program deploy)</p>
            </div>
            <div className="divide-y divide-[#141414]">
              {MOCK_TRADES.map(t => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-[#111] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${t.side === "BUY" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {t.side}
                    </span>
                    <span className="text-sm font-mono text-white">{t.pair}</span>
                    <span className="text-xs text-gray-600">{t.size}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm font-mono font-bold ${t.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(2)} USDC
                    </span>
                    <span className="text-[11px] text-gray-600 font-mono">{t.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab: Stakers */}
        {tab === "stakers" && (
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-white font-semibold mb-2">{agent.stakers} Stakers</p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Live staker data available after <code className="text-[#01696f]">anchor deploy</code>.
              Reads directly from on-chain StakerReceipt PDAs.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
