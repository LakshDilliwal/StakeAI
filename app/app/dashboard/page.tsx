"use client";
import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getAxiom6Program, getRegistryPDA } from "../../lib/axiom6";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

const MOCK_AGENTS = [
  { pubkey: "NexusAlph...1111", name: "Nexus Alpha", strategy: "Momentum Scalper", aum: "$2.45M", pnl: "+12.4%", winRate: 78, trades: 1247, status: "active", pnlPositive: true },
  { pubkey: "QuantPrim...2222", name: "Quant Prime", strategy: "Mean Reversion", aum: "$1.89M", pnl: "+8.7%", winRate: 72, trades: 983, status: "active", pnlPositive: true },
  { pubkey: "SigmaFlow...3333", name: "Sigma Flow", strategy: "Arbitrage Hunter", aum: "$1.65M", pnl: "+6.2%", winRate: 81, trades: 2104, status: "active", pnlPositive: true },
  { pubkey: "DeltaNeur...4444", name: "Delta Neural", strategy: "ML Trend Follow", aum: "$1.42M", pnl: "-2.1%", winRate: 65, trades: 756, status: "active", pnlPositive: false },
  { pubkey: "OmegaGrid...555", name: "Omega Grid", strategy: "Grid Trading", aum: "$1.28M", pnl: "+4.8%", winRate: 69, trades: 1893, status: "active", pnlPositive: true },
  { pubkey: "ZetaPuls...6666", name: "Zeta Pulse", strategy: "Sentiment Analysis", aum: "$0.98M", pnl: "-0.9%", winRate: 62, trades: 421, status: "active", pnlPositive: false },
  { pubkey: "ThetaSwrm...777", name: "Theta Swarm", strategy: "Multi-DEX Arb", aum: "$0.75M", pnl: "+3.1%", winRate: 74, trades: 3219, status: "active", pnlPositive: true },
  { pubkey: "KappaDrft...888", name: "Kappa Drift", strategy: "Funding Rate", aum: "$0.43M", pnl: "-4.3%", winRate: 58, trades: 189, status: "paused", pnlPositive: false },
];

const MOCK_TRADES = [
  { side: "BUY", agent: "Theta Swarm", pair: "ORCA/USDC", amount: "$49,710.72", time: "just now" },
  { side: "SELL", agent: "Omega Grid", pair: "SOL/USDC", amount: "$41,709.69", time: "34s ago" },
  { side: "SELL", agent: "Nexus Alpha", pair: "ORCA/USDC", amount: "$79,744.02", time: "4m ago" },
  { side: "BUY", agent: "Zeta Pulse", pair: "MNDE/USDC", amount: "$37,649.53", time: "9m ago" },
  { side: "BUY", agent: "Sigma Flow", pair: "JTO/USDC", amount: "$4,755", time: "12m ago" },
  { side: "BUY", agent: "Zeta Pulse", pair: "BONK/USDC", amount: "$4,772.71", time: "17m ago" },
  { side: "BUY", agent: "Theta Swarm", pair: "JTO/USDC", amount: "$10,497.19", time: "19m ago" },
  { side: "SELL", agent: "Delta Neural", pair: "SOL/USDC", amount: "$21,086.63", time: "43m ago" },
];

function generateTVLData() {
  const data = [];
  let tvl = 3500000;
  const start = new Date("2026-04-01");
  for (let i = 0; i < 38; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    tvl += (Math.random() - 0.3) * 400000;
    tvl = Math.max(tvl, 3000000);
    data.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      tvl: Math.round(tvl),
    });
  }
  data[data.length - 1].tvl = 12068345;
  return data;
}

const tvlData = generateTVLData();

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-[#111] border border-[#1f1f1f] rounded px-3 py-2">
        <p className="text-[#01696f] font-mono text-sm">${payload[0].value.toLocaleString()}</p>
        <p className="text-gray-500 text-xs">{payload[0].payload.date}</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [registryData, setRegistryData] = useState<any>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"invest" | "deploy">("invest");

  useEffect(() => {
    async function fetchStats() {
      try {
        const provider = new AnchorProvider(connection, wallet || ({} as any), { commitment: "confirmed" });
        const program = getAxiom6Program(provider);
        const [registryPDA] = getRegistryPDA();
        const registry = await (program.account as any).registry.fetch(registryPDA);
        setRegistryData(registry);
      } catch {}
    }
    fetchStats();
  }, [connection, wallet]);

  const totalTvl = registryData ? registryData.totalTvl.toNumber() / 1e6 : 12847392;
  const activeAgents = registryData ? registryData.totalAgents.toNumber() : 24;
  const protocolFee = registryData ? (registryData.protocolFeeBps / 100).toFixed(2) : "2.00";

  return (
    <div className="space-y-6 pb-12">
      {/* Page header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab("invest")}
            className={`px-4 py-1.5 rounded text-sm font-sans transition-colors border ${activeTab === "invest" ? "bg-[#01696f]/10 border-[#01696f]/40 text-[#01696f]" : "border-[#1f1f1f] text-gray-400 hover:text-white bg-[#111]"}`}>
            Invest
          </button>
          <Link href="/register"
            className={`px-4 py-1.5 rounded text-sm font-sans transition-colors border ${activeTab === "deploy" ? "bg-[#01696f]/10 border-[#01696f]/40 text-[#01696f]" : "border-[#1f1f1f] text-gray-400 hover:text-white bg-[#111]"}`}>
            Deploy Agent
          </Link>
        </div>
      </div>

      {/* TVL Chart */}
      <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-sm font-medium text-white">Vault Performance</h2>
            <p className="text-xs text-gray-500 mt-0.5">Aggregated TVL across all active AI agent vaults</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest">Current TVL</p>
            <p className="text-2xl font-mono text-white mt-0.5">${totalTvl.toLocaleString()}</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={tvlData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="tvlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#01696f" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#01696f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fill: "#4b5563", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              axisLine={false} tickLine={false} interval={6} />
            <YAxis tick={{ fill: "#4b5563", fontSize: 10, fontFamily: "var(--font-geist-mono)" }}
              axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} width={50} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="tvl" stroke="#01696f" strokeWidth={1.5} fill="url(#tvlGrad)" />
          </AreaChart>
        </ResponsiveContainer>

        {/* Stake bar */}
        <div className="mt-4 flex items-center gap-3 border-t border-[#1f1f1f] pt-4">
          <div className="relative flex-1">
            <input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)}
              placeholder="0.00" className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-4 py-2.5 font-mono text-sm text-white outline-none focus:border-[#01696f] transition-colors placeholder:text-gray-700" />
            <span className="absolute right-4 top-2.5 text-gray-500 font-mono text-xs">USDC</span>
          </div>
          <button className="px-6 py-2.5 bg-[#01696f] hover:bg-[#01595e] text-white rounded text-sm font-medium transition-colors whitespace-nowrap">
            Stake Now
          </button>
        </div>
      </div>

      {/* Agent table + Live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Agent Leaderboard */}
        <div className="lg:col-span-3 border border-[#1f1f1f] bg-[#111] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
            <div>
              <h2 className="text-sm font-medium text-white">Agent Leaderboard</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Top performing AI trading agents ranked by PnL</p>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#01696f] border border-[#01696f]/30 bg-[#01696f]/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#01696f]" />{activeAgents} Active
            </span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1f1f1f] bg-[#0d0d0d]">
                {["RANK", "AGENT", "STRATEGY", "AUM", "PNL (24H)", "WIN RATE", "STATUS"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[10px] text-gray-600 uppercase tracking-widest font-sans whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#1a1a1a]">
              {MOCK_AGENTS.map((agent, i) => (
                <tr key={agent.pubkey} className="hover:bg-[#141414] transition-colors cursor-pointer">
                  <td className="px-3 py-2.5 font-mono text-gray-600 text-xs">#{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#01696f]/20 border border-[#01696f]/30 flex items-center justify-center text-[#01696f] text-[10px] font-bold flex-shrink-0">
                        {agent.name[0]}
                      </div>
                      <span className="text-white text-xs font-medium whitespace-nowrap">{agent.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{agent.strategy}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-white">{agent.aum}</td>
                  <td className={`px-3 py-2.5 font-mono text-xs font-medium ${agent.pnlPositive ? "text-[#01696f]" : "text-red-400"}`}>{agent.pnl}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1 rounded-full bg-[#1f1f1f] max-w-[40px]">
                        <div className="h-full rounded-full bg-[#01696f]" style={{ width: `${agent.winRate}%` }} />
                      </div>
                      <span className="text-xs font-mono text-gray-400">{agent.winRate}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 text-[10px] rounded border font-mono ${agent.status === "active" ? "border-[#01696f]/40 text-[#01696f] bg-[#01696f]/10" : "border-red-900/50 text-red-400 bg-red-900/10"}`}>
                      {agent.status === "active" ? "● Active" : "● Paused"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Live Trade Feed */}
        <div className="lg:col-span-2 border border-[#1f1f1f] bg-[#111] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
            <div>
              <h2 className="text-sm font-medium text-white">Live Trade Feed</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Real-time trades from autonomous agents</p>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 border border-red-900/40 bg-red-900/10 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />LIVE
            </span>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {MOCK_TRADES.map((trade, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="px-4 py-2.5 flex items-center gap-3 hover:bg-[#141414] transition-colors">
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${trade.side === "BUY" ? "bg-[#01696f]/20 text-[#01696f]" : "bg-red-900/20 text-red-400"}`}>
                  {trade.side}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{trade.agent}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{trade.pair}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs font-mono text-white">{trade.amount}</p>
                  <p className="text-[10px] text-gray-600">{trade.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
