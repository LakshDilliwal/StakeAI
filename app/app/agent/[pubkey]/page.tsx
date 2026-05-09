"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useAnchorWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getAxiom6Program, getAgentStatePDA } from "../../../lib/axiom6";
import { WalletButton } from "../../../components/WalletButton";
import { GlassBoxVisualizer } from "../../../components/GlassBoxVisualizer";
import { StakePanel } from "../../../components/StakePanel";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
export default function AgentVault() {
  const { pubkey } = useParams();
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [agent, setAgent] = useState<any>(null);
  useEffect(() => {
    async function fetchAgent() {
      if (!pubkey) return;
      const provider = new AnchorProvider(connection, wallet || ({} as any), { commitment: "confirmed" });
      const program = getAxiom6Program(provider);
      try {
        const [pda] = getAgentStatePDA(new PublicKey(pubkey as string));
        const data = await (program.account as any).agentState.fetch(pda);
        setAgent(data);
      } catch (err) { console.error(err); }
    }
    fetchAgent();
  }, [pubkey, connection, wallet]);
  if (!agent) return <div className="h-screen flex items-center justify-center font-mono text-gray-500 animate-pulse">LOADING VAULT DATA...</div>;
  const pricePerShare = agent.assetsPerShare.toNumber() / 1e6;
  const tvl = (agent.totalShares.toNumber() * agent.assetsPerShare.toNumber()) / 1e12;
  const hwm = agent.highWaterMark.toNumber() / 1e6;
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center border-b border-[#222] pb-6">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard" className="p-2 bg-[#111] border border-[#222] rounded hover:bg-[#222] transition-colors">
            <ArrowLeft className="w-4 h-4 text-gray-400" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold font-mono text-[#01696f]">{pubkey}</h1>
              <span className="px-2 py-0.5 text-[10px] rounded border border-[#01696f] text-[#01696f] tracking-widest bg-[#01696f]/10">ACTIVE</span>
            </div>
            <p className="text-gray-500 mt-1 font-mono text-xs">DEV: {agent.developer.toBase58()}</p>
          </div>
        </div>
        <WalletButton />
      </header>
      <GlassBoxVisualizer />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="col-span-2 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "TVL (USDC)", value: `$${tvl.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
              { label: "Price/Share", value: `$${pricePerShare.toFixed(6)}` },
              { label: "High Water Mark", value: `$${hwm.toFixed(6)}` },
              { label: "Perf Fee", value: `${(agent.performanceFeeBps / 100).toFixed(1)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="border border-[#222] bg-[#111] p-5 rounded">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{label}</span>
                <div className="text-2xl font-mono mt-2">{value}</div>
              </div>
            ))}
          </div>
          <div className="border border-[#222] bg-[#111] rounded overflow-hidden">
            <div className="p-4 border-b border-[#222] bg-[#1a1a1a]">
              <h2 className="text-xs tracking-widest text-gray-400 uppercase">Recent Epoch Activity</h2>
            </div>
            <div className="p-8 flex items-center justify-center text-gray-600 font-mono text-sm">
              NO TRADES EXECUTED IN CURRENT EPOCH
            </div>
          </div>
        </div>
        <div><StakePanel agentPubkey={pubkey as string} assetsPerShare={agent.assetsPerShare.toNumber()} /></div>
      </div>
    </div>
  );
}
