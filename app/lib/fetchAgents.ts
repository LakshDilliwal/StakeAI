import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { RPC_URL } from "./constants";

export interface AgentInfo {
  id: string;
  agentPubkey: string;
  name: string;
  apy: number;
  aps: number;
  tvl: number;
  trades: number;
  totalShares: number;
  status: string;
  performanceFeeBps: number;
  tradeCount: number;
}

export async function fetchAllAgents(): Promise<AgentInfo[]> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const dummyWallet = {
      publicKey: PublicKey.default,
      signTransaction: async (tx: any) => tx,
      signAllTransactions: async (txs: any[]) => txs,
    };
    const provider = new AnchorProvider(connection, dummyWallet as any, { commitment: "confirmed" });
    const idl = (await import("../idl/axiom6.json")) as any;
    const program = new Program(idl, provider);

    // Fetch all AgentState accounts on-chain — no hardcoding needed
    const allAgentStates = await (program.account as any).agentState.all();

    // Also fetch backend metadata (names, trade counts)
    let backendAgents: Record<string, any> = {};
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/agents`);
      const data = await res.json();
      for (const a of data.agents) backendAgents[a.agentPubkey] = a;
    } catch { /* backend optional */ }

    return allAgentStates.map((a: any) => {
      const data = a.account;
      const agentPubkey = data.agentPubkey.toBase58();
      const aps = data.assetsPerShare.toNumber() / 1_000_000;
      const backend = backendAgents[agentPubkey] ?? {};
      return {
        id: agentPubkey,
        agentPubkey,
        name: backend.agentName ?? `Agent ${agentPubkey.slice(0, 6)}`,
        apy: +((aps - 1) * 100).toFixed(2),
        aps,
        totalShares: data.totalShares.toNumber(),
        status: data.status?.active !== undefined ? "Active" : "Paused",
        performanceFeeBps: data.performanceFeeBps,
        tradeCount: backend.tradeCount ?? 0,
        tvl: (data.totalShares.toNumber() * (data.assetsPerShare.toNumber() / 1_000_000)) / 1_000_000,
        trades: backend.tradeCount ?? 0,
      };
    });
  } catch (err) {
    console.error("[fetchAgents]", err);
    return [];
  }
}
