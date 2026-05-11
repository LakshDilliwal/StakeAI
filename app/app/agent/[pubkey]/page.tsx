"use client";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { stakeUsdc, unstakeShares } from "../../../lib/stakeTransaction";

const MOCK_APS = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`,
  aps: +(1 + (i / 30) * 0.186 + (Math.random() - 0.4) * 0.008).toFixed(4),
}));

const MOCK_PNL = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  pnl: +((Math.random() - 0.3) * 1200).toFixed(0),
}));

type TxState = "idle" | "loading" | "success" | "error";
type Mode = "stake" | "unstake";

interface AgentMeta {
  name: string; apy: number; tvl: number; trades: number;
  aps: number; hwm: number; status: string; stakers: number;
  strategy: string; performanceFeeBps: number;
}

export default function AgentDetail() {
  const { pubkey } = useParams<{ pubkey: string }>();
  const wallet = useWallet();
  const [tab, setTab] = useState<"overview" | "trades" | "stakers">("overview");
  const [mode, setMode] = useState<Mode>("stake");
  const [stakeAmt, setStakeAmt] = useState("");
  const [txState, setTxState] = useState<TxState>("idle");
  const [txSig, setTxSig] = useState("");
  const [txErr, setTxErr] = useState("");
  const [trades, setTrades] = useState<any[]>([]);
  const [agent, setAgent] = useState<AgentMeta>({
    name: "Loading...", apy: 0, tvl: 0, trades: 0,
    aps: 1, hwm: 1, status: "Active", stakers: 0,
    strategy: "—", performanceFeeBps: 0,
  });

  useEffect(() => {
    if (!pubkey) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/agents`)
      .then(r => r.json())
      .then(data => {
        const found = data.agents?.find((a: any) => a.agentPubkey === pubkey);
        if (found) setAgent({
          name: found.agentName ?? `Agent ${pubkey.slice(0, 6)}`,
          apy: found.apy ?? 0, tvl: found.tvl ?? 0,
          trades: found.tradeCount ?? 0, aps: found.currentAps ?? 1,
          hwm: found.currentAps ?? 1, status: "Active",
          stakers: found.stakers ?? 0, strategy: found.strategy ?? "—",
          performanceFeeBps: found.performanceFeeBps ?? 0,
        });
      }).catch(() => {});
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/trades/${pubkey}`)
      .then(r => r.json())
      .then(data => { if (data.trades) setTrades(data.trades); })
      .catch(() => {});
  }, [pubkey]);

  const shortKey = pubkey ? `${pubkey.slice(0, 6)}...${pubkey.slice(-4)}` : "—";

  async function handleAction() {
    if (!wallet.connected || !wallet.publicKey || !wallet.signTransaction) return;
    const amt = parseFloat(stakeAmt);
    if (!amt || amt <= 0) return;
    setTxState("loading"); setTxErr(""); setTxSig("");
    const result = mode === "stake"
      ? await stakeUsdc(pubkey ?? "", amt, { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction, signAllTransactions: wallet.signAllTransactions })
      : await unstakeShares(pubkey ?? "", Math.floor(amt * 1_000_000), { publicKey: wallet.publicKey, signTransaction: wallet.signTransaction, signAllTransactions: wallet.signAllTransactions });
    if (result.ok) { setTxState("success"); setTxSig(result.signature); setStakeAmt(""); }
    else {
      setTxState("error");
      const lines = result.error.split("\n").filter(Boolean);
      setTxErr((lines.find(l => l.includes("Error") || l.includes("0x")) ?? lines[lines.length - 1] ?? result.error).slice(0, 200));
    }
  }

  const presets = mode === "stake" ? ["100", "500", "1000"] : ["50", "100", "500"];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono mb-6">
          <a href="/dashboard" className="hover:text-gray-400 transition-colors">Dashboard</a>
          <span>/</span>
          <span className="text-gray-400">Agent {shortKey}</span>
        </div>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: "linear-gradient(135deg,#01696f30,#01696f10)", border: "1px solid #01696f40" }}>
                🤖
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{agent.name}</h1>
                <p className="text-xs text-gray-500 font-mono">{shortKey}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#01696f]/15 text-[#01696f] border border-[#01696f]/30">● {agent.status}</span>
              <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#111] text-gray-500 border border-[#1f1f1f]">{agent.strategy}</span>
              <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#111] text-gray-500 border border-[#1f1f1f]">Solana Devnet</span>
            </div>
          </div>
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5 min-w-[300px]"
            style={{ boxShadow: "inset 0 1px 0 rgba(1,105,111,0.08)" }}>
            <div className="flex gap-1 mb-4 p-1 bg-[#111] rounded-lg">
              {(["stake", "unstake"] as Mode[]).map(m => (
                <button key={m} onClick={() => { setMode(m); setStakeAmt(""); setTxState("idle"); }}
                  className={`flex-1 py-1.5 rounded-md text-xs font-mono capitalize transition-all ${mode === m ? "bg-[#01696f]/20 text-[#01696f] border border-[#01696f]/40" : "text-gray-500 hover:text-gray-300"}`}>
                  {m}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-mono">{mode === "stake" ? "Amount (USDC)" : "Shares to burn"}</p>
            <div className="flex gap-2 mb-3">
              {presets.map(v => (
                <button key={v} onClick={() => setStakeAmt(v)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono transition-all border ${stakeAmt === v ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10" : "border-[#1f1f1f] text-gray-500 hover:border-[#333]"}`}>
                  {mode === "stake" ? `$${v}` : v}
                </button>
              ))}
            </div>
            <input type="number" placeholder={mode === "stake" ? "Custom USDC amount" : "Shares to burn"}
              value={stakeAmt} onChange={e => { setStakeAmt(e.target.value); setTxState("idle"); }}
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/50 transition-colors mb-3" />
            {!wallet.connected && <p className="text-[10px] text-yellow-500/60 mb-2 text-center font-mono">⚠ Connect wallet first</p>}
            <button disabled={!wallet.connected || !stakeAmt || txState === "loading"} onClick={handleAction}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#01696f,#0c4e54)" }}>
              {txState === "loading" && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              {txState === "loading" ? "Confirming..." : mode === "stake" ? "Stake USDC" : "Unstake Shares"}
            </button>
            {txState === "success" && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-[11px] text-green-400 font-mono mb-1">✓ Transaction confirmed</p>
                <a href={`https://solscan.io/tx/${txSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-[#01696f] hover:underline font-mono break-all">{txSig.slice(0, 24)}...{txSig.slice(-8)} ↗</a>
              </div>
            )}
            {txState === "error" && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-[11px] text-red-400 font-mono break-words">✗ {txErr}</p>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "APY",          value: `${agent.apy}%`,                                          color: "#4ade80" },
            { label: "TVL",          value: agent.tvl > 0 ? `$${(agent.tvl/1e6).toFixed(2)}M` : "—",  color: "#01696f" },
            { label: "Assets/Share", value: agent.aps.toFixed(4),                                     color: "#4f98a3" },
            { label: "High Water",   value: agent.hwm.toFixed(4),                                     color: "#9945ff" },
            { label: "Total Trades", value: agent.trades.toString(),                                  color: "#2775ca" },
            { label: "Stakers",      value: agent.stakers.toString(),                                 color: "#c7843a" },
            { label: "Epoch",        value: "Daily",                                                  color: "#888" },
            { label: "Perf Fee",     value: `${((agent.performanceFeeBps ?? 0) / 100).toFixed(0)}%`,  color: "#888" },
          ].map(k => (
            <div key={k.label} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5 font-mono">{k.label}</p>
              <p className="text-lg font-bold font-mono tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-6">
          {(["overview", "trades", "stakers"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-mono capitalize transition-all border ${tab === t ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10" : "border-[#1f1f1f] text-gray-500 hover:border-[#2a2a2a]"}`}>
              {t}
            </button>
          ))}
        </div>
        {tab === "overview" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Assets Per Share — 30d</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={MOCK_APS} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#01696f" stopOpacity={0.3}/><stop offset="95%" stopColor="#01696f" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a"/>
                  <XAxis dataKey="day" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} interval={6}/>
                  <YAxis tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto","auto"]}/>
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, fontSize: 11 }} itemStyle={{ color: "#01696f" }} labelStyle={{ color: "#888" }}/>
                  <Area type="monotone" dataKey="aps" stroke="#01696f" strokeWidth={2} fill="url(#g1)" dot={false}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Daily PnL — 14d</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={MOCK_PNL} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a"/>
                  <XAxis dataKey="day" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false}/>
                  <YAxis tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#888" }}/>
                  <Bar dataKey="pnl" radius={[3,3,0,0]} fill="#01696f"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
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
        {tab === "trades" && (
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a]">
              <p className="text-xs font-mono text-gray-500">{trades.length > 0 ? `${trades.length} trades reported` : "No trades reported yet"}</p>
            </div>
            {trades.length > 0 ? (
              <div className="divide-y divide-[#141414]">
                {trades.map((t: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-[#111] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${t.pnlUsdc >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>TRADE</span>
                      <span className="text-xs text-gray-500 font-mono">{t.txSignature?.slice(0, 12)}...</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`text-sm font-mono font-bold ${t.pnlUsdc >= 0 ? "text-green-400" : "text-red-400"}`}>{t.pnlUsdc >= 0 ? "+" : ""}{(t.pnlUsdc ?? 0).toFixed(2)} USDC</span>
                      <span className="text-[11px] text-gray-600 font-mono">{new Date(t.reportedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center"><p className="text-gray-600 text-sm font-mono">No trades reported yet via SDK</p></div>
            )}
          </div>
        )}
        {tab === "stakers" && (
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-white font-semibold mb-2">{agent.stakers} Stakers</p>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">Live staker data reads from on-chain StakerReceipt PDAs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
