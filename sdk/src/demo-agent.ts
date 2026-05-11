/**
 * Axiom6 Demo: Momentum Trading Agent
 * Reads SOL price signal, executes mock trade, reports to backend automatically.
 *
 * Usage:
 *   AGENT_KEYPAIR=~/.config/solana/id.json \
 *   AGENT_API_KEY=<your-api-key> \
 *   npx ts-node src/demo-agent.ts
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import fs from "fs";
import { Axiom6Agent, registerAgent } from "./index";

const DEVNET_RPC = "https://api.devnet.solana.com";
const USDC_MINT  = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const SOL_MINT   = new PublicKey("So11111111111111111111111111111111111111112");

async function getMomentumSignal(connection: Connection): Promise<"BUY" | "HOLD"> {
  const slot = await connection.getSlot();
  return slot % 5 < 3 ? "BUY" : "HOLD";
}

async function main() {
  const connection = new Connection(DEVNET_RPC, "confirmed");

  const keypairPath = process.env.AGENT_KEYPAIR || `${process.env.HOME}/.config/solana/id.json`;
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(raw));
  const agentPubkey = agentKeypair.publicKey.toBase58();

  console.log("🤖 Axiom6 Demo Agent starting...");
  console.log(`   Agent pubkey: ${agentPubkey}`);

  // Auto-register if no API key provided
  let apiKey = process.env.AGENT_API_KEY;
  if (!apiKey) {
    console.log("\n�� No AGENT_API_KEY set — registering agent...");
    const result = await registerAgent({
      agentPubkey,
      agentName: process.env.AGENT_NAME ?? `Agent ${agentPubkey.slice(0, 6)}`,
      strategy: process.env.AGENT_STRATEGY ?? "momentum",
      performanceFeeBps: 500,
    });
    apiKey = result.apiKey;
    console.log(`   API Key: ${apiKey}`);
    console.log(`   Set AGENT_API_KEY=${apiKey} to skip registration next time`);
  }

  const agent = new Axiom6Agent({ connection, agentKeypair, apiKey });
  await agent.init();
  const stats = await agent.getStats();

  console.log("\n📊 Agent Stats:");
  console.log(`   Status:          ${stats.status}`);
  console.log(`   Total Trades:    ${stats.totalTrades}`);
  console.log(`   Assets/Share:    ${(stats.assetsPerShare / 1e6).toFixed(6)}`);

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

  const vaultInputAta  = await getAssociatedTokenAddress(USDC_MINT, agent.statePDA, true);
  const vaultOutputAta = await getAssociatedTokenAddress(SOL_MINT,  agent.statePDA, true);

  console.log("\n🔄 Simulating trade (demo mode)...");
  const mockPnl = +((Math.random() - 0.3) * 200).toFixed(2);
  const mockAps = +(stats.assetsPerShare / 1e6 + mockPnl / 1_000_000).toFixed(6);

  // Report the simulated trade to backend
  await agent.reportTrade({
    txSignature: `demo_${Date.now()}`,
    pnlUsdc: mockPnl,
    newAps: mockAps,
  });

  console.log(`\n✅ Trade simulated & reported:`);
  console.log(`   PnL:  ${mockPnl >= 0 ? "+" : ""}${mockPnl} USDC`);
  console.log(`   APS:  ${mockAps}`);
  console.log(`   View: http://localhost:3000/agent/${agentPubkey}`);

  /*
  // LIVE TRADE — uncomment when vault is funded + Jupiter quote ready:
  const sig = await agent.executeTrade({
    inputMint: USDC_MINT, outputMint: SOL_MINT,
    vaultInputAta, vaultOutputAta,
    pythInputPrice:  new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"),
    pythOutputPrice: new PublicKey("5SSkXsEKQepHHAewytPVwdej4epN1nxgLVM84L4KXgy7"),
    jupiterInstructionData: Buffer.from(jupiterSwapData, "base64"),
    remainingAccounts: jupiterAccounts,
    pnlUsdc: estimatedPnl,
    newAps: updatedAps,
  });
  console.log(`✅ Live trade: https://solscan.io/tx/${sig}?cluster=devnet`);
  */
}

main().catch(console.error);
