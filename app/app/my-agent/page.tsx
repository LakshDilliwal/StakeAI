"use client";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletGate } from "../../components/WalletGate";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface AgentSummary {
  agentPubkey: string;
  agentName: string;
  strategy: string;
  currentAps: number;
  tradeCount: number;
  performanceFeeBps: number;
  registeredAt: number;
  apiKey: string; // stored locally in session
}

interface Trade {
  txSignature: string;
  pnlUsdc: number;
  newAps: number;
  reportedAt: number;
}

export default function MyAgentPage() {
  return (
    <WalletGate
      title="Connect your wallet"
      description="Connect the wallet you used to register your agent."
    >
      <MyAgentDashboard />
    </WalletGate>
  );
}

function MyAgentDashboard() {
  const { publicKey } = useWallet();
  const walletPubkey = publicKey?.toBase58() ?? "";

  // All agents linked to this wallet (from session + backend)
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [selectedPubkey, setSelectedPubkey] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual add API key flow
  const [showAddKey, setShowAddKey] = useState(false);
  const [manualPubkey, setManualPubkey] = useState("");
  const [manualApiKey, setManualApiKey] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Report trade
  const [txSig, setTxSig] = useState("");
  const [pnl, setPnl] = useState("");
  const [newAps, setNewAps] = useState("");
  const [reportState, setReportState] = useState<"idle"|"loading"|"success"|"error">("idle");
  const [reportMsg, setReportMsg] = useState("");

  const [tab, setTab] = useState<"overview"|"trades"|"api">("overview");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  // Load agents: first from sessionStorage, then enrich from backend
  useEffect(() => {
    if (!walletPubkey) return;
    loadAgents();
  }, [walletPubkey]);

  async function loadAgents() {
    setLoading(true);
    try {
      // 1. Get all agents from backend
      const res = await fetch(`${API}/api/agents`);
      const data = await res.json();
      const allAgents: any[] = data.agents ?? [];

      // 2. Filter agents owned by this wallet (backend now stores ownerWallet)
      const myAgentsFromBackend = allAgents.filter(
        (a: any) => a.ownerWallet === walletPubkey
      );

      // 3. Also check sessionStorage for agents deployed this session
      const sessionAgentPubkeys: string[] = JSON.parse(
        sessionStorage.getItem(`axiom6_agents_${walletPubkey}`) ?? "[]"
      );

      // 4. Merge: backend-owned + session-known
      const allPubkeys = Array.from(
        new Set([
          ...myAgentsFromBackend.map((a: any) => a.agentPubkey),
          ...sessionAgentPubkeys,
        ])
      );

      if (allPubkeys.length === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }

      // 5. Build full agent objects with API keys from session
      const enriched: AgentSummary[] = allPubkeys.map(pubkey => {
        const backendAgent = allAgents.find((a: any) => a.agentPubkey === pubkey);
        const apiKey = sessionStorage.getItem(`axiom6_apikey_${pubkey}`) ?? "";
        return {
          agentPubkey: pubkey,
          agentName: backendAgent?.agentName ?? `Agent ${pubkey.slice(0, 6)}`,
          strategy: backendAgent?.strategy ?? "—",
          currentAps: backendAgent?.currentAps ?? 1,
          tradeCount: backendAgent?.tradeCount ?? 0,
          performanceFeeBps: backendAgent?.performanceFeeBps ?? 0,
          registeredAt: backendAgent?.registeredAt ?? Date.now(),
          apiKey,
        };
      });

      setAgents(enriched);

      // Auto-select last active or first
      const last = sessionStorage.getItem(`axiom6_last_agent_${walletPubkey}`);
      const toSelect = last && allPubkeys.includes(last) ? last : allPubkeys[0];
      setSelectedPubkey(toSelect);
    } catch {
      setAgents([]);
    }
    setLoading(false);
  }

  // Load trades for selected agent
  useEffect(() => {
    if (!selectedPubkey) return;
    sessionStorage.setItem(`axiom6_last_agent_${walletPubkey}`, selectedPubkey);
    fetchTrades(selectedPubkey);
    const interval = setInterval(() => fetchTrades(selectedPubkey), 15000);
    return () => clearInterval(interval);
  }, [selectedPubkey]);

  async function fetchTrades(pubkey: string) {
    try {
      const res = await fetch(`${API}/api/trades/${pubkey}`);
      const data = await res.json();
      setTrades(data.trades ?? []);
    } catch {}
  }

  async function handleAddAgent() {
    if (!manualPubkey.trim() || !manualApiKey.trim()) return;
    setAddLoading(true);
    setAddError("");
    try {
      const verify = await fetch(`${API}/api/report-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": manualApiKey.trim() },
        body: JSON.stringify({ agentPubkey: manualPubkey.trim(), txSignature: "verify_only", pnlUsdc: 0, newAps: null }),
      });
      if (verify.status === 403) {
        setAddError("Invalid API key for this agent pubkey.");
        setAddLoading(false);
        return;
      }
      // Save to session
      const existing: string[] = JSON.parse(sessionStorage.getItem(`axiom6_agents_${walletPubkey}`) ?? "[]");
      if (!existing.includes(manualPubkey.trim())) {
        existing.push(manualPubkey.trim());
        sessionStorage.setItem(`axiom6_agents_${walletPubkey}`, JSON.stringify(existing));
      }
      sessionStorage.setItem(`axiom6_apikey_${manualPubkey.trim()}`, manualApiKey.trim());
      setShowAddKey(false);
      setManualPubkey(""); setManualApiKey("");
      await loadAgents();
    } catch {
      setAddError("Connection error.");
    }
    setAddLoading(false);
  }

  async function handleReportTrade() {
    if (!txSig || !pnl || !selectedAgent) return;
    setReportState("loading"); setReportMsg("");
    try {
      const res = await fetch(`${API}/api/report-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": selectedAgent.apiKey },
        body: JSON.stringify({
          agentPubkey: selectedPubkey,
          txSignature: txSig,
          pnlUsdc: parseFloat(pnl),
          newAps: newAps ? parseFloat(newAps) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReportState("success"); setReportMsg("Trade reported!");
        setTxSig(""); setPnl(""); setNewAps("");
        setTimeout(() => fetchTrades(selectedPubkey!), 800);
      } else {
        setReportState("error"); setReportMsg(data.error ?? "Failed.");
      }
    } catch {
      setReportState("error"); setReportMsg("Network error.");
    }
  }

  const selectedAgent = agents.find(a => a.agentPubkey === selectedPubkey);
  const apsHistory = trades.filter(t => t.newAps).map((t, i) => ({ day: `T${i+1}`, aps: t.newAps }));
  const pnlHistory = trades.map((t, i) => ({ day: `T${i+1}`, pnl: t.pnlUsdc }));
  const curlSnippet = selectedAgent ? `curl -X POST ${API}/api/report-trade \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${selectedAgent.apiKey}" \\
  -d '{
    "agentPubkey": "${selectedPubkey}",
    "txSignature": "YOUR_TX_SIGNATURE",
    "pnlUsdc": 42.50,
    "newAps": 1.0042
  }'` : "";

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#01696f]/30 border-t-[#01696f] rounded-full animate-spin" />
      </div>
    );
  }

  // ── NO AGENTS ───────────────────────────────────────────────────────────────
  if (agents.length === 0 && !showAddKey) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#1f1f1f] flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">🤖</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No agents found</h2>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            No agents are linked to this wallet. Deploy one or add an existing agent using its API key.
          </p>
          <div className="flex flex-col gap-3">
            <a href="/register"
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all text-center"
              style={{ background: "linear-gradient(135deg,#01696f,#0c4e54)" }}>
              Deploy New Agent
            </a>
            <button onClick={() => setShowAddKey(true)}
              className="px-5 py-2.5 rounded-lg text-sm font-mono text-gray-400 border border-[#1f1f1f] hover:border-[#333] hover:text-white transition-all">
              Add Existing Agent via API Key
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ADD KEY FORM ─────────────────────────────────────────────────────────────
  if (showAddKey) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <button onClick={() => { setShowAddKey(false); setAddError(""); }}
            className="flex items-center gap-2 text-xs text-gray-600 font-mono mb-6 hover:text-gray-400 transition-colors">
            ← Back
          </button>
          <h2 className="text-lg font-bold text-white mb-2">Add Existing Agent</h2>
          <p className="text-sm text-gray-500 mb-6">Enter your agent pubkey and API key from your deploy confirmation.</p>
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2 block">Agent Pubkey</label>
              <input value={manualPubkey} onChange={e => setManualPubkey(e.target.value)}
                placeholder="5ABdRPZsAc5yo..."
                className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2 block">API Key</label>
              <input value={manualApiKey} onChange={e => setManualApiKey(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono" />
            </div>
            {addError && <p className="text-[11px] text-red-400 font-mono">{addError}</p>}
            <button onClick={handleAddAgent} disabled={!manualPubkey || !manualApiKey || addLoading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg,#01696f,#0c4e54)" }}>
              {addLoading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
              {addLoading ? "Verifying..." : "Add Agent"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN DASHBOARD ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono mb-6">
          <a href="/dashboard" className="hover:text-gray-400 transition-colors">Dashboard</a>
          <span>/</span>
          <span className="text-gray-400">My Agents</span>
        </div>

        {/* Agent Selector */}
        {agents.length > 1 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-[10px] text-gray-600 font-mono uppercase tracking-wider">Your Agents:</span>
            {agents.map(a => (
              <button key={a.agentPubkey} onClick={() => { setSelectedPubkey(a.agentPubkey); setTab("overview"); setTrades([]); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                  selectedPubkey === a.agentPubkey
                    ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10"
                    : "border-[#1f1f1f] text-gray-500 hover:border-[#2a2a2a] hover:text-gray-300"
                }`}>
                {a.agentName}
              </button>
            ))}
            <button onClick={() => setShowAddKey(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono border border-dashed border-[#2a2a2a] text-gray-600 hover:text-gray-400 hover:border-[#333] transition-all">
              + Add Agent
            </button>
          </div>
        )}

        {/* Header */}
        {selectedAgent && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                style={{ background: "linear-gradient(135deg,#01696f30,#01696f10)", border: "1px solid #01696f40" }}>
                🤖
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{selectedAgent.agentName}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500 font-mono">{selectedPubkey!.slice(0,6)}...{selectedPubkey!.slice(-4)}</p>
                  <button onClick={() => copy(selectedPubkey!, "pubkey")} className="text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors">
                    {copied === "pubkey" ? "✓ copied" : "copy"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#01696f]/15 text-[#01696f] border border-[#01696f]/30">● Active</span>
              <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#111] text-gray-500 border border-[#1f1f1f]">{selectedAgent.strategy}</span>
              {agents.length === 1 && (
                <button onClick={() => setShowAddKey(true)}
                  className="text-[10px] px-3 py-1 rounded-full font-mono bg-[#111] text-gray-500 border border-[#1f1f1f] hover:text-white hover:border-[#333] transition-colors">
                  + Add Agent
                </button>
              )}
            </div>
          </div>
        )}

        {/* KPIs */}
        {selectedAgent && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {[
              { label: "Assets/Share", value: selectedAgent.currentAps.toFixed(6), color: "#4f98a3" },
              { label: "Total Trades",  value: selectedAgent.tradeCount.toString(),  color: "#01696f" },
              { label: "Perf Fee",      value: `${((selectedAgent.performanceFeeBps ?? 0) / 100).toFixed(0)}%`, color: "#888" },
              { label: "Registered",    value: new Date(selectedAgent.registeredAt).toLocaleDateString(), color: "#888" },
            ].map(k => (
              <div key={k.label} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5 font-mono">{k.label}</p>
                <p className="text-lg font-bold font-mono tabular-nums" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(["overview", "trades", "api"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-xs font-mono capitalize transition-all border ${
                tab === t ? "border-[#01696f]/50 text-[#01696f] bg-[#01696f]/10" : "border-[#1f1f1f] text-gray-500 hover:border-[#2a2a2a]"
              }`}>
              {t === "api" ? "API & Reporting" : t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-4">
            {apsHistory.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Assets Per Share</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={apsHistory}>
                      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#01696f" stopOpacity={0.3}/><stop offset="95%" stopColor="#01696f" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a"/>
                      <XAxis dataKey="day" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false} domain={["auto","auto"]}/>
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, fontSize: 11 }} itemStyle={{ color: "#01696f" }} labelStyle={{ color: "#888" }}/>
                      <Area type="monotone" dataKey="aps" stroke="#01696f" strokeWidth={2} fill="url(#g1)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">PnL Per Trade (USDC)</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={pnlHistory}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a"/>
                      <XAxis dataKey="day" tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fill: "#555", fontSize: 9 }} tickLine={false} axisLine={false}/>
                      <Tooltip contentStyle={{ background: "#111", border: "1px solid #1f1f1f", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "#888" }}/>
                      <Bar dataKey="pnl" radius={[3,3,0,0]} fill="#01696f" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#1f1f1f] flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#01696f" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <p className="text-white font-semibold mb-2">No trades yet</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">Report your first trade to see performance charts.</p>
                <button onClick={() => setTab("api")} className="text-xs px-4 py-2 rounded-lg border border-[#01696f]/40 text-[#01696f] hover:bg-[#01696f]/10 transition-colors font-mono">
                  Go to API & Reporting →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trades */}
        {tab === "trades" && (
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs font-mono text-gray-500">{trades.length > 0 ? `${trades.length} trades` : "No trades yet"}</p>
              {trades.length > 0 && (
                <span className="text-[10px] font-mono text-gray-600">
                  Total: <span className={trades.reduce((s,t) => s+t.pnlUsdc,0) >= 0 ? "text-green-400" : "text-red-400"}>
                    {trades.reduce((s,t) => s+t.pnlUsdc,0) >= 0 ? "+" : ""}{trades.reduce((s,t) => s+t.pnlUsdc,0).toFixed(2)} USDC
                  </span>
                </span>
              )}
            </div>
            {trades.length > 0 ? (
              <div className="divide-y divide-[#141414]">
                {[...trades].reverse().map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-[#111] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${t.pnlUsdc >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                        {t.pnlUsdc >= 0 ? "WIN" : "LOSS"}
                      </span>
                      <a href={`https://explorer.solana.com/tx/${t.txSignature}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-500 font-mono hover:text-[#01696f] transition-colors">
                        {t.txSignature?.length > 12 ? `${t.txSignature.slice(0,12)}...` : t.txSignature}
                      </a>
                    </div>
                    <div className="flex items-center gap-4">
                      {t.newAps && <span className="text-[11px] text-gray-600 font-mono hidden md:block">APS {t.newAps.toFixed(6)}</span>}
                      <span className={`text-sm font-mono font-bold ${t.pnlUsdc >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {t.pnlUsdc >= 0 ? "+" : ""}{(t.pnlUsdc ?? 0).toFixed(2)} USDC
                      </span>
                      <span className="text-[11px] text-gray-600 font-mono hidden md:block">{new Date(t.reportedAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center"><p className="text-gray-600 text-sm font-mono">No trades reported yet</p></div>
            )}
          </div>
        )}

        {/* API & Reporting */}
        {tab === "api" && selectedAgent && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Report a Trade</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5 block">TX Signature</label>
                  <input value={txSig} onChange={e => setTxSig(e.target.value)} placeholder="5abc..."
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5 block">PnL (USDC)</label>
                  <input value={pnl} onChange={e => setPnl(e.target.value)} type="number" placeholder="+42.50 or -10.00"
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5 block">New APS <span className="text-gray-700">(optional)</span></label>
                  <input value={newAps} onChange={e => setNewAps(e.target.value)} type="number" step="0.000001" placeholder="1.004200"
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono" />
                </div>
                <button onClick={handleReportTrade} disabled={!txSig || !pnl || reportState === "loading"}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#01696f,#0c4e54)" }}>
                  {reportState === "loading" && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                  {reportState === "loading" ? "Submitting..." : "Submit Trade"}
                </button>
                {reportState === "success" && <p className="text-[11px] text-green-400 font-mono text-center">✓ {reportMsg}</p>}
                {reportState === "error" && <p className="text-[11px] text-red-400 font-mono text-center">✗ {reportMsg}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-mono">Your API Key</p>
                {selectedAgent.apiKey ? (
                  <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2">
                    <span className="text-xs font-mono text-[#01696f] flex-1 truncate">{selectedAgent.apiKey}</span>
                    <button onClick={() => copy(selectedAgent.apiKey, "apikey")} className="text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors shrink-0">
                      {copied === "apikey" ? "✓" : "copy"}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2">
                    <p className="text-[11px] text-gray-600 font-mono">API key not in session. Add this agent again via the + Add Agent button to restore it.</p>
                  </div>
                )}
              </div>

              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">Curl Example</p>
                  <button onClick={() => copy(curlSnippet, "curl")} className="text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors">
                    {copied === "curl" ? "✓ copied" : "copy"}
                  </button>
                </div>
                <pre className="text-[10px] text-gray-400 font-mono bg-[#111] rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed">{curlSnippet}</pre>
              </div>

              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-mono">Agent Pubkey</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-400 break-all flex-1">{selectedPubkey}</span>
                  <button onClick={() => copy(selectedPubkey!, "pubkey2")} className="text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors shrink-0">
                    {copied === "pubkey2" ? "✓" : "copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
