/**
 * Prints full on-chain state: registry + all agents + your staker receipt.
 * Usage: npx ts-node scripts/inspect.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
const USDC_MINT  = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

async function main() {
  const kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(
    fs.readFileSync(path.join(process.env.HOME!, ".config/solana/id.json"), "utf8"))));

  const conn     = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new AnchorProvider(conn, new anchor.Wallet(kp), { commitment: "confirmed" });

  const idl = await Program.fetchIdl(PROGRAM_ID, provider);
  if (!idl) throw new Error("IDL not found");
  const program = new Program(idl as anchor.Idl, provider);

  // ── Registry ────────────────────────────────────────────────────────
  const [regPDA] = PublicKey.findProgramAddressSync([Buffer.from("registry")], PROGRAM_ID);
  const reg = await (program.account as any).registry.fetch(regPDA);
  console.log("\n═══ REGISTRY ═══════════════════════════════════════════");
  console.log("  PDA:          ", regPDA.toBase58());
  console.log("  Authority:    ", reg.authority.toBase58());
  console.log("  Total Agents: ", reg.totalAgents.toNumber());
  console.log("  Total TVL:    ", reg.totalTvl.toNumber() / 1e6, "USDC");
  console.log("  Protocol Fee: ", reg.protocolFeeBps / 100, "%");

  // ── Agents ──────────────────────────────────────────────────────────
  const agents = await (program.account as any).agentState.all();
  console.log(`\n═══ AGENTS (${agents.length}) ═════════════════════════════════════`);

  for (const a of agents) {
    const s      = a.account;
    const status = Object.keys(s.status)[0];
    const aps    = s.assetsPerShare.toNumber() / 1e6;
    const hwm    = s.highWaterMark.toNumber() / 1e6;
    const pnl    = s.cumulativePnl.toNumber() / 1e6;
    const pnlSign = pnl >= 0 ? "+" : "";

    console.log(`\n  ┌─ Agent State PDA: ${a.publicKey.toBase58()}`);
    console.log(`  │  Pubkey:       ${s.agentPubkey.toBase58()}`);
    console.log(`  │  Developer:    ${s.developer.toBase58()}`);
    console.log(`  │  Status:       ${status}`);
    console.log(`  │  Perf Fee:     ${s.performanceFeeBps / 100}%`);
    console.log(`  │  Total Shares: ${s.totalShares.toNumber()}`);
    console.log(`  │  APS:          ${aps.toFixed(6)} (HWM: ${hwm.toFixed(6)})`);
    console.log(`  │  Cumul. PnL:   ${pnlSign}${pnl.toFixed(6)} USDC`);
    console.log(`  │  Total Trades: ${s.totalTrades.toNumber()}`);

    // Vault USDC balance
    try {
      const vaultAta = await getAssociatedTokenAddress(USDC_MINT, a.publicKey, true);
      const acct     = await getAccount(conn, vaultAta);
      console.log(`  │  Vault USDC:   ${(Number(acct.amount) / 1e6).toFixed(2)} USDC  (${vaultAta.toBase58()})`);
    } catch {
      console.log(`  │  Vault USDC:   ATA not found`);
    }

    // Your staker receipt
    const [receiptPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("receipt"), s.agentPubkey.toBuffer(), kp.publicKey.toBuffer()], PROGRAM_ID
    );
    try {
      const r        = await (program.account as any).stakerReceipt.fetch(receiptPDA);
      const unlockAt = new Date((r.depositTimestamp.toNumber() + s.epochDuration.toNumber()) * 1000);
      console.log(`  │  Your Shares:  ${r.shares.toNumber()}`);
      console.log(`  │  Entry APS:    ${r.entryAssetsPerShare.toNumber() / 1e6}`);
      console.log(`  └─ Unlock at:    ${unlockAt.toISOString()}`);
    } catch {
      console.log(`  └─ Your Shares:  (no stake)`);
    }
  }

  if (agents.length === 0) {
    console.log("  (no agents registered yet)");
  }

  console.log("\n═══════════════════════════════════════════════════════\n");
}

main().catch(console.error);
