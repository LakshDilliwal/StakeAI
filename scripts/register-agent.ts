/**
 * Registers a new AI trading agent on devnet.
 * Creates a fresh agent hot-wallet keypair and saves it to ~/.config/solana/axiom6-agent.json
 *
 * Usage: npx ts-node scripts/register-agent.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
const DEVNET_RPC  = "https://api.devnet.solana.com";
const USDC_MINT   = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const SOL_MINT    = new PublicKey("So11111111111111111111111111111111111111112");

const WHITELISTED_MINTS = [
  USDC_MINT,
  SOL_MINT,
  new PublicKey("mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So"),
];

const PERFORMANCE_FEE_BPS = 2000; // 20%
const AGENT_KEYPAIR_PATH  = path.join(process.env.HOME!, ".config/solana/axiom6-agent.json");

async function main() {
  const devPath = process.env.KEYPAIR || path.join(process.env.HOME!, ".config/solana/id.json");
  const devRaw  = JSON.parse(fs.readFileSync(devPath, "utf8"));
  const developer = Keypair.fromSecretKey(Uint8Array.from(devRaw));

  console.log("Developer:", developer.publicKey.toBase58());

  let agentKeypair: Keypair;
  if (fs.existsSync(AGENT_KEYPAIR_PATH)) {
    const raw = JSON.parse(fs.readFileSync(AGENT_KEYPAIR_PATH, "utf8"));
    agentKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
    console.log("Loaded existing agent keypair:", agentKeypair.publicKey.toBase58());
  } else {
    agentKeypair = Keypair.generate();
    fs.writeFileSync(AGENT_KEYPAIR_PATH, JSON.stringify(Array.from(agentKeypair.secretKey)));
    console.log("Generated new agent keypair:", agentKeypair.publicKey.toBase58());
    console.log("Saved to:", AGENT_KEYPAIR_PATH);
  }

  const connection = new anchor.web3.Connection(DEVNET_RPC, "confirmed");
  const wallet     = new anchor.Wallet(developer);
  const provider   = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  console.log("\nFetching IDL from chain...");
  const idl = await Program.fetchIdl(PROGRAM_ID, provider);
  if (!idl) throw new Error("IDL not found. Did you run `anchor deploy`?");
  const program = new Program(idl as anchor.Idl, provider);

  const [registryPDA]   = PublicKey.findProgramAddressSync([Buffer.from("registry")], PROGRAM_ID);
  const [agentStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), agentKeypair.publicKey.toBuffer()], PROGRAM_ID
  );

  try {
    const existing = await (program.account as any).agentState.fetch(agentStatePDA);
    console.log("\n✅ Agent already registered:");
    console.log("   Agent State PDA:", agentStatePDA.toBase58());
    console.log("   Agent Pubkey:   ", existing.agentPubkey.toBase58());
    console.log("   Total Shares:   ", existing.totalShares.toNumber());
    console.log("   Total Trades:   ", existing.totalTrades.toNumber());
    console.log("   Cumul. PnL:     ", existing.cumulativePnl.toNumber() / 1e6, "USDC");
    console.log("   Status:         ", Object.keys(existing.status)[0]);
    return;
  } catch {
    console.log("Agent not yet registered — creating...");
  }

  const vaultUsdcAta = await getAssociatedTokenAddress(USDC_MINT, agentStatePDA, true);
  console.log("Vault USDC ATA:", vaultUsdcAta.toBase58());

  const ataInfo = await connection.getAccountInfo(vaultUsdcAta);
  const preIxs: anchor.web3.TransactionInstruction[] = [];
  if (!ataInfo) {
    console.log("Creating vault USDC ATA...");
    preIxs.push(
      createAssociatedTokenAccountInstruction(
        developer.publicKey,
        vaultUsdcAta,
        agentStatePDA,
        USDC_MINT,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  if (preIxs.length > 0) {
    const setupTx = new anchor.web3.Transaction().add(...preIxs);
    const setupSig = await anchor.web3.sendAndConfirmTransaction(connection, setupTx, [developer]);
    console.log("Vault ATA created:", `https://solscan.io/tx/${setupSig}?cluster=devnet`);
  }

  const tx = await (program.methods as any)
    .registerAgent(PERFORMANCE_FEE_BPS, WHITELISTED_MINTS)
    .accounts({
      registry:      registryPDA,
      agentState:    agentStatePDA,
      developer:     developer.publicKey,
      agentPubkey:   agentKeypair.publicKey,
      vaultUsdcAta:  vaultUsdcAta,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`\n✅ Agent registered on devnet!`);
  console.log(`   TX:              https://solscan.io/tx/${tx}?cluster=devnet`);
  console.log(`   Agent State PDA: ${agentStatePDA.toBase58()}`);
  console.log(`   Agent Pubkey:    ${agentKeypair.publicKey.toBase58()}`);
  console.log(`   Vault USDC ATA:  ${vaultUsdcAta.toBase58()}`);
  console.log(`   Perf Fee:        ${PERFORMANCE_FEE_BPS / 100}%`);
  console.log(`\n   Solscan: https://solscan.io/account/${agentStatePDA.toBase58()}?cluster=devnet`);
}

main().catch(err => { console.error(err); process.exit(1); });
