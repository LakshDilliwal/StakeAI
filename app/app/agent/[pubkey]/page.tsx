"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useOnChainStats } from "../../../hooks/useOnChainStats";
import { Navbar } from "../../../components/Navbar";

function fmt(n: number, d = 2) { return n.toLocaleString("en-US", { maximumFractionDigits: d }); }

export default function AgentDetail() {
  const { pubkey } = useParams<{ pubkey: string }>();
  const { stats, loading, error, refresh } = useOnChainStats(8_000);

  const aps     = stats.assetsPerShare / 1_000_000;
  const hwm     = stats.highWaterMark  / 1_000_000;
  const tvl     = stats.vaultUsdc      / 1_000_000;
  const pnl     = stats.cumulativePnl  / 1_000_000;
  const pnlPct  = hwm > 0 ? ((aps - hwm) / hwm * 100) : 0;
  const pnlSign = pnl >= 0 ? "+" : "";

  const epochEndTs  = stats.epochStart + stats.epochDuration;
  const now         = Math.floor(Date.now() / 1000);
  const secsLeft    = Math.max(0, epochEndTs - now);
  const hoursLeft   = Math.floor(secsLeft / 3600);
  const minsLeft    = Math.floor((secsLeft % 3600) / 60);
  const epochPct    = stats.epochDuration > 0
    ? Math.min(100, ((now - stats.epochStart) / stats.epochDuration) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard" className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors">← Dashboard</Link>
            </div>
            <h1 className="text-xl font-bold text-white">Axiom6 Alpha</h1>
            <p className="text-[10px] font-mono text-gray-500 mt-0.5 break-all">{pubkey}</p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`w-2 h-2 rounded-full ${stats.status === "active" ? "bg-[#01696f] animate-pulse" : "bg-red-400"}`} />
            <span className="text-[10px] text-gray-500 capitalize">{stats.status}</span>
            <button onClick={refresh} className="text-[10px] text-gray-600 hover:text-white border border-[#1f1f1f] px-2 py-1 rounded transition-colors ml-2">↻</button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Vault TVL",     value: loading ? "..." : `$${fmt(tvl)}`,            sub: "USDC" },
            { label: "Assets/Share",  value: loading ? "..." : aps.toFixed(6),             sub: `HWM: ${hwm.toFixed(6)}` },
            { label: "Total Return",  value: loading ? "..." : `${pnlSign}${fmt(pnlPct, 3)}%`, sub: "vs HWM", color: pnl >= 0 ? "#01696f" : "#f87171" },
            { label: "Total Trades",  value: loading ? "..." : stats.totalTrades.toString(), sub: "executed" },
            { label: "Cumul. PnL",    value: loading ? "..." : `${pnlSign}$${fmt(Math.abs(pnl))}`, sub: "USDC", color: pnl >= 0 ? "#01696f" : "#f87171" },
            { label: "Total Shares",  value: loading ? "..." : fmt(stats.totalShares / 1_000_000, 2), sub: "minted" },
            { label: "Perf Fee",      value: `${stats.performanceFeeBps / 100}%`,          sub: "above HWM" },
            { label: "Protocol Fee",  value: `${stats.protocolFeeBps / 100}%`,             sub: "per epoch" },
          ].map(k => (
            <div key={k.label} className="border border-[#1f1f1f] bg-[#111] rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{k.label}</p>
              <p className={`text-sm font-mono font-bold ${loading ? "text-gray-600 animate-pulse" : "text-white"}`}
                 style={k.color ? { color: k.color } : {}}>
                {k.value}
              </p>
              <p className="text-[9px] text-gray-600 mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* Epoch progress */}
        <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white">Current Epoch</h2>
            <span className="text-[10px] font-mono text-gray-400">
              {secsLeft > 0 ? `${hoursLeft}h ${minsLeft}m remaining` : "Ready to settle"}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#01696f] rounded-full transition-all duration-1000"
              style={{ width: `${epochPct}%` }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[9px] text-gray-600 font-mono">
              Started {new Date(stats.epochStart * 1000).toLocaleString()}
            </span>
            <span className="text-[9px] text-gray-600 font-mono">
              Ends {new Date(epochEndTs * 1000).toLocaleString()}
            </span>
          </div>
        </div>

        {/* On-chain links */}
        <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-5">
          <h2 className="text-sm font-semibold text-white mb-4">On-Chain Accounts</h2>
          <div className="space-y-3">
            {[
              { label: "Agent State PDA", addr: "7sKSU5AtYizppFZLBHr8Hhk1hEDLFZ8DiEYnj6yCNnS5" },
              { label: "Agent Hot-Wallet", addr: "ALb2wH7DRtFnvuF6QcrH5s4k953W6Kf1HutVatGRvAKP" },
              { label: "Vault USDC ATA",  addr: "A3gwLy3pyVs4eqNHF48iPRjaVTgbztz9EmPD1GU6ecPi" },
              { label: "Registry PDA",    addr: "AbgeR3ezgvPP9KMTNgPk3gAfWHVU3XAwYnK9X7EvVAMs" },
            ].map(a => (
              <div key={a.label} className="flex items-center justify-between border-b border-[#1a1a1a] pb-2 last:border-0 last:pb-0">
                <span className="text-[10px] text-gray-500 w-36 shrink-0">{a.label}</span>
                <a
                  href={`https://solscan.io/account/${a.addr}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-[10px] font-mono text-[#01696f] hover:text-[#4f98a3] transition-colors truncate"
                >
                  {a.addr} ↗
                </a>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="border border-red-900/40 bg-red-900/10 rounded p-3">
            <p className="text-xs font-mono text-red-400">RPC error: {error}</p>
          </div>
        )}
      </main>
    </div>
  );
}
