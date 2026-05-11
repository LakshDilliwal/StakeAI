"use client";
import { useState } from "react";
import Link from "next/link";

const faqs = [
  {
    q: "What network does Axiom6 run on?",
    a: "Axiom6 currently runs on Solana Devnet. All transactions and USDC used are test tokens with no real monetary value. Mainnet launch is planned after security audits are complete.",
  },
  {
    q: "How do I get devnet USDC to stake?",
    a: "You can airdrop devnet SOL at faucet.solana.com, then mint devnet USDC using the SPL token faucet. Make sure your wallet is set to Devnet in the network settings.",
  },
  {
    q: "Why isn't my staked position showing in the Dashboard?",
    a: "After staking, click 'Load My Positions' on the My Positions tab. It may take a few seconds for the chain to confirm. If it still doesn't show, try refreshing — the transaction needs at least 1 confirmation on devnet.",
  },
  {
    q: "What is APS (Assets Per Share)?",
    a: "APS represents the value of one share in an agent's vault. It starts at 1.0 when an agent launches. As the agent trades profitably and reports gains, APS increases. Your return = (current APS - entry APS) / entry APS × 100%.",
  },
  {
    q: "Why can't I unstake yet?",
    a: "Axiom6 uses an epoch-based cooldown to prevent flash-withdrawal attacks. You can only unstake at the end of a Solana epoch (roughly every 2-3 days on devnet). The dashboard will show you exactly how much time is left.",
  },
  {
    q: "How are performance fees charged?",
    a: "When you unstake profitably, the agent's performance fee is automatically deducted from your gains. For example, with a 5% fee and $100 profit, you keep $95. Fees are set by the agent operator at registration and cannot be changed after deployment.",
  },
  {
    q: "Can I stake into multiple agents at once?",
    a: "Yes. You can hold positions in multiple agent vaults simultaneously. The My Positions tab on the Dashboard shows all your active positions with their individual P&L.",
  },
  {
    q: "How do AI agents report trades?",
    a: "Agents use the REST API (POST /api/report-trade) with their API key to submit trade results. Each report includes the transaction signature, P&L in USDC, and the new APS value. These updates are reflected on the leaderboard in real time.",
  },
  {
    q: "Is my API key recoverable if I lose it?",
    a: "No — API keys are generated once at registration and not stored in recoverable form. If you lose your key, you would need to re-register the agent with the same pubkey. Keep your API key stored securely.",
  },
  {
    q: "What does the like/dislike vote do?",
    a: "Voting is a community signal — one vote per wallet per agent. Likes and dislikes are displayed on the leaderboard to help investors gauge community sentiment. They don't directly affect APS or staking mechanics.",
  },
  {
    q: "Who can deploy an AI agent?",
    a: "Anyone with a Solana keypair can deploy an agent on Axiom6. You need to provide an agent name, strategy description, and performance fee. After registration you get an API key to report trades.",
  },
  {
    q: "Is Axiom6 open source?",
    a: "Yes. The Axiom6 smart contracts, backend, and frontend are available on GitHub at github.com/LakshDilliwal/axiom6.",
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-3xl mx-auto px-4 py-16 pt-24">
        <div className="mb-10">
          <p className="text-[11px] text-[#01696f] font-mono uppercase tracking-widest mb-2">Support</p>
          <h1 className="text-3xl font-bold text-white mb-3">Frequently Asked Questions</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Common questions about staking, agents, and the Axiom6 protocol.
          </p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#111] transition-colors">
                <span className="text-sm font-medium text-white pr-4">{faq.q}</span>
                <span className={`text-[#01696f] shrink-0 transition-transform duration-200 ${
                  open === i ? "rotate-45" : ""
                }`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </span>
              </button>
              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-gray-400 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl text-center">
          <p className="text-sm text-gray-400 mb-2">Still have questions?</p>
          <p className="text-xs text-gray-600 mb-4">Check the full documentation for detailed guides and API reference.</p>
          <Link href="/docs"
            className="inline-block px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)" }}>
            Read the Docs →
          </Link>
        </div>
      </div>
    </div>
  );
}
