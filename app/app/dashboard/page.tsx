"use client";
import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { stakeUsdc, unstakeShares, deriveAgentState, deriveStakerReceipt } from "../../lib/stakeTransaction";
import { PROGRAM_ID, USDC_MINT, REGISTRY_PDA, RPC_URL } from "../../lib/constants";

const AGENT_PUBKEYS: Record<string, string> = {
  "1": "5ABdRPZsAc5yoWgiY5M2h6Nqdw4nzg6twgUmyASx6kV3",
};

const MOCK_AGENTS = [
  { id: "1", name: "Alpha-7",   apy: 18.6, tvl: 4200000, trades: 847,  status: "Active", aps: 1.186 },
];

const MOCK_CHART = Array.from({ length: 30 }, (_, i) => ({
  day: `Day ${i + 1}`,
  aps: +(1 + (i / 30) * 0.186 + (Math.random() - 0.4) * 0.01).toFixed(4),
}));

type TxState = "idle" | "loading" | "success" | "error";

interface Position {
  agentId: string;
  agentName: string;
  agentPubkey: string;
  sharesOwned: number;       // raw shares (lamport-scale)
  stakedUsdc: number;        // USDC deposited at entry (from receipt)
  currentValue: number;      // sharesOwned * currentAps / 1e6
  pnl: number;               // currentValue - stakedUsdc
  pnlPct: number;
  currentAps: number;
  receiptPda: string;
}

interface PositionLoadState {
  status: "idle" | "loading" | "loaded" | "error";
  positions: Position[];
  totalStaked: number;
  totalValue: number;
  totalPnl: number;
  error?: string;
}

export default function Dashboard() {
  const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
  const [selected, setSelected] = useState(MOCK_AGENTS[0]);
  const [stakeAmount, setStakeAmount] = useState("");
  const [tab, setTab] = useState<"vaults" | "my">("vaults");
  const [txState, setTxState] = useState<TxState>("idle");
  const [txSig, setTxSig] = useState("");
  const [txErr, setTxErr] = useState("");

  // Unstake state per position
  const [unstakeState, setUnstakeState] = useState<Record<string, TxState>>({});
  const [unstakeErr, setUnstakeErr]     = useState<Record<string, string>>({});
  const [unstakeSig, setUnstakeSig]     = useState<Record<string, string>>({});
  const [unstakePct, setUnstakePct]     = useState<Record<string, number>>({});
  const [unstakeAmt, setUnstakeAmt]     = useState<Record<string, string>>({});

  const [posState, setPosState] = useState<PositionLoadState>({
    status: "idle", positions: [], totalStaked: 0, totalValue: 0, totalPnl: 0,
  });

  // ── Fetch all positions for connected wallet ──────────────────────────────
  const fetchPositions = useCallback(async () => {
    if (!publicKey) return;
    setPosState(s => ({ ...s, status: "loading" }));
    try {
      const connection = new Connection(RPC_URL, "confirmed");
      const dummyWallet = {
        publicKey,
        signTransaction: async (t: any) => t,
        signAllTransactions: async (ts: any[]) => ts,
      };
      const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" });
      const idl = (await import("../../idl/axiom6.json")) as any;
      const program = new Program(idl, provider);

      const positions: Position[] = [];

      for (const agent of MOCK_AGENTS) {
        const agentPubkeyStr = AGENT_PUBKEYS[agent.id];
        if (!agentPubkeyStr) continue;

        try {
          const agentKey    = new PublicKey(agentPubkeyStr);
          const agentStatePda = deriveAgentState(agentKey);
          const agentStateData = await (program.account as any).agentState.fetch(agentStatePda);
          const realAgentKey   = new PublicKey(agentStateData.agentPubkey);
          const receiptPda     = deriveStakerReceipt(realAgentKey, publicKey);

          console.log(`[pda-check] ${agent.name} agentKey=${agentKey.toBase58()} realAgentKey=${realAgentKey.toBase58()} staker=${publicKey.toBase58()} receiptPda=${receiptPda.toBase58()}`);
          const receipt = await (program.account as any).stakerReceipt.fetch(receiptPda);
          console.log(`[receipt-raw] ${agent.name}`, Object.keys(receipt), Object.values(receipt).map(v => String(v)));

          console.log(`[agent-raw] ${agent.name}`, Object.keys(agentStateData));

          function bnVal(v: any): number { return BN.isBN(v) ? v.toNumber() : (v && typeof v.toNumber === 'function' ? v.toNumber() : Number(v ?? 0)); }

          const sharesOwned    = bnVal(receipt.shares);               // e.g. 4600000
          const entryAps       = bnVal(receipt.entryAssetsPerShare);  // e.g. 1000000 = 1.0x
          const currentApsRaw  = bnVal(agentStateData.assetsPerShare); // e.g. 1000000 = 1.0x
          const currentAps     = currentApsRaw / 1e6;                 // 1.0
          const stakedUsdc     = (sharesOwned * (entryAps / 1e6)) / 1e6;   // shares * entryAps / 1e12
          const currentValue   = (sharesOwned * currentAps) / 1e6;         // shares * currentAps / 1e6
          const pnl            = currentValue - stakedUsdc;
          const pnlPct        = stakedUsdc > 0 ? (pnl / stakedUsdc) * 100 : 0;

          console.log(`[pos] ${agent.name}`, { receiptPda: receiptPda.toBase58(), sharesOwned, fields: Object.keys(receipt) });
          if (sharesOwned > 0) {
            positions.push({
              agentId:      agent.id,
              agentName:    agent.name,
              agentPubkey:  agentPubkeyStr,
              sharesOwned,
              stakedUsdc,
              currentValue,
              pnl,
              pnlPct,
              currentAps,
              receiptPda:   receiptPda.toBase58(),
            });
          }
        } catch (caughtErr: any) {
          console.warn(`[pos] ${agent.name}:`, (caughtErr as any)?.message ?? String(caughtErr));
        }
      }

      const totalStaked = positions.reduce((s, p) => s + p.stakedUsdc, 0);
      const totalValue  = positions.reduce((s, p) => s + p.currentValue, 0);
      const totalPnl    = totalValue - totalStaked;

      setPosState({ status: "loaded", positions, totalStaked, totalValue, totalPnl });
    } catch (caughtErr: any) {
      setPosState(s => ({ ...s, status: "error", error: caughtErr?.message ?? String(caughtErr) }));
    }
  }, [publicKey]);

  // Auto-fetch when switching to My Positions tab
  useEffect(() => {
    if (tab === "my" && connected && publicKey && posState.status === "idle") {
      fetchPositions();
    }
  }, [tab, connected, publicKey, posState.status, fetchPositions]);

  // Re-fetch after a successful stake
  useEffect(() => {
    if (txState === "success" && tab === "my") {
      setPosState(s => ({ ...s, status: "idle" }));
      setTimeout(fetchPositions, 2000); // give chain 2s to confirm
    }
  }, [txState]);

  // ── Stake ─────────────────────────────────────────────────────────────────
  async function handleStake() {
    if (!connected || !publicKey || !signTransaction) return;
    const amt = parseFloat(stakeAmount);
    if (!amt || amt <= 0) return;

    setTxState("loading"); setTxErr(""); setTxSig("");

    const result = await stakeUsdc(AGENT_PUBKEYS[selected.id], amt, {
      publicKey, signTransaction, signAllTransactions,
    });

    if (result.ok) {
      setTxState("success");
      setTxSig(result.signature);
      setStakeAmount("");
      // Invalidate positions cache
      setPosState(s => ({ ...s, status: "idle" }));
    } else {
      setTxState("error");
      const lines = result.error.split("\n").filter(Boolean);
      const rawErr = result.error;
      let shortErr = (lines.find(l => l.includes("Error") || l.includes("0x")) ?? lines[lines.length - 1] ?? rawErr).slice(0, 220);
      if (rawErr.includes("insufficient funds") || rawErr.includes("Insufficient funds")) shortErr = "Insufficient funds";
      setTxErr(shortErr);
    }
  }

  // ── Unstake ───────────────────────────────────────────────────────────────
  async function handleUnstake(pos: Position) {
    if (!connected || !publicKey || !signTransaction) return;
    setUnstakeState(s => ({ ...s, [pos.agentId]: "loading" }));
    setUnstakeErr(s => ({ ...s, [pos.agentId]: "" }));
    setUnstakeSig(s => ({ ...s, [pos.agentId]: "" }));

    // Calculate shares to burn based on % or custom input
    const pct = unstakePct[pos.agentId] ?? 100;
    const customUsdc = parseFloat(unstakeAmt[pos.agentId] ?? "");
    let sharesToBurn: number;
    if (!isNaN(customUsdc) && customUsdc > 0) {
      // Proportional: burn fraction of shares matching USDC amount
      const fraction = customUsdc / pos.currentValue;
      sharesToBurn = Math.floor(pos.sharesOwned * fraction);
    } else {
      sharesToBurn = Math.floor(pos.sharesOwned * pct / 100);
    }
    sharesToBurn = Math.min(sharesToBurn, pos.sharesOwned); // cap at max

    const result = await unstakeShares(pos.agentPubkey, sharesToBurn, {
      publicKey, signTransaction, signAllTransactions,
    });

    if (result.ok) {
      setUnstakeState(s => ({ ...s, [pos.agentId]: "success" }));
      setUnstakeSig(s => ({ ...s, [pos.agentId]: result.signature }));
      // Refresh positions after 2s
      setTimeout(() => {
        setPosState(s => ({ ...s, status: "idle" }));
        fetchPositions();
      }, 2000);
    } else {
      setUnstakeState(s => ({ ...s, [pos.agentId]: "error" }));
      const lines = result.error.split("\n").filter(Boolean);
      const raw = result.error;
      let friendlyErr: string;
      if (raw.includes("EpochNotFinished") || raw.includes("0x177a")) {
        try {
          const conn = new Connection(RPC_URL, "confirmed");
          const epochInfo = await conn.getEpochInfo();
          const slotsLeft = epochInfo.slotsInEpoch - epochInfo.slotIndex;
          const secsLeft  = Math.floor(slotsLeft * 0.4);
          const hrs  = Math.floor(secsLeft / 3600);
          const mins = Math.floor((secsLeft % 3600) / 60);
          const timeStr = hrs > 0 ? `~${hrs}h ${mins}m` : `~${mins}m`;
          friendlyErr = `⏳ Cooldown: ${timeStr} left in this epoch. Unstaking opens when the epoch ends.`;
        } catch {
          friendlyErr = "⏳ Epoch cooldown active — try again at the next epoch.";
        }
      } else {
        friendlyErr = (lines.find(l => l.includes("Error") || l.includes("0x")) ?? lines[lines.length - 1] ?? raw).slice(0, 180);
      }
      setUnstakeErr(s => ({ ...s, [pos.agentId]: friendlyErr }));
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-sm text-gray-500">
            {connected ? `Connected: ${publicKey?.toBase58().slice(0, 8)}...` : "Connect wallet to stake"}
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

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6">
          {(["vaults", "my"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-mono transition-all ${
                tab === t
                  ? "bg-[#01696f]/20 text-[#01696f] border border-[#01696f]/40"
                  : "text-gray-500 border border-[#1f1f1f] hover:border-[#333]"
              }`}>
              {t === "vaults" ? "All Vaults" : "My Positions"}
            </button>
          ))}
          {tab === "my" && posState.status !== "idle" && (
            <button onClick={() => { setPosState(s => ({ ...s, status: "idle" })); fetchPositions(); }}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs font-mono text-gray-500 border border-[#1f1f1f] hover:border-[#333] transition-all flex items-center gap-1.5">
              <svg className={`w-3 h-3 ${posState.status === "loading" ? "animate-spin" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
              </svg>
              Refresh
            </button>
          )}
        </div>

        {/* ── ALL VAULTS TAB ─────────────────────────────────────────────── */}
        {tab === "vaults" && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Agent list */}
            <div className="lg:col-span-1 space-y-2">
              {MOCK_AGENTS.map((agent) => (
                <button key={agent.id} onClick={() => { setSelected(agent); setTxState("idle"); setStakeAmount(""); }}
                  className={`w-full text-left border rounded-xl p-4 transition-all duration-200 ${
                    selected.id === agent.id
                      ? "border-[#01696f]/50 bg-[#01696f]/5"
                      : "border-[#1f1f1f] bg-[#0d0d0d] hover:border-[#2a2a2a]"
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-white">{agent.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      agent.status === "Active" ? "bg-[#01696f]/15 text-[#01696f]" : "bg-yellow-500/15 text-yellow-500"
                    }`}>{agent.status}</span>
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

            {/* Detail + stake + chart */}
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

                <div className="border-t border-[#1a1a1a] pt-4">
                  <p className="text-xs text-gray-500 mb-3">Stake USDC into this vault</p>
                  <div className="flex gap-2 mb-3">
                    {["100", "500", "1000"].map((v) => (
                      <button key={v} onClick={() => { setStakeAmount(v); setTxState("idle"); }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                          stakeAmount === v
                            ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10"
                            : "border-[#1f1f1f] text-gray-500 hover:border-[#333]"
                        }`}>${v}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Amount USDC" value={stakeAmount}
                      onChange={(e) => { setStakeAmount(e.target.value); setTxState("idle"); }}
                      className="flex-1 bg-[#111] border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/60 transition-colors" />
                    <button disabled={!connected || !stakeAmount || txState === "loading"} onClick={handleStake}
                      className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 min-w-[90px] justify-center"
                      style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)" }}>
                      {txState === "loading"
                        ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                        : "Stake"}
                    </button>
                  </div>
                  {!connected && <p className="text-[11px] text-yellow-500/70 mt-2 font-mono">⚠ Connect wallet to stake</p>}
                  {txState === "success" && (
                    <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <p className="text-[11px] text-green-400 font-mono mb-1">✓ Staked successfully</p>
                      <a href={`https://solscan.io/tx/${txSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-[#01696f] hover:underline font-mono break-all">
                        {txSig.slice(0, 24)}...{txSig.slice(-8)} ↗
                      </a>
                    </div>
                  )}
                  {txState === "error" && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-[11px] text-red-400 font-mono break-words">✗ {txErr}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* APS Chart */}
              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-6">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 font-mono">Assets Per Share — 30d</p>
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
                    <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "#888" }} itemStyle={{ color: "#01696f" }} />
                    <Area type="monotone" dataKey="aps" stroke="#01696f" strokeWidth={2} fill="url(#apsGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ── MY POSITIONS TAB ───────────────────────────────────────────── */}
        {tab === "my" && (
          <div>
            {/* Not connected */}
            {!connected && (
              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                    <line x1="12" y1="12" x2="12" y2="16"/><circle cx="12" cy="12" r="1" fill="#555"/>
                  </svg>
                </div>
                <p className="text-gray-400 text-sm mb-1">Connect your wallet</p>
                <p className="text-gray-600 text-xs">to view your staked positions</p>
              </div>
            )}

            {/* Loading */}
            {connected && posState.status === "loading" && (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-6 animate-pulse">
                    <div className="h-4 bg-[#1a1a1a] rounded w-32 mb-3" />
                    <div className="grid grid-cols-4 gap-4">
                      {[1,2,3,4].map(j => <div key={j} className="h-8 bg-[#1a1a1a] rounded" />)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {connected && posState.status === "error" && (
              <div className="border border-red-500/20 bg-red-500/5 rounded-xl p-6 text-center">
                <p className="text-red-400 text-sm font-mono">✗ Failed to load positions</p>
                <p className="text-red-400/60 text-xs mt-1 font-mono">{posState.error}</p>
                <button onClick={fetchPositions} className="mt-4 px-4 py-2 text-xs font-mono border border-[#333] rounded-lg text-gray-400 hover:text-white transition-colors">
                  Retry
                </button>
              </div>
            )}

            {/* Loaded — no positions */}
            {connected && posState.status === "loaded" && posState.positions.length === 0 && (
              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <p className="text-gray-400 text-sm mb-1">No active positions</p>
                <p className="text-gray-600 text-xs mb-6">Stake into a vault to get started</p>
                <button onClick={() => setTab("vaults")}
                  className="px-5 py-2.5 rounded-lg text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)" }}>
                  Browse Vaults →
                </button>
              </div>
            )}

            {/* Loaded — has positions */}
            {connected && posState.status === "loaded" && posState.positions.length > 0 && (
              <div className="space-y-4">
                {/* Portfolio summary */}
                <div className="grid grid-cols-3 gap-4 mb-2">
                  {[
                    { label: "Total Staked",   value: `$${posState.totalStaked.toFixed(2)}`,  color: "text-white" },
                    { label: "Current Value",  value: `$${posState.totalValue.toFixed(2)}`,   color: "text-white" },
                    { label: "Total PnL",      value: `${posState.totalPnl >= 0 ? "+" : ""}$${posState.totalPnl.toFixed(2)}`,
                      color: posState.totalPnl >= 0 ? "text-green-400" : "text-red-400" },
                  ].map(s => (
                    <div key={s.label} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
                      <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{s.label}</p>
                      <p className={`text-lg font-bold font-mono tabular-nums ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Position cards */}
                {posState.positions.map((pos) => {
                  const uState = unstakeState[pos.agentId] ?? "idle";
                  const uSig   = unstakeSig[pos.agentId]   ?? "";
                  const uErr   = unstakeErr[pos.agentId]   ?? "";
                  return (
                    <div key={pos.agentId} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-6">
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <h3 className="text-base font-bold text-white">{pos.agentName}</h3>
                          <p className="text-[10px] font-mono text-gray-600 mt-0.5">
                            {pos.agentPubkey.slice(0, 8)}...{pos.agentPubkey.slice(-6)}
                          </p>
                        </div>
                        <span className={`text-sm font-bold font-mono tabular-nums ${pos.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {pos.pnl >= 0 ? "+" : ""}{pos.pnlPct.toFixed(2)}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                        {[
                          { label: "Staked",        value: `$${pos.stakedUsdc.toFixed(2)}`,     color: "text-white" },
                          { label: "Current Value", value: `$${pos.currentValue.toFixed(2)}`,   color: "text-white" },
                          { label: "PnL",           value: `${pos.pnl >= 0 ? "+" : ""}$${pos.pnl.toFixed(2)}`, color: pos.pnl >= 0 ? "text-green-400" : "text-red-400" },
                          { label: "APS",           value: pos.currentAps.toFixed(6),           color: "text-[#01696f]" },
                        ].map(m => (
                          <div key={m.label} className="bg-[#111] rounded-lg p-3">
                            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">{m.label}</p>
                            <p className={`text-sm font-mono font-bold tabular-nums ${m.color}`}>{m.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Shares info */}
                      <p className="text-[10px] font-mono text-gray-600 mb-4">
                        Shares: {pos.sharesOwned.toLocaleString()} · Receipt: {pos.receiptPda.slice(0, 8)}...{pos.receiptPda.slice(-6)}
                      </p>

                      {/* Unstake button */}
                      <div className="border-t border-[#1a1a1a] pt-4">
                        {uState === "success" ? (
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-[11px] text-green-400 font-mono mb-1">✓ Unstaked successfully</p>
                            <a href={`https://solscan.io/tx/${uSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                              className="text-[10px] text-[#01696f] hover:underline font-mono break-all">
                              {uSig.slice(0, 24)}...{uSig.slice(-8)} ↗
                            </a>
                          </div>
                        ) : (
                          <>
                            {/* % quick-select chips */}
                            <div className="flex gap-2 mb-3">
                              {[25, 50, 75, 100].map(pct => (
                                <button
                                  key={pct}
                                  onClick={() => {
                                    setUnstakePct(s => ({ ...s, [pos.agentId]: pct }));
                                    setUnstakeAmt(s => ({ ...s, [pos.agentId]: "" }));
                                  }}
                                  className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all border
                                    ${(unstakePct[pos.agentId] ?? 100) === pct && !unstakeAmt[pos.agentId]
                                      ? "bg-red-500/20 border-red-500/50 text-red-300"
                                      : "bg-[#1a1a1a] border-[#2a2a2a] text-[#666] hover:border-red-500/30 hover:text-red-400"}`}>
                                  {pct === 100 ? "MAX" : `${pct}%`}
                                </button>
                              ))}
                            </div>
                            {/* Custom USDC input */}
                            <div className="relative mb-3">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                max={pos.currentValue}
                                placeholder={`Amount (max $${pos.currentValue.toFixed(2)})`}
                                value={unstakeAmt[pos.agentId] ?? ""}
                                onChange={e => {
                                  setUnstakeAmt(s => ({ ...s, [pos.agentId]: e.target.value }));
                                  setUnstakePct(s => ({ ...s, [pos.agentId]: 0 }));
                                }}
                                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-red-500/40 font-mono"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#444]">USDC</span>
                            </div>
                            {/* Preview */}
                            <p className="text-[10px] text-[#555] font-mono mb-3">
                              You receive ≈ <span className="text-[#01696f]">
                                ${(() => {
                                  const pct = unstakePct[pos.agentId] ?? 100;
                                  const custom = parseFloat(unstakeAmt[pos.agentId] ?? "");
                                  if (!isNaN(custom) && custom > 0) return Math.min(custom, pos.currentValue).toFixed(2);
                                  return (pos.currentValue * pct / 100).toFixed(2);
                                })()}
                              </span> USDC
                            </p>
                            <button
                              disabled={uState === "loading"}
                              onClick={() => handleUnstake(pos)}
                              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2 border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500/40">
                              {uState === "loading"
                                ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> Unstaking...</>
                                : "Unstake"}
                            </button>
                            {uState === "error" && uErr && (
                              <p className={`text-[10px] font-mono mt-2 break-words ${uErr.includes("⏳") ? "text-yellow-400" : "text-red-400"}`}>{uErr.includes("⏳") ? uErr : `✗ ${uErr}`}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Idle — trigger load */}
            {connected && posState.status === "idle" && (
              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-12 text-center">
                <button onClick={fetchPositions}
                  className="px-6 py-3 rounded-lg text-sm font-semibold text-white flex items-center gap-2 mx-auto"
                  style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                  </svg>
                  Load My Positions
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
