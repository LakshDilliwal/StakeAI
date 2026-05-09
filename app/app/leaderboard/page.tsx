"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

const AGENTS = [
  { rank: 1, name: "Alpha-7", team: "DeFi Builder X", pubkey: "Alph...1111", status: "active", tvl: "$2.45M", pnl: "+12.4%", trades: 1247, sharpe: 2.10, fee: "15%", pnlPos: true },
  { rank: 2, name: "Momentum-X", team: "Quant Team Alpha", pubkey: "Mome...2222", status: "active", tvl: "$1.89M", pnl: "+8.7%", trades: 983, sharpe: 1.80, fee: "10%", pnlPos: true },
  { rank: 3, name: "Arb-Prime", team: "Arb Collective", pubkey: "ArbP...3333", status: "active", tvl: "$1.65M", pnl: "+6.2%", trades: 2104, sharpe: 2.40, fee: "20%", pnlPos: true },
  { rank: 4, name: "Delta-Neutral-1", team: "Delta Labs", pubkey: "Delt...4444", status: "active", tvl: "$1.42M", pnl: "-2.1%", trades: 756, sharpe: 0.20, fee: "10%", pnlPos: false },
  { rank: 5, name: "TWAP-Ghost", team: "Ghost Protocol", pubkey: "Ghos...5555", status: "paused", tvl: "$0.43M", pnl: "-4.3%", trades: 189, sharpe: -9.50, fee: "5%", pnlPos: false },
];

type SortKey = "tvl" | "pnl" | "sharpe";

export default function Leaderboard() {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused">("all");
  const [sortBy, setSortBy] = useState<SortKey>("pnl");
  const [minTvl, setMinTvl] = useState(0);

  const filtered = AGENTS.filter(a => statusFilter === "all" || a.status === statusFilter);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white">Global Leaderboard</h1>
          <p className="text-xs text-gray-500 mt-1">Track, compare, and analyze all autonomous trading agents.</p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 border border-[#1f1f1f] bg-[#111] text-gray-400 hover:text-white rounded text-xs transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-4 flex flex-wrap gap-6 items-center">
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Status</p>
          <div className="flex gap-1">
            {(["all", "active", "paused"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded text-xs capitalize transition-colors ${statusFilter === s ? "bg-[#01696f]/20 text-[#01696f] border border-[#01696f]/30" : "border border-[#1f1f1f] text-gray-400 hover:text-white"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1 flex-1 min-w-[180px]">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Min TVL (${minTvl}K)</p>
          <input type="range" min={0} max={2000} step={50} value={minTvl} onChange={e => setMinTvl(Number(e.target.value))}
            className="w-full accent-[#01696f]" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Sort By</p>
          <div className="flex gap-1">
            {(["pnl", "tvl", "sharpe"] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className={`px-3 py-1 rounded text-xs capitalize transition-colors ${sortBy === s ? "bg-[#01696f]/20 text-[#01696f] border border-[#01696f]/30" : "border border-[#1f1f1f] text-gray-400 hover:text-white"}`}>
                {s === "pnl" ? "Cumulative PnL" : s === "tvl" ? "TVL" : "Sharpe"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-[#1f1f1f] bg-[#111] rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1f1f1f] bg-[#0d0d0d]">
              {["RANK", "AGENT", "PUBKEY", "STATUS", "TVL", "PNL", "TRADES", "SHARPE", "FEE"].map(h => (
                <th key={h} className="px-4 py-3 text-[10px] text-gray-600 uppercase tracking-widest font-sans whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a] text-sm">
            {filtered.map((agent, i) => (
              <motion.tr key={agent.pubkey} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                className="hover:bg-[#141414] transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">#{agent.rank}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#01696f]/20 border border-[#01696f]/30 flex items-center justify-center text-[#01696f] text-[10px] font-bold">
                      {agent.name[0]}
                    </div>
                    <div>
                      <p className="text-white text-xs font-medium">{agent.name}</p>
                      <p className="text-gray-600 text-[10px]">{agent.team}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{agent.pubkey}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-[10px] rounded border font-mono ${agent.status === "active" ? "border-[#01696f]/40 text-[#01696f] bg-[#01696f]/10" : "border-red-900/50 text-red-400 bg-red-900/10"}`}>
                    ● {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-white">{agent.tvl}</td>
                <td className={`px-4 py-3 font-mono text-xs font-medium ${agent.pnlPos ? "text-[#01696f]" : "text-red-400"}`}>{agent.pnl}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{agent.trades.toLocaleString()}</td>
                <td className={`px-4 py-3 font-mono text-xs ${agent.sharpe > 0 ? "text-white" : "text-red-400"}`}>{agent.sharpe.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{agent.fee}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
