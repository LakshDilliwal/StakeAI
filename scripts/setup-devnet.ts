import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  PublicKey, Keypair, SystemProgram,
  Connection, clusterApiUrl, Transaction
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
const USDC_MINT  = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const deployer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(
    path.resolve(process.env.HOME!, ".config/solana/id.json"), "utf-8"
  )))
);

console.log("\nDeployer:", deployer.publicKey.toBase58());

async function main() {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const provider   = new AnchorProvider(
    connection,
    new anchor.Wallet(deployer),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const idl     = JSON.parse(fs.readFileSync(
    path.resolve("target/idl/axiom6.json"), "utf-8"
  ));
  const program = new anchor.Program(idl, provider);

  // ── PDAs ──────────────────────────────────────────────────────────────────
  const [registryPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("registry")], PROGRAM_ID
  );

  const agentKeypair = Keypair.generate();

  const [agentStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), agentKeypair.publicKey.toBuffer()], PROGRAM_ID
  );

  const vaultUsdcAta = await getAssociatedTokenAddress(
    USDC_MINT, agentStatePda, true
  );

  console.log("\nRegistry PDA  :", registryPda.toBase58());
  console.log("Agent pubkey  :", agentKeypair.publicKey.toBase58());
  console.log("AgentState PDA:", agentStatePda.toBase58());
  console.log("Vault USDC ATA:", vaultUsdcAta.toBase58());

  // ── 1. Initialize Registry ────────────────────────────────────────────────
  let registryExists = false;
  try {
    await (program.account as any).registry.fetch(registryPda);
    registryExists = true;
    console.log("\n✓ Registry already exists — skipping");
  } catch {}

  if (!registryExists) {
    console.log("\n→ Initializing Registry...");
    const sig = await (program.methods as any)
      .initializeRegistry(200)
      .accounts({
        registry:      registryPda,
        authority:     deployer.publicKey,
        treasury:      deployer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([deployer])
      .rpc();
    console.log("  ✓ tx:", sig);
  }

  // ── 2. Create vault USDC ATA ──────────────────────────────────────────────
  const ataInfo = await connection.getAccountInfo(vaultUsdcAta);
  if (!ataInfo) {
    console.log("\n→ Creating vault USDC ATA...");
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        deployer.publicKey, vaultUsdcAta, agentStatePda,
        USDC_MINT, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
    const sig = await provider.sendAndConfirm(tx, []);
    console.log("  ✓ tx:", sig);
  } else {
    console.log("\n✓ Vault ATA already exists — skipping");
  }

  // ── 3. Register Agent ─────────────────────────────────────────────────────
  let agentExists = false;
  try {
    await (program.account as any).agentState.fetch(agentStatePda);
    agentExists = true;
    console.log("\n✓ AgentState already exists — skipping");
  } catch {}

  if (!agentExists) {
    console.log("\n→ Registering agent...");
    const sig = await (program.methods as any)
      .registerAgent(2000, [USDC_MINT])
      .accounts({
        registry:      registryPda,
        agentState:    agentStatePda,
        developer:     deployer.publicKey,
        agentPubkey:   agentKeypair.publicKey,
        vaultUsdcAta:  vaultUsdcAta,
        systemProgram: SystemProgram.programId,
      })
      .signers([deployer])
      .rpc();
    console.log("  ✓ tx:", sig);
  }

  // ── Save agent keypair ────────────────────────────────────────────────────
  fs.writeFileSync(
    path.resolve("scripts/agent-keypair.json"),
    JSON.stringify(Array.from(agentKeypair.secretKey))
  );

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
  ✓ SETUP COMPLETE

  Agent pubkey   : ${agentKeypair.publicKey.toBase58()}
  AgentState PDA : ${agentStatePda.toBase58()}
  Registry PDA   : ${registryPda.toBase58()}
  Vault USDC ATA : ${vaultUsdcAta.toBase58()}

  Keypair saved  : scripts/agent-keypair.json

  NOW RUN:
  sed -i 's/A1MizcnJQszkVX4FHa4P5jPSNaKbLXmRijCy6x1Uh7BG/${agentKeypair.publicKey.toBase58()}/g' \\
    app/app/dashboard/page.tsx \\
    app/lib/stakeTransaction.ts
╚═══════════════════════════════════════════════════════════════╝
  `);
}

main().catch(e => { console.error("\n✗", e.message ?? e); process.exit(1); });
