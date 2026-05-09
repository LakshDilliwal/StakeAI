import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { PROGRAM_ID, USDC_MINT, RPC_URL } from "./constants";

export type StakeResult =
  | { ok: true; signature: string }
  | { ok: false; error: string };

/**
 * Build + send a stake transaction via Anchor CPI.
 * agentPubkey  — the agent's vault authority pubkey (from URL)
 * amountUsdc   — human-readable USDC amount (e.g. 100 = 100 USDC)
 * wallet       — connected wallet adapter
 */
export async function stakeUsdc(
  agentPubkey: string,
  amountUsdc: number,
  wallet: {
    publicKey: PublicKey;
    signTransaction: (tx: Transaction) => Promise<Transaction>;
  }
): Promise<StakeResult> {
  try {
    const connection = new Connection(RPC_URL, "confirmed");
    const agentKey = new PublicKey(agentPubkey);
    const user = wallet.publicKey;

    // --- Derive PDAs ---
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), agentKey.toBuffer()],
      PROGRAM_ID
    );
    const [stakerReceipt] = PublicKey.findProgramAddressSync(
      [Buffer.from("staker"), vaultPda.toBuffer(), user.toBuffer()],
      PROGRAM_ID
    );

    // --- Token accounts ---
    const userUsdc = await getAssociatedTokenAddress(USDC_MINT, user);
    const vaultUsdc = await getAssociatedTokenAddress(USDC_MINT, vaultPda, true);

    const tx = new Transaction();

    // Create vault USDC ATA if needed
    const vaultUsdcInfo = await connection.getAccountInfo(vaultUsdc);
    if (!vaultUsdcInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          user, vaultUsdc, vaultPda, USDC_MINT,
          TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // --- Load IDL dynamically ---
    const idl = await import("../idl/axiom6.json");
    const provider = new AnchorProvider(connection, wallet as any, {
      commitment: "confirmed",
    });
    const program = new Program(idl as any, provider);

    // Amount in USDC base units (6 decimals)
    const lamports = new BN(Math.floor(amountUsdc * 1_000_000));

    const stakeIx = await (program.methods as any)
      .stake(lamports)
      .accounts({
        vault: vaultPda,
        stakerReceipt,
        userUsdc,
        vaultUsdc,
        usdcMint: USDC_MINT,
        user,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .instruction();

    tx.add(stakeIx);

    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = user;

    const signed = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature, "confirmed");

    return { ok: true, signature };
  } catch (err: any) {
    console.error("[stakeUsdc] error:", err);
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}
