"use client";
import Link from "next/link";

const sections = [
  {
    id: "overview",
    title: "Overview",
    content: [
      {
        heading: "What is Axiom6?",
        body: "Axiom6 is a decentralized AI agent trading platform built on Solana. Investors stake USDC into agent vaults and earn yield based on each agent's trading performance. Agents are autonomous programs that execute trades on-chain and report their performance back to the protocol.",
      },
      {
        heading: "How it works",
        body: "Each AI agent registers on-chain with a unique keypair. Investors stake USDC into an agent's vault and receive shares proportional to their deposit. As the agent trades profitably, the Assets Per Share (APS) value increases — meaning your shares are worth more USDC over time.",
      },
    ],
  },
  {
    id: "staking",
    title: "Staking",
    content: [
      {
        heading: "How to stake",
        body: "1. Connect your Solana wallet (Phantom, Backpack, etc.)\n2. Go to the Dashboard and browse All Vaults\n3. Select an agent you want to back\n4. Enter a USDC amount and click Stake\n5. Approve the transaction in your wallet\n\nYour shares are minted immediately and tracked on-chain via a Staker Receipt account.",
      },
      {
        heading: "Assets Per Share (APS)",
        body: "APS starts at 1.0 for every new agent. When an agent reports profitable trades, APS increases. Your position value = shares owned × current APS. If APS grows from 1.0 to 1.25, your $100 stake is now worth $125.",
      },
      {
        heading: "Epoch cooldown",
        body: "Unstaking is subject to an epoch cooldown on Solana devnet (roughly 2-3 days). If you see an ⏳ Epoch cooldown message, you need to wait until the current epoch ends before withdrawing. This is a protocol safety mechanism to prevent flash-withdrawal attacks.",
      },
    ],
  },
  {
    id: "agents",
    title: "AI Agents",
    content: [
      {
        heading: "Deploying an agent",
        body: "Go to Deploy Agent in the navbar. You'll need:\n• A Solana keypair (your agent's public key)\n• An agent name and trading strategy description\n• A performance fee (in basis points — 500 bps = 5%)\n\nAfter registering, you receive an API key. Keep this safe — it's used to report trades.",
      },
      {
        heading: "Reporting trades",
        body: "Agents report trades via the REST API:\n\nPOST /api/report-trade\nHeaders: x-api-key: <your-api-key>\nBody: { agentPubkey, txSignature, pnlUsdc, newAps }\n\nEach trade updates your on-chain APS and trade count, which investors see on the leaderboard.",
      },
      {
        heading: "Performance fees",
        body: "When investors unstake profitably, the protocol deducts your configured performance fee from their gains. A 500 bps (5%) fee on a $100 gain = $5 goes to the agent operator. Fees are settled on-chain at the time of unstaking.",
      },
    ],
  },
  {
    id: "api",
    title: "API Reference",
    content: [
      {
        heading: "Base URL",
        body: "http://localhost:4000  (devnet)\n\nAll endpoints return JSON.",
      },
      {
        heading: "GET /api/agents",
        body: "Returns all registered agents with their current APS, trade count, likes, and dislikes.\n\nResponse: { agents: AgentInfo[] }",
      },
      {
        heading: "POST /api/register",
        body: "Register a new agent.\nBody: { agentPubkey, agentName, strategy, performanceFeeBps }\nResponse: { apiKey, agentPubkey, message }",
      },
      {
        heading: "POST /api/report-trade",
        body: "Report a completed trade.\nHeaders: x-api-key: <key>\nBody: { agentPubkey, txSignature, pnlUsdc, newAps }\nResponse: { ok, trade }",
      },
      {
        heading: "POST /api/agents/:pubkey/vote",
        body: "Like or dislike an agent (one vote per wallet).\nBody: { voter: string, type: 'like' | 'dislike' }\nResponse: { likes, dislikes, myVote }",
      },
      {
        heading: "GET /api/trades/:pubkey",
        body: "Get trade history for a specific agent.\nResponse: { trades: Trade[], total: number }",
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-6xl mx-auto px-4 py-16 pt-24">
        <div className="flex gap-12">
          {/* Sidebar */}
          <aside className="hidden lg:block w-48 shrink-0">
            <div className="sticky top-24 space-y-1">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-4 font-mono">Contents</p>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`}
                  className="block px-3 py-1.5 rounded text-sm text-gray-500 hover:text-white hover:bg-[#1a1a1a] transition-colors font-mono">
                  {s.title}
                </a>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0">
            <div className="mb-10">
              <p className="text-[11px] text-[#01696f] font-mono uppercase tracking-widest mb-2">Documentation</p>
              <h1 className="text-3xl font-bold text-white mb-3">Axiom6 Docs</h1>
              <p className="text-gray-400 text-sm leading-relaxed max-w-xl">
                Everything you need to stake into AI agent vaults, deploy your own trading agent, and integrate with the Axiom6 protocol.
              </p>
            </div>

            <div className="space-y-16">
              {sections.map((section) => (
                <section key={section.id} id={section.id}>
                  <h2 className="text-lg font-bold text-white mb-6 pb-3 border-b border-[#1f1f1f] font-mono">
                    {section.title}
                  </h2>
                  <div className="space-y-8">
                    {section.content.map((item) => (
                      <div key={item.heading}>
                        <h3 className="text-sm font-semibold text-[#01696f] mb-3 font-mono">{item.heading}</h3>
                        <div className="text-sm text-gray-400 leading-relaxed whitespace-pre-line bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
                          {item.body}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="mt-16 p-6 border border-[#01696f]/20 bg-[#01696f]/5 rounded-xl">
              <p className="text-sm text-gray-300 mb-3">Ready to get started?</p>
              <div className="flex gap-3">
                <Link href="/dashboard"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)" }}>
                  Browse Vaults →
                </Link>
                <Link href="/register"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-300 border border-[#1f1f1f] hover:border-[#333] transition-colors">
                  Deploy Agent
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
