"use client";
import { useState, useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletGate } from "../../components/WalletGate";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Agent {
  agentName: string;
  strategy: string;
  performanceFeeBps: number;
  currentAps: number;
  tradeCount: number;
  registeredAt: number;
  trades: Trade[];
  votes: { likes: number; dislikes: number };
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
      description="Connect the wallet you used to register your agent. We'll look up your agent using your wallet pubkey."
    >
      <MyAgentDashboard />
    </WalletGate>
  );
}

function MyAgentDashboard() {
  const { publicKey } = useWallet();
  const walletPubkey = publicKey?.toBase58() ?? "";

  // Step 1: enter API key
  const [apiKey, setApiKey] = useState("");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Agent data
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agentPubkey, setAgentPubkey] = useState("");

  // Report trade form
  const [txSig, setTxSig] = useState("");
  const [pnl, setPnl] = useState("");
  const [newAps, setNewAps] = useState("");
  const [reportState, setReportState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [reportMsg, setReportMsg] = useState("");

  // Copy states
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "trades" | "api">("overview");

  // Try to restore API key from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(`axiom6_apikey_${walletPubkey}`);
    const savedPubkey = sessionStorage.getItem(`axiom6_agentpubkey_${walletPubkey}`);
    if (saved && savedPubkey) {
      setApiKey(saved);
      setAgentPubkey(savedPubkey);
    }
  }, [walletPubkey]);

  // Fetch agent data when apiKey + agentPubkey are known
  useEffect(() => {
    if (!apiKey || !agentPubkey) return;
    fetchAgent();
    const interval = setInterval(fetchAgent, 15000);
    return () => clearInterval(interval);
  }, [apiKey, agentPubkey]);

  async function fetchAgent() {
    try {
      const res = await fetch(`${API}/api/agents/${agentPubkey}`);
      if (!res.ok) return;
      const data = await res.json();
      const trades = await fetch(`${API}/api/trades/${agentPubkey}`).then(r => r.json()).catch(() => ({ trades: [] }));
      setAgent({ ...data, trades: trades.trades ?? [] });
    } catch {}
  }

  async function handleAuth() {
    if (!apiKeyInput.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      // Find which agent belongs to this wallet by trying all agents
      const res = await fetch(`${API}/api/agents`);
      const data = await res.json();
      // We verify by calling report-trade with a dry-run approach:
      // Instead, just try fetching agents and finding one that responds to our key
      // Real auth: we test the key by POSTing a trade with the provided key and agentPubkey
      // User must also enter their agent pubkey — we'll find it by checking all agents registered
      // For UX we derive it from the agents list filtered by wallet OR show an input
      // Simple approach: check stored agentPubkey, or pick the only one matching wallet
      // Since we don't store wallet→agent mapping server-side, ask user for pubkey too.
      // Check if we have a stored pubkey from the registration flow
      const storedPubkey = sessionStorage.getItem(`axiom6_agentpubkey_${walletPubkey}`);
      if (!storedPubkey) {
        // Try to find from agents list — look for recently registered
        const agents = data.agents ?? [];
        if (agents.length === 0) {
          setAuthError("No agents found. Deploy an agent first.");
          setAuthLoading(false);
          return;
        }
        // We can't determine ownership without server-side wallet mapping.
        // Show pubkey input instead
        setAuthError("enter_pubkey");
        setAuthLoading(false);
        return;
      }
      // Verify key by hitting report-trade with 0 values — it will 403 if wrong
      const verify = await fetch(`${API}/api/report-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKeyInput.trim() },
        body: JSON.stringify({ agentPubkey: storedPubkey, txSignature: "verify_only", pnlUsdc: 0, newAps: null }),
      });
      if (verify.status === 403) {
        setAuthError("Invalid API key. Check and try again.");
        setAuthLoading(false);
        return;
      }
      // Authenticated
      setApiKey(apiKeyInput.trim());
      setAgentPubkey(storedPubkey);
      sessionStorage.setItem(`axiom6_apikey_${walletPubkey}`, apiKeyInput.trim());
    } catch {
      setAuthError("Connection error. Is the backend running?");
    }
    setAuthLoading(false);
  }

  async function handleAuthWithPubkey(pubkey: string) {
    if (!apiKeyInput.trim() || !pubkey.trim()) return;
    setAuthLoading(true);
    setAuthError("");
    try {
      const verify = await fetch(`${API}/api/report-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKeyInput.trim() },
        body: JSON.stringify({ agentPubkey: pubkey.trim(), txSignature: "verify_only", pnlUsdc: 0, newAps: null }),
      });
      if (verify.status === 403) {
        setAuthError("Invalid API key for this agent. Double-check both fields.");
        setAuthLoading(false);
        return;
      }
      setApiKey(apiKeyInput.trim());
      setAgentPubkey(pubkey.trim());
      sessionStorage.setItem(`axiom6_apikey_${walletPubkey}`, apiKeyInput.trim());
      sessionStorage.setItem(`axiom6_agentpubkey_${walletPubkey}`, pubkey.trim());
    } catch {
      setAuthError("Connection error.");
    }
    setAuthLoading(false);
  }

  async function handleReportTrade() {
    if (!txSig || !pnl) return;
    setReportState("loading");
    setReportMsg("");
    try {
      const res = await fetch(`${API}/api/report-trade`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          agentPubkey,
          txSignature: txSig,
          pnlUsdc: parseFloat(pnl),
          newAps: newAps ? parseFloat(newAps) : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setReportState("success");
        setReportMsg("Trade reported successfully!");
        setTxSig(""); setPnl(""); setNewAps("");
        setTimeout(fetchAgent, 1000);
      } else {
        setReportState("error");
        setReportMsg(data.error ?? "Failed to report trade.");
      }
    } catch {
      setReportState("error");
      setReportMsg("Network error.");
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  // ── NOT AUTHENTICATED ─────────────────────────────────────────────────────
  if (!apiKey) {
    return <AuthScreen
      apiKeyInput={apiKeyInput}
      setApiKeyInput={setApiKeyInput}
      authError={authError}
      authLoading={authLoading}
      onAuth={handleAuth}
      onAuthWithPubkey={handleAuthWithPubkey}
    />;
  }

  // ── LOADING AGENT ─────────────────────────────────────────────────────────
  if (!agent) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#01696f]/30 border-t-[#01696f] rounded-full animate-spin" />
      </div>
    );
  }

  // ── DASHBOARD ─────────────────────────────────────────────────────────────
  const shortPubkey = `${agentPubkey.slice(0, 6)}...${agentPubkey.slice(-4)}`;
  const apsHistory = agent.trades.length > 0
    ? agent.trades.map((t, i) => ({ day: `T${i + 1}`, aps: t.newAps }))
    : [];
  const pnlHistory = agent.trades.length > 0
    ? agent.trades.map((t, i) => ({ day: `T${i + 1}`, pnl: t.pnlUsdc }))
    : [];

  const curlSnippet = `curl -X POST ${API}/api/report-trade \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -d '{
    "agentPubkey": "${agentPubkey}",
    "txSignature": "YOUR_TX_SIGNATURE",
    "pnlUsdc": 42.50,
    "newAps": 1.0042
  }'`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono mb-6">
          <a href="/dashboard" className="hover:text-gray-400 transition-colors">Dashboard</a>
          <span>/</span>
          <span className="text-gray-400">My Agent</span>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: "linear-gradient(135deg,#01696f30,#01696f10)", border: "1px solid #01696f40" }}>
              🤖
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{agent.agentName}</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500 font-mono">{shortPubkey}</p>
                <button onClick={() => copy(agentPubkey, "pubkey")}
                  className="text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors">
                  {copied === "pubkey" ? "✓ copied" : "copy"}
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#01696f]/15 text-[#01696f] border border-[#01696f]/30">● Active</span>
            <span className="text-[10px] px-2 py-1 rounded-full font-mono bg-[#111] text-gray-500 border border-[#1f1f1f]">{agent.strategy}</span>
            <button onClick={() => { setApiKey(""); sessionStorage.removeItem(`axiom6_apikey_${walletPubkey}`); }}
              className="text-[10px] px-3 py-1 rounded-full font-mono bg-[#111] text-gray-500 border border-[#1f1f1f] hover:text-red-400 hover:border-red-400/30 transition-colors">
              Sign out
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Assets/Share", value: agent.currentAps.toFixed(6), color: "#4f98a3" },
            { label: "Total Trades",  value: agent.tradeCount.toString(),  color: "#01696f" },
            { label: "Perf Fee",      value: `${((agent.performanceFeeBps ?? 0) / 100).toFixed(0)}%`, color: "#888" },
            { label: "Registered",    value: new Date(agent.registeredAt).toLocaleDateString(), color: "#888" },
          ].map(k => (
            <div key={k.label} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1.5 font-mono">{k.label}</p>
              <p className="text-lg font-bold font-mono tabular-nums" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>

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

        {/* Overview Tab */}
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
                      <Bar dataKey="pnl" radius={[3,3,0,0]}
                        fill="#01696f"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#111] border border-[#1f1f1f] flex items-center justify-center mx-auto mb-4">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#01696f" strokeWidth="1.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <p className="text-white font-semibold mb-2">No trades yet</p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mb-4">Report your first trade via the API & Reporting tab to see your performance charts.</p>
                <button onClick={() => setTab("api")}
                  className="text-xs px-4 py-2 rounded-lg border border-[#01696f]/40 text-[#01696f] hover:bg-[#01696f]/10 transition-colors font-mono">
                  Go to API & Reporting →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Trades Tab */}
        {tab === "trades" && (
          <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <p className="text-xs font-mono text-gray-500">
                {agent.trades.length > 0 ? `${agent.trades.length} trades reported` : "No trades reported yet"}
              </p>
              {agent.trades.length > 0 && (
                <span className="text-[10px] font-mono text-gray-600">
                  Total PnL: <span className={agent.trades.reduce((s, t) => s + t.pnlUsdc, 0) >= 0 ? "text-green-400" : "text-red-400"}>
                    {agent.trades.reduce((s, t) => s + t.pnlUsdc, 0) >= 0 ? "+" : ""}{agent.trades.reduce((s, t) => s + t.pnlUsdc, 0).toFixed(2)} USDC
                  </span>
                </span>
              )}
            </div>
            {agent.trades.length > 0 ? (
              <div className="divide-y divide-[#141414]">
                {[...agent.trades].reverse().map((t, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-[#111] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                        t.pnlUsdc >= 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                      }`}>{t.pnlUsdc >= 0 ? "WIN" : "LOSS"}</span>
                      <a href={`https://explorer.solana.com/tx/${t.txSignature}?cluster=devnet`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-gray-500 font-mono hover:text-[#01696f] transition-colors">
                        {t.txSignature?.length > 12 ? `${t.txSignature.slice(0, 12)}...` : t.txSignature}
                      </a>
                    </div>
                    <div className="flex items-center gap-4">
                      {t.newAps && <span className="text-[11px] text-gray-600 font-mono">APS {t.newAps.toFixed(6)}</span>}
                      <span className={`text-sm font-mono font-bold ${
                        t.pnlUsdc >= 0 ? "text-green-400" : "text-red-400"
                      }`}>{t.pnlUsdc >= 0 ? "+" : ""}{(t.pnlUsdc ?? 0).toFixed(2)} USDC</span>
                      <span className="text-[11px] text-gray-600 font-mono hidden md:block">
                        {new Date(t.reportedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-600 text-sm font-mono">No trades reported yet</p>
              </div>
            )}
          </div>
        )}

        {/* API & Reporting Tab */}
        {tab === "api" && (
          <div className="grid md:grid-cols-2 gap-4">

            {/* Manual trade report */}
            <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Report a Trade</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5 block">TX Signature</label>
                  <input value={txSig} onChange={e => setTxSig(e.target.value)}
                    placeholder="5abc..."
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5 block">PnL (USDC)</label>
                  <input value={pnl} onChange={e => setPnl(e.target.value)} type="number"
                    placeholder="+42.50 or -10.00"
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1.5 block">New APS <span className="text-gray-700">(optional)</span></label>
                  <input value={newAps} onChange={e => setNewAps(e.target.value)} type="number" step="0.000001"
                    placeholder="1.004200"
                    className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono" />
                </div>
                <button onClick={handleReportTrade}
                  disabled={!txSig || !pnl || reportState === "loading"}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#01696f,#0c4e54)" }}>
                  {reportState === "loading" && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                  {reportState === "loading" ? "Submitting..." : "Submit Trade"}
                </button>
                {reportState === "success" && (
                  <p className="text-[11px] text-green-400 font-mono text-center">✓ {reportMsg}</p>
                )}
                {reportState === "error" && (
                  <p className="text-[11px] text-red-400 font-mono text-center">✗ {reportMsg}</p>
                )}
              </div>
            </div>

            {/* API key + curl */}
            <div className="space-y-4">
              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-mono">Your API Key</p>
                <div className="flex items-center gap-2 bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2">
                  <span className="text-xs font-mono text-[#01696f] flex-1 truncate">{apiKey}</span>
                  <button onClick={() => copy(apiKey, "apikey")}
                    className="text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors shrink-0">
                    {copied === "apikey" ? "✓ copied" : "copy"}
                  </button>
                </div>
                <p className="text-[10px] text-gray-700 font-mono mt-2">Keep this secret. It authenticates all trade reports.</p>
              </div>

              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] text-gray-600 uppercase tracking-widest font-mono">Curl Example</p>
                  <button onClick={() => copy(curlSnippet, "curl")}
                    className="text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors">
                    {copied === "curl" ? "✓ copied" : "copy"}
                  </button>
                </div>
                <pre className="text-[10px] text-gray-400 font-mono bg-[#111] rounded-lg p-3 overflow-x-auto whitespace-pre leading-relaxed">{curlSnippet}</pre>
              </div>

              <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2 font-mono">Agent Pubkey</p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-gray-400 break-all flex-1">{agentPubkey}</span>
                  <button onClick={() => copy(agentPubkey, "pubkey2")}
                    className="text-[10px] text-gray-600 hover:text-gray-400 font-mono transition-colors shrink-0">
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

// ── Auth Screen ────────────────────────────────────────────────────────────
function AuthScreen({ apiKeyInput, setApiKeyInput, authError, authLoading, onAuth, onAuthWithPubkey }: {
  apiKeyInput: string;
  setApiKeyInput: (v: string) => void;
  authError: string;
  authLoading: boolean;
  onAuth: () => void;
  onAuthWithPubkey: (pubkey: string) => void;
}) {
  const [pubkeyInput, setPubkeyInput] = useState("");
  const needPubkey = authError === "enter_pubkey";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#111] border border-[#1f1f1f] flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#01696f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">My Agent</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Enter your API key to access your agent dashboard, view trade history, and report trades.
          </p>
        </div>

        <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2 block">API Key</label>
            <input
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !needPubkey && onAuth()}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono"
            />
          </div>

          {needPubkey && (
            <div>
              <label className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-2 block">Agent Pubkey</label>
              <input
                value={pubkeyInput}
                onChange={e => setPubkeyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onAuthWithPubkey(pubkeyInput)}
                placeholder="5ABdRPZsAc5yo..."
                className="w-full bg-[#111] border border-[#1f1f1f] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#01696f]/50 transition-colors font-mono"
              />
              <p className="text-[10px] text-gray-600 font-mono mt-1.5">Found on your deploy confirmation screen.</p>
            </div>
          )}

          {authError && authError !== "enter_pubkey" && (
            <p className="text-[11px] text-red-400 font-mono">{authError}</p>
          )}

          <button
            onClick={needPubkey ? () => onAuthWithPubkey(pubkeyInput) : onAuth}
            disabled={!apiKeyInput || authLoading || (needPubkey && !pubkeyInput)}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#01696f,#0c4e54)" }}
          >
            {authLoading && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
            {authLoading ? "Verifying..." : "Access Dashboard"}
          </button>

          <p className="text-[10px] text-gray-700 font-mono text-center">
            Don't have an agent? <a href="/register" className="text-[#01696f] hover:underline">Deploy one →</a>
          </p>
        </div>
      </div>
    </div>
  );
}
