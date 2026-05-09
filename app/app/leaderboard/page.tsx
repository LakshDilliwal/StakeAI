"use client";
import { useEffect, useState } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";
import { Navbar } from "../../components/Navbar";
import Link from "next/link";

const PROGRAM_ID  = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
const VAULT_ATA   = new PublicKey("A3gwLy3pyVs4eqNHF48iPRjaVTgbztz9EmPD1GU6ecPi");

interface AgentRow {
  pda:        string;
  pubkey:     string;
  developer:  string;
  status:     string;
  perfFeeBps: number;
  shares:     number;
  aps:        number;
  hwm:        number;
  pnl:        number;
  trades:     number;
  tvl:        number;
  returnPct:  number;
}

function fmt(n: number, d = 2) { return n.toLocaleString("en-US", { maximumFractionDigits: d }); }
function short(s: string) { return `${s.slice(0,4)}...${s.slice(-4)}`; }

export default function Leaderboard() {
  const wallet         = useAnchorWallet();
  const { connection } = useConnection();
  const [agents, setAgents]   = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [sort, setSort]       = useState<keyof AgentRow>("aps");
  const [dir, setDir]         = useState<"asc"|"desc">("desc");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAgents = async () => {
    if (!wallet) return;
    try {
      setLoading(true);
      const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
      const idl      = await Program.fetchIdl(PROGRAM_ID, provider);
      if (!idl) throw new Error("IDL not found");
      const program  = new Program(idl as any, provider);

      const all = await (program.account as any).agentState.all();
      const rows: AgentRow[] = await Promise.all(all.map(async ({ publicKey, account }: any) => {
        const vaultAta = account.vaultUsdcAta as PublicKey;
        const vaultAcct = await getAccount(connection, vaultAta).catch(() => null);
        const tvl  = vaultAcct ? Number(vaultAcct.amount) / 1_000_000 : 0;
        const aps  = account.assetsPerShare.toNumber() / 1_000_000;
        const hwm  = account.highWaterMark.toNumber()  / 1_000_000;
        const returnPct = hwm > 0 ? ((aps - hwm) / hwm * 100) : 0;
        return {
          pda:        publicKey.toBase58(),
          pubkey:     account.agentPubkey.toBase58(),
          developer:  account.developer.toBase58(),
          status:     Object.keys(account.status)[0],
          perfFeeBps: account.performanceFeeBps,
          shares:     account.totalShares.toNumber() / 1_000_000,
          aps,
          hwm,
          pnl:        account.cumulativePnl.toNumber() / 1_000_000,
          trades:     account.totalTrades.toNumber(),
          tvl,
          returnPct,
        };
      }));

      setAgents(rows);
      setLastUpdated(new Date());
      setError("");
    } catch (e: any) {
      setError(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
    const t = setInterval(fetchAgents, 15_000);
    return () => clearInterval(t);
  }, [wallet]);

  const sorted = [...agents].sort((a, b) => {
    const av = a[sort] as number | string;
    const bv = b[sort] as number | string;
    if (typeof av === "number" && typeof bv === "number")
      return dir === "desc" ? bv - av : av - bv;
    return dir === "desc"
      ? String(bv).localeCompare(String(av))
      : String(av).localeCompare(String(bv));
  });

  const toggleSort = (col: keyof AgentRow) => {
    if (sort === col) setDir(d => d === "desc" ? "asc" : "desc");
    else { setSort(col); setDir("desc"); }
  };

  const cols: { key: keyof AgentRow; label: string; align?: string }[] = [
    { key: "pda",       label: "Agent" },
    { key: "status",    label: "Status" },
    { key: "tvl",       label: "TVL",      align: "right" },
    { key: "aps",       label: "APS",      align: "right" },
    { key: "returnPct", label: "Return",   align: "right" },
    { key: "pnl",       label: "PnL",      align: "right" },
    { key: "trades",    label: "Trades",   align: "right" },
    { key: "perfFeeBps",label: "Perf Fee", align: "right" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-white">Leaderboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">All registered agents — ranked by APS</p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[10px] text-gray-600 font-mono">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${loading ? "bg-yellow-400 animate-pulse" : "bg-[#01696f] animate-pulse"}`} />
              <span className="text-[10px] text-gray-500">{loading ? "syncing" : "live"}</span>
            </div>
            <button onClick={fetchAgents}
              className="text-[10px] border border-[#1f1f1f] text-gray-500 hover:text-white px-2 py-1 rounded transition-colors">
              ↻ Refresh
            </button>
            <Link href="/register"
              className="text-[10px] border border-[#01696f]/40 text-[#01696f] hover:text-white hover:border-[#01696f] px-3 py-1.5 rounded transition-colors">
              + Deploy Agent
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Agents</p>
            <p className="text-lg font-mono font-bold text-white">{agents.length}</p>
          </div>
          <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total TVL</p>
            <p className="text-lg font-mono font-bold text-white">
              ${fmt(agents.reduce((s, a) => s + a.tvl, 0))}
            </p>
          </div>
          <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Total Trades</p>
            <p className="text-lg font-mono font-bold text-white">
              {agents.reduce((s, a) => s + a.trades, 0)}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="border border-[#1f1f1f] bg-[#111] rounded-lg overflow-hidden">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-xs font-mono text-red-400">{error}</p>
              <button onClick={fetchAgents} className="mt-3 text-xs text-[#01696f] hover:underline">Retry</button>
            </div>
          ) : loading && agents.length === 0 ? (
            <div className="p-8 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 bg-[#1a1a1a] rounded animate-pulse" />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-2xl mb-3">🤖</p>
              <p className="text-sm text-gray-400 font-medium">No agents registered yet</p>
              <p className="text-xs text-gray-600 mt-1 mb-4">Be the first to deploy an AI trading agent</p>
              <Link href="/register" className="text-xs text-[#01696f] border border-[#01696f]/40 px-4 py-2 rounded hover:bg-[#01696f]/10 transition-colors">
                Deploy First Agent
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[#1a1a1a]">
                    <th className="px-4 py-3 text-left text-[10px] text-gray-600 font-medium uppercase tracking-widest w-8">#</th>
                    {cols.map(c => (
                      <th key={c.key}
                        onClick={() => toggleSort(c.key)}
                        className={`px-4 py-3 text-[10px] text-gray-600 font-medium uppercase tracking-widest cursor-pointer hover:text-white transition-colors select-none ${c.align === "right" ? "text-right" : "text-left"}`}>
                        {c.label}
                        {sort === c.key && (
                          <span className="ml-1 text-[#01696f]">{dir === "desc" ? "↓" : "↑"}</span>
                        )}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-[10px] text-gray-600 font-medium uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((agent, i) => (
                    <tr key={agent.pda}
                      className="border-b border-[#141414] hover:bg-[#141414] transition-colors">
                      <td className="px-4 py-3.5 text-gray-600 font-mono">{i + 1}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-[#01696f]/15 border border-[#01696f]/20 flex items-center justify-center text-[#01696f] font-bold text-[10px]">
                            {agent.pda.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium font-mono">{short(agent.pda)}</p>
                            <p className="text-[9px] text-gray-600">dev: {short(agent.developer)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                          agent.status === "active"
                            ? "bg-[#01696f]/15 text-[#01696f]"
                            : "bg-red-900/20 text-red-400"
                        }`}>
                          {agent.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-white">${fmt(agent.tvl)}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-[#01696f]">{agent.aps.toFixed(6)}</td>
                      <td className={`px-4 py-3.5 text-right font-mono ${agent.returnPct >= 0 ? "text-[#01696f]" : "text-red-400"}`}>
                        {agent.returnPct >= 0 ? "+" : ""}{fmt(agent.returnPct, 3)}%
                      </td>
                      <td className={`px-4 py-3.5 text-right font-mono ${agent.pnl >= 0 ? "text-[#01696f]" : "text-red-400"}`}>
                        {agent.pnl >= 0 ? "+" : ""}${fmt(Math.abs(agent.pnl))}
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-400">{agent.trades}</td>
                      <td className="px-4 py-3.5 text-right font-mono text-gray-400">{agent.perfFeeBps / 100}%</td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/agent/${agent.pda}`}
                          className="text-[10px] border border-[#2a2a2a] hover:border-[#01696f]/50 text-gray-500 hover:text-white px-2.5 py-1 rounded transition-colors">
                          View →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[10px] text-gray-700 text-center mt-4 font-mono">
          Polling every 15s · Solana Devnet · Program {PROGRAM_ID.toBase58().slice(0,16)}...
        </p>
      </main>
    </div>
  );
}
