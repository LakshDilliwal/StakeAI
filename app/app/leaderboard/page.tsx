"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";

const SORT_OPTIONS = [{label:"TVL",key:"tvl"},{label:"APY",key:"apy"},{label:"Trades",key:"trades"}];

interface Agent {
  rank: number; name: string; pubkey: string; strategy: string;
  tvl: number; apy: number; trades: number; currentAps: number; status: "active"|"paused";
}

export default function Leaderboard() {
  const [strategy, setStrategy] = useState("All");
  const [sortKey, setSortKey] = useState<"tvl"|"apy"|"trades">("tvl");
  const [sortDir, setSortDir] = useState<"desc"|"asc">("desc");
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/agents`)
      .then(r => r.json())
      .then(data => {
        setAgents((data.agents ?? []).map((a: any, i: number) => ({
          rank: i + 1,
          name: a.agentName ?? `Agent ${a.agentPubkey.slice(0, 6)}`,
          pubkey: a.agentPubkey,
          strategy: a.strategy ?? "—",
          tvl: a.tvl ?? 0,
          apy: a.apy ?? 0,
          trades: a.tradeCount ?? 0,
          currentAps: a.currentAps ?? 1,
          status: "active" as const,
        })));
      })
      .catch(() => setAgents([]))
      .finally(() => setLoading(false));
  }, []);

  const toggleWatchlist = (pk: string) =>
    setWatchlist(prev => { const s = new Set(prev); s.has(pk) ? s.delete(pk) : s.add(pk); return s; });

  const strategies = ["All", ...Array.from(new Set(agents.map(a => a.strategy)))];

  const filtered = useMemo(() => {
    let list = strategy === "All" ? [...agents] : agents.filter(a => a.strategy === strategy);
    list.sort((a, b) => sortDir === "desc" ? b[sortKey] - a[sortKey] : a[sortKey] - b[sortKey]);
    return list.map((a, i) => ({ ...a, rank: i + 1 }));
  }, [agents, strategy, sortKey, sortDir]);

  const watched = agents.filter(a => watchlist.has(a.pubkey));

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Agent Leaderboard</h1>
        <p className="text-xs text-gray-500 mt-1">Live from Axiom6 backend · Updated on every trade report</p>
      </div>

      {watched.length > 0 && (
        <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-mono">⭐ Your Watchlist</p>
          <div className="flex flex-wrap gap-2">
            {watched.map(a => (
              <Link key={a.pubkey} href={`/agent/${a.pubkey}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#111] border border-[#1f1f1f] rounded-lg hover:border-[#01696f]/40 transition-colors">
                <span className="text-xs text-white font-mono">{a.name}</span>
                <span className="text-[10px] text-[#4f98a3] font-mono">{a.currentAps.toFixed(4)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {strategies.map(s => (
            <button key={s} onClick={() => setStrategy(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${strategy === s ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10" : "border-[#1f1f1f] text-gray-500 hover:border-[#2a2a2a]"}`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {SORT_OPTIONS.map(o => (
            <button key={o.key} onClick={() => { if (o.key === sortKey) setSortDir(d => d === "desc" ? "asc" : "desc"); else { setSortKey(o.key as any); setSortDir("desc"); } }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border flex items-center gap-1 ${sortKey === o.key ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10" : "border-[#1f1f1f] text-gray-500 hover:border-[#2a2a2a]"}`}>
              {o.label}{sortKey === o.key && (sortDir === "desc" ? " ↓" : " ↑")}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_140px_100px_100px_80px_80px] px-5 py-2 border-b border-[#1a1a1a]">
          {["#","Agent","Strategy","TVL","APS","Trades",""].map((h,i) => (
            <p key={i} className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">{h}</p>
          ))}
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-600 font-mono text-sm">Loading agents...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 text-sm font-mono mb-2">No agents registered yet</p>
            <Link href="/register" className="text-xs text-[#01696f] hover:underline font-mono">Register the first agent →</Link>
          </div>
        ) : (
          <div className="divide-y divide-[#141414]">
            {filtered.map(a => (
              <div key={a.pubkey} className="grid grid-cols-[40px_1fr_140px_100px_100px_80px_80px] px-5 py-3 hover:bg-[#111] transition-colors items-center">
                <span className="text-xs text-gray-600 font-mono tabular-nums">#{a.rank}</span>
                <div>
                  <p className="text-sm text-white font-mono font-semibold">{a.name}</p>
                  <p className="text-[10px] text-gray-600 font-mono">{a.pubkey.slice(0,8)}...{a.pubkey.slice(-4)}</p>
                </div>
                <span className="text-[11px] text-gray-400 font-mono capitalize">{a.strategy}</span>
                <span className="text-sm font-mono tabular-nums text-gray-300">{a.tvl > 0 ? `$${a.tvl.toLocaleString()}` : "—"}</span>
                <span className="text-sm font-mono tabular-nums text-[#4f98a3]">{a.currentAps.toFixed(4)}</span>
                <span className="text-sm font-mono tabular-nums text-gray-400">{a.trades}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => toggleWatchlist(a.pubkey)}
                    className={`text-base transition-colors ${watchlist.has(a.pubkey) ? "text-yellow-400" : "text-gray-700 hover:text-gray-500"}`}>★</button>
                  <Link href={`/agent/${a.pubkey}`} className="text-[10px] text-[#01696f] hover:underline font-mono">View →</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {!loading && <p className="text-[10px] text-gray-700 font-mono text-center">{agents.length} agent{agents.length !== 1 ? "s" : ""} · Live data</p>}
    </main>
  );
}
