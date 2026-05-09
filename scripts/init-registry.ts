/**
 * Run once: creates the Registry PDA on devnet.
 * Usage: npx ts-node scripts/init-registry.ts
 */
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import fs from "fs";
import path from "path";

const PROGRAM_ID = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
const DEVNET_RPC  = "https://api.devnet.solana.com";
const PROTOCOL_FEE_BPS = 100;

async function main() {
  const keypairPath = process.env.KEYPAIR || path.join(process.env.HOME!, ".config/solana/id.json");
  const raw = JSON.parse(fs.readFileSync(keypairPath, "utf8"));
  const authority = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(raw));

  const connection = new anchor.web3.Connection(DEVNET_RPC, "confirmed");
  const wallet     = new anchor.Wallet(authority);
  const provider   = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

  const idl = await Program.fetchIdl(PROGRAM_ID, provider);
  if (!idl) throw new Error("IDL not found on-chain. Did you upload it?");

  const program = new Program(idl as anchor.Idl, provider);

  const [registryPDA] = PublicKey.findProgramAddressSync([Buffer.from("registry")], PROGRAM_ID);

  console.log("Registry PDA:", registryPDA.toBase58());
  console.log("Authority:   ", authority.publicKey.toBase58());

  try {
    const existing = await (program.account as any).registry.fetch(registryPDA);
    console.log("✅ Registry already initialized:");
    console.log("   Total agents:", existing.totalAgents.toNumber());
    console.log("   Total TVL:   ", existing.totalTvl.toNumber());
    return;
  } catch {
    console.log("Registry not found — initializing...");
  }

  const tx = await (program.methods as any)
    .initializeRegistry(PROTOCOL_FEE_BPS)
    .accounts({
      registry:      registryPDA,
      authority:     authority.publicKey,
      treasury:      authority.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .signers([authority])
    .rpc();

  console.log(`✅ Registry initialized!`);
  console.log(`   TX: https://solscan.io/tx/${tx}?cluster=devnet`);
  console.log(`   Registry PDA: ${registryPDA.toBase58()}`);
}

main().catch(err => { console.error(err); process.exit(1); });
