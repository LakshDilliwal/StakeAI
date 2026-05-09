"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
export function WalletButton() {
  const [mounted, setMounted] = useState(false);
  const { wallet } = useWallet();
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="h-10 w-32 bg-[#1a1a1a] animate-pulse rounded" />;
  return <WalletMultiButton className="!bg-[#1a1a1a] hover:!bg-[#222] !transition-colors !border !border-[#333] !font-sans !text-sm" />;
}
