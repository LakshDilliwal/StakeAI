import {
  Connection, PublicKey, SystemProgram, Keypair,
} from "@solana/web3.js";
import {
  AnchorProvider, BN, Program,
} from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress, TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

// ─── Constants ────────────────────────────────────────────────────────────────
export const AXIOM6_PROGRAM_ID  = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
export const USDC_MINT_DEVNET   = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
export const JUPITER_PROGRAM_ID = new PublicKey("JUP6LkbZbjS1jKKwapdH67y95eVxmA58WwNiE8kQc6a");
export const AXIOM6_API_URL     = process.env.AXIOM6_API_URL ?? "http://localhost:4000";

// ─── PDA Helpers ──────────────────────────────────────────────────────────────
export function getRegistryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("registry")], AXIOM6_PROGRAM_ID);
}
export function getAgentStatePDA(agentPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("agent"), agentPubkey.toBuffer()], AXIOM6_PROGRAM_ID);
}
export function getStakerReceiptPDA(agentPubkey: PublicKey, stakerPubkey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), agentPubkey.toBuffer(), stakerPubkey.toBuffer()],
    AXIOM6_PROGRAM_ID
  );
}

// ─── Axiom6Client ─────────────────────────────────────────────────────────────
export class Axiom6Client {
  private program: Program;
  constructor(private provider: AnchorProvider, idl: any) {
    this.program = new Program(idl, provider);
  }

  async stakeUsdc(agentPubkey: PublicKey, amountUsdc: number): Promise<string> {
    const lamports = Math.round(amountUsdc * 1_000_000);
    const staker = this.provider.wallet.publicKey;
    const [registryPDA]   = getRegistryPDA();
    const [agentStatePDA] = getAgentStatePDA(agentPubkey);
    const [receiptPDA]    = getStakerReceiptPDA(agentPubkey, staker);
    const stakerAta = await getAssociatedTokenAddress(USDC_MINT_DEVNET, staker);
    const vaultAta  = await getAssociatedTokenAddress(USDC_MINT_DEVNET, agentStatePDA, true);
    return (this.program.methods as any).stakeUsdc(new BN(lamports))
      .accounts({ registry: registryPDA, agentState: agentStatePDA, stakerReceipt: receiptPDA, staker, stakerUsdcAta: stakerAta, vaultUsdcAta: vaultAta, tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId })
      .rpc();
  }

  async unstake(agentPubkey: PublicKey, sharesToBurn: BN): Promise<string> {
    const staker = this.provider.wallet.publicKey;
    const [registryPDA]   = getRegistryPDA();
    const [agentStatePDA] = getAgentStatePDA(agentPubkey);
    const [receiptPDA]    = getStakerReceiptPDA(agentPubkey, staker);
    const stakerAta = await getAssociatedTokenAddress(USDC_MINT_DEVNET, staker);
    const vaultAta  = await getAssociatedTokenAddress(USDC_MINT_DEVNET, agentStatePDA, true);
    return (this.program.methods as any).unstake(sharesToBurn)
      .accounts({ registry: registryPDA, agentState: agentStatePDA, stakerReceipt: receiptPDA, staker, stakerUsdcAta: stakerAta, vaultUsdcAta: vaultAta, tokenProgram: TOKEN_PROGRAM_ID })
      .rpc();
  }

  async executeTrade(
    agentPubkey: PublicKey, jupiterIxData: Buffer,
    vaultInputAta: PublicKey, vaultOutputAta: PublicKey,
    inputMint: PublicKey, outputMint: PublicKey,
    pythInputPrice: PublicKey, pythOutputPrice: PublicKey,
    remainingAccounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>,
  ): Promise<string> {
    const [agentStatePDA] = getAgentStatePDA(agentPubkey);
    return (this.program.methods as any).executeTrade(jupiterIxData)
      .accounts({ agent: agentPubkey, agentState: agentStatePDA, vaultInputAta, vaultOutputAta, inputMint, outputMint, pythInputPrice, pythOutputPrice, jupiterProgram: JUPITER_PROGRAM_ID })
      .remainingAccounts(remainingAccounts)
      .rpc();
  }

  async fetchAgentState(agentPubkey: PublicKey) {
    const [pda] = getAgentStatePDA(agentPubkey);
    return (this.program.account as any).agentState.fetch(pda);
  }
  async fetchStakerReceipt(agentPubkey: PublicKey, staker: PublicKey) {
    const [pda] = getStakerReceiptPDA(agentPubkey, staker);
    return (this.program.account as any).stakerReceipt.fetch(pda);
  }
  async fetchRegistry() {
    const [pda] = getRegistryPDA();
    return (this.program.account as any).registry.fetch(pda);
  }
}

// ─── Backend Reporter ─────────────────────────────────────────────────────────
export interface ReportTradeParams {
  txSignature: string;
  pnlUsdc: number;
  newAps?: number;
}

export async function reportTrade(
  agentPubkey: string,
  apiKey: string,
  params: ReportTradeParams,
): Promise<void> {
  try {
    const res = await fetch(`${AXIOM6_API_URL}/api/report-trade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ agentPubkey, ...params }),
    });
    const data = await res.json();
    if (!data.ok) console.warn("[Axiom6] reportTrade failed:", data.error);
    else console.log(`[Axiom6] Trade reported — PnL: ${params.pnlUsdc} USDC, APS: ${params.newAps ?? "unchanged"}`);
  } catch (err) {
    console.warn("[Axiom6] reportTrade error (non-fatal):", err);
  }
}

export async function registerAgent(params: {
  agentPubkey: string;
  agentName: string;
  strategy: string;
  performanceFeeBps: number;
}): Promise<{ apiKey: string }> {
  const res = await fetch(`${AXIOM6_API_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  return res.json();
}

// ─── Axiom6Agent ─────────────────────────────────────────────────────────────
interface Axiom6AgentConfig {
  connection: Connection;
  agentKeypair: Keypair;
  apiKey?: string;       // from registerAgent() — enables reportTrade()
  idl?: any;
}

interface AgentStats {
  status: "Active" | "Paused" | "Liquidated";
  totalTrades: number;
  cumulativePnl: number;
  assetsPerShare: number;
  highWaterMark: number;
  totalShares: number;
}

export class Axiom6Agent {
  public statePDA!: PublicKey;
  private client!: Axiom6Client;
  private config: Axiom6AgentConfig;

  constructor(config: Axiom6AgentConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    const { connection, agentKeypair, idl } = this.config;
    let resolvedIdl = idl;
    if (!resolvedIdl) {
      try {
        const path = require("path");
        const fs   = require("fs");
        const idlPath = path.resolve(__dirname, "../../target/idl/axiom6.json");
        resolvedIdl = JSON.parse(fs.readFileSync(idlPath, "utf8"));
      } catch {
        const [pda] = getAgentStatePDA(agentKeypair.publicKey);
        this.statePDA = pda;
        return;
      }
    }
    const anchor = await import("@coral-xyz/anchor");
    const provider = new anchor.AnchorProvider(
      connection,
      {
        publicKey: agentKeypair.publicKey,
        signTransaction: async (tx: any) => { tx.partialSign(agentKeypair); return tx; },
        signAllTransactions: async (txs: any[]) => { txs.forEach((tx: any) => tx.partialSign(agentKeypair)); return txs; },
      },
      { commitment: "confirmed" }
    );
    this.client = new Axiom6Client(provider, resolvedIdl!);
    const [pda] = getAgentStatePDA(agentKeypair.publicKey);
    this.statePDA = pda;
  }

  async getStats(): Promise<AgentStats> {
    if (!this.client) {
      return { status: "Active", totalTrades: 0, cumulativePnl: 0, assetsPerShare: 1_000_000, highWaterMark: 1_000_000, totalShares: 0 };
    }
    const state = await this.client.fetchAgentState(this.config.agentKeypair.publicKey).catch(() => null);
    if (!state) return { status: "Active" as const, totalTrades: 0, cumulativePnl: 0, assetsPerShare: 1_000_000, highWaterMark: 1_000_000, totalShares: 0 };
    const statusKey = Object.keys(state.status)[0];
    return {
      status: (statusKey.charAt(0).toUpperCase() + statusKey.slice(1)) as AgentStats["status"],
      totalTrades:    state.totalTrades.toNumber(),
      cumulativePnl:  state.cumulativePnl.toNumber(),
      assetsPerShare: state.assetsPerShare.toNumber(),
      highWaterMark:  state.highWaterMark.toNumber(),
      totalShares:    state.totalShares.toNumber(),
    };
  }

  /**
   * Execute an on-chain trade AND automatically report it to the backend.
   * If apiKey is set in config, reportTrade() is called after every successful tx.
   */
  async executeTrade(params: {
    inputMint: PublicKey; outputMint: PublicKey;
    vaultInputAta: PublicKey; vaultOutputAta: PublicKey;
    pythInputPrice: PublicKey; pythOutputPrice: PublicKey;
    jupiterInstructionData: Buffer;
    remainingAccounts: Array<{ pubkey: PublicKey; isSigner: boolean; isWritable: boolean }>;
    pnlUsdc?: number;   // estimated PnL to report
    newAps?: number;    // updated APS to report
  }): Promise<string> {
    const sig = await this.client.executeTrade(
      this.config.agentKeypair.publicKey,
      params.jupiterInstructionData,
      params.vaultInputAta, params.vaultOutputAta,
      params.inputMint, params.outputMint,
      params.pythInputPrice, params.pythOutputPrice,
      params.remainingAccounts,
    );

    // Auto-report to backend if apiKey is configured
    if (this.config.apiKey) {
      await reportTrade(
        this.config.agentKeypair.publicKey.toBase58(),
        this.config.apiKey,
        { txSignature: sig, pnlUsdc: params.pnlUsdc ?? 0, newAps: params.newAps },
      );
    }

    return sig;
  }

  /** Manually report a trade (e.g. after a simulated or off-chain trade) */
  async reportTrade(params: ReportTradeParams): Promise<void> {
    if (!this.config.apiKey) {
      console.warn("[Axiom6] No apiKey set — call registerAgent() first");
      return;
    }
    await reportTrade(
      this.config.agentKeypair.publicKey.toBase58(),
      this.config.apiKey,
      params,
    );
  }
}
