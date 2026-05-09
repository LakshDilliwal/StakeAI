import { useEffect, useState, useCallback } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { getAccount } from "@solana/spl-token";

const PROGRAM_ID    = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
const AGENT_PDA     = new PublicKey("7sKSU5AtYizppFZLBHr8Hhk1hEDLFZ8DiEYnj6yCNnS5");
const REGISTRY_PDA  = new PublicKey("AbgeR3ezgvPP9KMTNgPk3gAfWHVU3XAwYnK9X7EvVAMs");
const VAULT_ATA     = new PublicKey("A3gwLy3pyVs4eqNHF48iPRjaVTgbztz9EmPD1GU6ecPi");

export interface ChainStats {
  totalAgents: number;
  totalTvl: number;
  protocolFeeBps: number;
  status: string;
  performanceFeeBps: number;
  totalShares: number;
  assetsPerShare: number;
  highWaterMark: number;
  cumulativePnl: number;
  totalTrades: number;
  epochStart: number;
  epochDuration: number;
  vaultUsdc: number;
  yourShares: number;
  entryAps: number;
  unlockAt: number;
}

const EMPTY: ChainStats = {
  totalAgents: 0, totalTvl: 0, protocolFeeBps: 100,
  status: "active", performanceFeeBps: 2000,
  totalShares: 0, assetsPerShare: 1_000_000, highWaterMark: 1_000_000,
  cumulativePnl: 0, totalTrades: 0, epochStart: 0, epochDuration: 86400,
  vaultUsdc: 0, yourShares: 0, entryAps: 1_000_000, unlockAt: 0,
};

export function useOnChainStats(pollMs = 10_000) {
  const wallet         = useAnchorWallet();
  const { connection } = useConnection();
  const [stats, setStats]     = useState<ChainStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!wallet) return;
    try {
      const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
      const idl      = await Program.fetchIdl(PROGRAM_ID, provider);
      if (!idl) throw new Error("IDL not found on chain");
      const program  = new Program(idl as any, provider);

      const [reg, agent, vault] = await Promise.all([
        (program.account as any).registry.fetch(REGISTRY_PDA),
        (program.account as any).agentState.fetch(AGENT_PDA),
        getAccount(connection, VAULT_ATA).catch(() => null),
      ]);

      const [receiptPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("receipt"), agent.agentPubkey.toBuffer(), wallet.publicKey.toBuffer()],
        PROGRAM_ID
      );
      const receipt = await (program.account as any).stakerReceipt
        .fetch(receiptPDA).catch(() => null);

      setStats({
        totalAgents:       reg.totalAgents.toNumber(),
        totalTvl:          reg.totalTvl.toNumber(),
        protocolFeeBps:    reg.protocolFeeBps,
        status:            Object.keys(agent.status)[0],
        performanceFeeBps: agent.performanceFeeBps,
        totalShares:       agent.totalShares.toNumber(),
        assetsPerShare:    agent.assetsPerShare.toNumber(),
        highWaterMark:     agent.highWaterMark.toNumber(),
        cumulativePnl:     agent.cumulativePnl.toNumber(),
        totalTrades:       agent.totalTrades.toNumber(),
        epochStart:        agent.epochStart.toNumber(),
        epochDuration:     agent.epochDuration.toNumber(),
        vaultUsdc:         vault ? Number(vault.amount) : 0,
        yourShares:        receipt ? receipt.shares.toNumber() : 0,
        entryAps:          receipt ? receipt.entryAssetsPerShare.toNumber() : 1_000_000,
        unlockAt:          receipt
          ? receipt.depositTimestamp.toNumber() + agent.epochDuration.toNumber()
          : 0,
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "fetch failed");
    } finally {
      setLoading(false);
    }
  }, [wallet, connection]);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, pollMs);
    return () => clearInterval(t);
  }, [fetchStats, pollMs]);

  return { stats, loading, error, refresh: fetchStats };
}
