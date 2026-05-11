"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletButton } from "./WalletButton";

interface WalletGateProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export function WalletGate({
  children,
  title = "Connect your wallet",
  description = "You need to connect a Solana wallet to access this page.",
}: WalletGateProps) {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          {/* Lock icon */}
          <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#1f1f1f] flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#01696f" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">{description}</p>

          <div className="flex justify-center">
            <WalletButton />
          </div>

          <p className="text-[11px] text-gray-700 mt-6 font-mono">
            Supports Phantom, Backpack, Solflare and more
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
