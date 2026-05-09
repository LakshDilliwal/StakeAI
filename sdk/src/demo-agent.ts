/**
 * Axiom6 Demo: Momentum Trading Agent
 * 
 * Reads SOL price from Pyth, decides BUY/HOLD based on a simple 
 * momentum signal, then calls execute_trade via the Axiom6 SDK.
 * 
 * Usage:
 *   AGENT_KEYPAIR=/path/to/keypair.json npx ts-node src/demo-agent.ts
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import fs from "fs";
import { Axiom6Agent } from "./index";

const DEVNET_RPC = "https://api.devnet.solana.com";
const USDC_MINT  = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const SOL_MINT   = new PublicKey("So11111111111111111111111111111111111111112");

// Pyth devnet price feeds
const PYTH_SOL_USD  = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");
const PYTH_USDC_USD = new PublicKey("5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7");

async function getMomentumSignal(connection: Connection): Promise<"BUY" | "HOLD"> {
  // Stub: in production, read Pyth TWAP and compare to 5-period EMA
  // For demo, return BUY 60% of the time
  const slot = await connection.getSlot();
  return slot % 5 < 3 ? "BUY" : "HOLD";
}

async function main() {
  const connection = new Connection(DEVNET_RPC, "confirmed");

  // Load agent keypair
  const keypairPath = process.env.AGENT_KEYPAIR || `${process.env.HOME}/.config/solana/id.json`;
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));

  console.log("🤖 Axiom6 Demo Agent starting...");
  console.log(`   Agent pubkey: ${agentKeypair.publicKey.toBase58()}`);

  // 5-line SDK integration ─────────────────────────────────────────
  const agent = new Axiom6Agent({ connection, agentKeypair });
  await agent.init();
  const stats = await agent.getStats();
  // ─────────────────────────────────────────────────────────────────

  console.log("\n📊 Agent Stats:");
  console.log(`   Status:          ${stats.status}`);
  console.log(`   Total Trades:    ${stats.totalTrades}`);
  console.log(`   Cumulative PnL:  ${(stats.cumulativePnl / 1e6).toFixed(2)} USDC`);
  console.log(`   Assets/Share:    ${(stats.assetsPerShare / 1e6).toFixed(6)}`);
  console.log(`   High Water Mark: ${(stats.highWaterMark / 1e6).toFixed(6)}`);

  if (stats.status !== "Active") {
    console.log("\n⚠️  Agent is not active. Exiting.");
    return;
  }

  const signal = await getMomentumSignal(connection);
  console.log(`\n📡 Momentum Signal: ${signal}`);

  if (signal === "HOLD") {
    console.log("⏸  Signal is HOLD — no trade this cycle.");
    return;
  }

  // Derive vault ATAs
  const vaultInputAta  = await getAssociatedTokenAddress(USDC_MINT, agent.statePDA, true);
  const vaultOutputAta = await getAssociatedTokenAddress(SOL_MINT, agent.statePDA, true);

  // In a real agent: fetch Jupiter quote, build swap instruction data
  // For demo: we log what *would* happen
  console.log("\n🔄 Would execute trade:");
  console.log(`   Input:  USDC → ${vaultInputAta.toBase58().slice(0, 20)}...`);
  console.log(`   Output: SOL  → ${vaultOutputAta.toBase58().slice(0, 20)}...`);
  console.log(`   Route:  Jupiter v6 CPI via Axiom6 Glass Box Vault`);
  console.log("\n✅ Demo complete. Connect a real Jupiter quote to go live.");

  /*
  // LIVE TRADE (uncomment when vault is funded + Jupiter quote is ready):
  const sig = await agent.executeTrade({
    inputMint:  USDC_MINT,
    outputMint: SOL_MINT,
    vaultInputAta,
    vaultOutputAta,
    pythInputPrice:  PYTH_USDC_USD,
    pythOutputPrice: PYTH_SOL_USD,
    jupiterInstructionData: Buffer.from(jupiterSwapData, "base64"),
    remainingAccounts: jupiterAccounts,
  });
  console.log(`✅ Trade executed: https://solscan.io/tx/${sig}?cluster=devnet`);
  */
}

main().catch(console.error);
