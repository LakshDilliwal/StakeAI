"use client";
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./WalletButton";
import toast from "react-hot-toast";
export function StakePanel({ agentPubkey, assetsPerShare }: { agentPubkey: string; assetsPerShare: number }) {
  const { wallet } = useWallet();
  const [amount, setAmount] = useState("");
  const [tab, setTab] = useState<"stake" | "unstake">("stake");
  const price = assetsPerShare / 1e6;
  const estimatedShares = Number(amount) ? (Number(amount) / price).toFixed(6) : "0.000000";
  const estimatedUSDC = Number(amount) ? (Number(amount) * price).toFixed(6) : "0.000000";
  const handleAction = async () => {
    if (!wallet) return toast.error("Connect wallet first");
    toast.error("Stake logic requires Anchor connection mapping to Jupiter/USDC mints.");
  };
  return (
    <div className="bg-[#111] border border-[#222] rounded p-6">
      <div className="flex border-b border-[#222] mb-6">
        <button onClick={() => setTab("stake")} className={`flex-1 pb-3 text-sm uppercase tracking-wide transition-colors ${tab === "stake" ? "text-white border-b-2 border-[#01696f]" : "text-gray-600 hover:text-gray-400"}`}>Stake USDC</button>
        <button onClick={() => setTab("unstake")} className={`flex-1 pb-3 text-sm uppercase tracking-wide transition-colors ${tab === "unstake" ? "text-white border-b-2 border-[#01696f]" : "text-gray-600 hover:text-gray-400"}`}>Unstake</button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-mono text-gray-500 mb-2">{tab === "stake" ? "AMOUNT (USDC)" : "SHARES TO BURN"}</label>
          <div className="relative">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#333] rounded px-4 py-3 font-mono text-white outline-none focus:border-[#01696f] transition-colors" placeholder="0.00" />
            <span className="absolute right-4 top-3 text-gray-500 font-mono text-sm">{tab === "stake" ? "USDC" : "SHARES"}</span>
          </div>
        </div>
        <div className="bg-[#0a0a0a] border border-[#222] rounded p-4 flex justify-between items-center">
          <span className="text-xs font-mono text-gray-500">{tab === "stake" ? "ESTIMATED SHARES" : "ESTIMATED RETURN"}</span>
          <span className="font-mono text-[#01696f]">{tab === "stake" ? estimatedShares : `$${estimatedUSDC}`}</span>
        </div>
        {!wallet ? (
          <div className="w-full pt-2 flex justify-center"><WalletButton /></div>
        ) : (
          <button onClick={handleAction} className="w-full bg-[#01696f] hover:bg-[#01595e] text-white py-3 rounded text-sm font-medium transition-colors">
            {tab === "stake" ? "Confirm Stake" : "Confirm Unstake"}
          </button>
        )}
      </div>
    </div>
  );
}
