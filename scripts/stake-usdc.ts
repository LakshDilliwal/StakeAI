/**
 * Stakes USDC into a registered agent vault.
 * Usage: npx ts-node scripts/stake-usdc.ts [amount_usdc]
 */
import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

const PROGRAM_ID  = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
const DEVNET_RPC  = "https://api.devnet.solana.com";
const USDC_MINT   = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const AMOUNT_USDC = parseFloat(process.argv[2] ?? "10");

async function main() {
  const devPath   = path.join(process.env.HOME!, ".config/solana/id.json");
  const agentPath = path.join(process.env.HOME!, ".config/solana/axiom6-agent.json");

  if (!fs.existsSync(agentPath)) {
    throw new Error("Agent keypair not found. Run register-agent.ts first.");
  }

  const developer    = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(devPath,   "utf8"))));
  const agentKeypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(agentPath, "utf8"))));

  const connection = new anchor.web3.Connection(DEVNET_RPC, "confirmed");
  const wallet     = new anchor.Wallet(developer);
  const provider   = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = await Program.fetchIdl(PROGRAM_ID, provider);
  if (!idl) throw new Error("IDL not found");
  const program = new Program(idl as anchor.Idl, provider);

  const [registryPDA]   = PublicKey.findProgramAddressSync([Buffer.from("registry")], PROGRAM_ID);
  const [agentStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), agentKeypair.publicKey.toBuffer()], PROGRAM_ID
  );
  const [receiptPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("receipt"), agentKeypair.publicKey.toBuffer(), developer.publicKey.toBuffer()], PROGRAM_ID
  );

  const stakerAta = await getOrCreateAssociatedTokenAccount(
    connection, developer, USDC_MINT, developer.publicKey
  );
  const vaultAta = await getAssociatedTokenAddress(USDC_MINT, agentStatePDA, true);

  const usdcBalance = Number(stakerAta.amount) / 1e6;
  console.log(`Staker USDC balance: ${usdcBalance.toFixed(2)} USDC`);
  console.log(`Staking:             ${AMOUNT_USDC} USDC`);

  if (usdcBalance < AMOUNT_USDC) {
    console.log(`\n⚠️  Insufficient USDC.`);
    console.log(`   Get devnet USDC at: https://faucet.circle.com`);
    console.log(`   Your address: ${developer.publicKey.toBase58()}`);
    process.exit(1);
  }

  const agentState = await (program.account as any).agentState.fetch(agentStatePDA);
  console.log(`\nAgent: total_shares=${agentState.totalShares.toNumber()} aps=${agentState.assetsPerShare.toNumber() / 1e6}`);

  const lamounts = Math.round(AMOUNT_USDC * 1e6);

  const tx = await (program.methods as any)
    .stakeUsdc(new BN(lamounts))
    .accounts({
      registry:      registryPDA,
      agentState:    agentStatePDA,
      stakerReceipt: receiptPDA,
      staker:        developer.publicKey,
      stakerUsdcAta: stakerAta.address,
      vaultUsdcAta:  vaultAta,
      tokenProgram:  TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  const receipt = await (program.account as any).stakerReceipt.fetch(receiptPDA);

  console.log(`\n✅ Staked ${AMOUNT_USDC} USDC!`);
  console.log(`   TX:            https://solscan.io/tx/${tx}?cluster=devnet`);
  console.log(`   Receipt PDA:   ${receiptPDA.toBase58()}`);
  console.log(`   Shares minted: ${receipt.shares.toNumber()}`);
  console.log(`   Entry APS:     ${receipt.entryAssetsPerShare.toNumber() / 1e6}`);
  console.log(`   Locked until:  ${new Date((receipt.depositTimestamp.toNumber() + 86400) * 1000).toISOString()}`);
  console.log(`\n   Vault: https://solscan.io/account/${vaultAta.toBase58()}?cluster=devnet`);
}

main().catch(err => { console.error(err); process.exit(1); });
