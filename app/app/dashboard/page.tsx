"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { stakeUsdc } from "../../lib/stakeTransaction";

// Real on-chain agent pubkeys (devnet) — update these once you register more agents
const AGENT_PUBKEYS: Record<string, string> = {
  "1": "2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ",
  "2": "2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ",
  "3": "2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ",
  "4": "2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ",
  "5": "2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ",
};

const MOCK_AGENTS = [
  { id: "1", name: "Alpha-7",   apy: 18.6, tvl: 4200000, trades: 847,  status: "Active", aps: 1.186 },
  { id: "2", name: "Beta-3",    apy: 12.4, tvl: 3100000, trades: 612,  status: "Active", aps: 1.124 },
  { id: "3", name: "Gamma-1",   apy: 9.1,  tvl: 2800000, trades: 1043, status: "Active", aps: 1.091 },
  { id: "4", name: "Delta-9",   apy: 21.3, tvl: 1900000, trades: 334,  status: "Paused", aps: 1.213 },
  { id: "5", name: "Epsilon-2", apy: 6.7,  tvl: 800000,  trades: 222,  status: "Active", aps: 1.067 },
];

const MOCK_CHART = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  aps: +(1 + (i / 30) * 0.186 + (Math.random() - 0.4) * 0.01).toFixed(4),
}));

type TxState = "idle" | "loading" | "success" | "error";

export default function Dashboard() {
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const [selected, setSelected] = useState(MOCK_AGENTS[0]);
  const [stakeAmount, setStakeAmount] = useState("");
  const [tab, setTab] = useState<"vaults" | "my">("vaults");
  const [txState, setTxState] = useState<TxState>("idle");
  const [txSig, setTxSig] = useState("");
  const [txErr, setTxErr] = useState("");

  async function handleStake() {
    if (!connected || !publicKey || !signTransaction) return;
    const amt = parseFloat(stakeAmount);
    if (!amt || amt <= 0) return;

    setTxState("loading");
    setTxErr("");
    setTxSig("");

    const agentPubkey = AGENT_PUBKEYS[selected.id];
    const result = await stakeUsdc(agentPubkey, amt, {
      publicKey,
      signTransaction,
      signAllTransactions,
    });

    if (result.ok) {
      setTxState("success");
      setTxSig(result.signature);
      setStakeAmount("");
    } else {
      setTxState("error");
      // Show the most useful line from on-chain logs
      const lines = result.error.split("\n").filter(Boolean);
      const shortErr =
        lines.find((l) => l.includes("Error") || l.includes("error") || l.includes("0x")) ??
        lines[lines.length - 1] ??
        result.error;
      setTxErr(shortErr.slice(0, 220));
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {connected
              ? `Connected: ${publicKey?.toBase58().slice(0, 8)}...`
              : "Connect wallet to stake"}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Value Locked", value: "$12.8M", delta: "+12.4%" },
            { label: "Active Agents",      value: "24",     delta: "+3" },
            { label: "24h Volume",         value: "$3.29M", delta: "+8.7%" },
            { label: "Avg APY",            value: "18.6%",  delta: "+2.1%" },
          ].map((s) => (
            <div key={s.label} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{s.label}</p>
              <p className="text-xl font-bold font-mono text-white tabular-nums">{s.value}</p>
              <p className="text-[11px] font-mono mt-1 text-[#01696f]">{s.delta}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Agent list */}
          <div className="lg:col-span-1">
            <div className="flex gap-2 mb-4">
              {(["vaults", "my"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                    tab === t
                      ? "bg-[#01696f]/20 text-[#01696f] border border-[#01696f]/40"
                      : "text-gray-500 border border-[#1f1f1f] hover:border-[#333]"
                  }`}
                >
                  {t === "vaults" ? "All Vaults" : "My Positions"}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {MOCK_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => {
                    setSelected(agent);
                    setTxState("idle");
                    setStakeAmount("");
                  }}
                  className={`w-full text-left border rounded-xl p-4 transition-all duration-200 ${
                    selected.id === agent.id
                      ? "border-[#01696f]/50 bg-[#01696f]/5"
                      : "border-[#1f1f1f] bg-[#0d0d0d] hover:border-[#2a2a2a]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{agent.name}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        agent.status === "Active"
                          ? "bg-[#01696f]/15 text-[#01696f]"
                          : "bg-yellow-500/15 text-yellow-500"
                      }`}
                    >
                      {agent.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">APY</span>
                    <span className="text-xs font-mono text-green-400">{agent.apy}%</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">TVL</span>
                    <span className="text-xs font-mono text-gray-300">${(agent.tvl / 1e6).toFixed(1)}M</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Detail + stake + chart */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.name}</h2>
                  <p className="text-xs text-gray-500 font-mono mt-1">
                    {AGENT_PUBKEYS[selected.id].slice(0, 8)}...{AGENT_PUBKEYS[selected.id].slice(-6)} · {selected.trades} trades
                  </p>
                </div>
                <span className="text-2xl font-bold font-mono text-green-400">{selected.apy}%</span>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "TVL",    value: `$${(selected.tvl / 1e6).toFixed(2)}M` },
                  { label: "APS",    value: selected.aps.toFixed(4) },
                  { label: "Trades", value: selected.trades.toString() },
                ].map((m) => (
                  <div key={m.label} className="bg-[#111] rounded-lg p-3">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{m.label}</p>
                    <p className="text-sm font-mono font-bold text-white tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Stake input */}
              <div className="border-t border-[#1a1a1a] pt-4">
                <p className="text-xs text-gray-500 mb-3">Stake USDC into this vault</p>

                {/* Quick presets */}
                <div className="flex gap-2 mb-3">
                  {["100", "500", "1000"].map((v) => (
                    <button
                      key={v}
                      onClick={() => { setStakeAmount(v); setTxState("idle"); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                        stakeAmount === v
                          ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10"
                          : "border-[#1f1f1f] text-gray-500 hover:border-[#333]"
                      }`}
                    >
                      ${v}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Amount USDC"
                    value={stakeAmount}
                    onChange={(e) => { setStakeAmount(e.target.value); setTxState("idle"); }}
                    className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/60 transition-colors"
                  />
                  <button
                    disabled={!connected || !stakeAmount || txState === "loading"}
                    onClick={handleStake}
                    className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 min-w-[90px] justify-center"
                    style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)" }}
                  >
                    {txState === "loading" ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : "Stake"}
                  </button>
                </div>

                {!connected && (
                  <p className="text-[11px] text-yellow-500/70 mt-2 font-mono">⚠ Connect wallet to stake</p>
                )}

                {/* Success */}
                {txState === "success" && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-[11px] text-green-400 font-mono mb-1">✓ Staked successfully</p>
                    <a
                      href={`https://solscan.io/tx/${txSig}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-[#01696f] hover:underline font-mono break-all"
                    >
                      {txSig.slice(0, 24)}...{txSig.slice(-8)} ↗
                    </a>
                  </div>
                )}

                {/* Error */}
                {txState === "error" && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <p className="text-[11px] text-red-400 font-mono break-words">✗ {txErr}</p>
                  </div>
                )}
              </div>
            </div>

            {/* APS Chart */}
            <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-6">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-mono">
                Assets Per Share — 30d
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={MOCK_CHART} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="apsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#01696f" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#01696f" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                  <XAxis dataKey="day" tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
                  <YAxis tick={{ fill: "#555", fontSize: 10 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#888" }}
                    itemStyle={{ color: "#01696f" }}
                  />
                  <Area type="monotone" dataKey="aps" stroke="#01696f" strokeWidth={2} fill="url(#apsGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
