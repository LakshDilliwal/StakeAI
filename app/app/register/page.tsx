"use client";
import { useState } from "react";
import { useWallet, useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { getAxiom6Program, getRegistryPDA } from "../../lib/axiom6";
import { WalletGate } from "../../components/WalletGate";

const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const STRATEGIES = [
  "Momentum Scalper","Mean Reversion","Arbitrage Hunter",
  "ML Trend Follow","Grid Trading","Sentiment Analysis",
  "Multi-DEX Arb","Funding Rate",
];

function RegisterInner() {
  const { connected, publicKey, signTransaction } = useWallet();
  const wallet = useAnchorWallet();
  const { connection } = useConnection();
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState(STRATEGIES[0]);
  const [fee, setFee] = useState("10");
  const [status, setStatus] = useState<"idle"|"pending"|"success"|"error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [agentAddress, setAgentAddress] = useState("");
  const [agentPubkeyStr, setAgentPubkeyStr] = useState("");
  const [txSig, setTxSig] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const handleDeploy = async () => {
    if (!connected || !wallet || !publicKey || !signTransaction) {
      setErrorMsg("Connect your wallet first."); setStatus("error"); return;
    }
    if (!name.trim()) {
      setErrorMsg("Enter an agent name."); setStatus("error"); return;
    }
    const feeBps = Math.round(parseFloat(fee) * 100);
    if (feeBps > 3000) {
      setErrorMsg("Max performance fee is 30%."); setStatus("error"); return;
    }
    try {
      setStatus("pending");
      setErrorMsg("");

      const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
      const program = getAxiom6Program(provider);
      const [registryPDA] = getRegistryPDA();

      const agentKeypair = Keypair.generate();
      const agentPubkey = agentKeypair.publicKey;

      const [agentStatePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), agentPubkey.toBuffer()],
        program.programId
      );

      const vaultUsdcAta = await getAssociatedTokenAddress(
        USDC_MINT,
        agentStatePDA,
        true,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      const tx = new Transaction();

      const vaultAtaInfo = await connection.getAccountInfo(vaultUsdcAta);
      if (!vaultAtaInfo) {
        tx.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            vaultUsdcAta,
            agentStatePDA,
            USDC_MINT,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          )
        );
      }

      const registerIx = await (program.methods as any)
        .registerAgent(new BN(feeBps), [USDC_MINT])
        .accounts({
          registry: registryPDA,
          agentState: agentStatePDA,
          developer: publicKey,
          agentPubkey: agentPubkey,
          vaultUsdcAta: vaultUsdcAta,
          systemProgram: SystemProgram.programId,
        })
        .instruction();

      tx.add(registerIx);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;

      const signed = await signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        "confirmed"
      );

      let savedApiKey = "";
      const agentPubkeyBase58 = agentPubkey.toBase58();
      try {
        const backendRes = await fetch(`${API}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentPubkey: agentPubkeyBase58,
            agentName: name.trim(),
            strategy: strategy,
            performanceFeeBps: feeBps,
            ownerWallet: publicKey.toBase58(),
          }),
        });
        const backendData = await backendRes.json();
        savedApiKey = backendData.apiKey ?? "";

        // Save to sessionStorage so /my-agent can auto-load without manual entry
        if (savedApiKey) {
          const ownerKey = publicKey.toBase58();
          // Store list of agent pubkeys for this wallet
          const existing = JSON.parse(sessionStorage.getItem(`axiom6_agents_${ownerKey}`) ?? "[]");
          if (!existing.includes(agentPubkeyBase58)) {
            existing.push(agentPubkeyBase58);
            sessionStorage.setItem(`axiom6_agents_${ownerKey}`, JSON.stringify(existing));
          }
          // Store API key per agent
          sessionStorage.setItem(`axiom6_apikey_${agentPubkeyBase58}`, savedApiKey);
          // Keep last active agent for quick access
          sessionStorage.setItem(`axiom6_last_agent_${ownerKey}`, agentPubkeyBase58);
        }
      } catch (backendErr) {
        console.warn("Backend register failed (non-fatal):", backendErr);
      }

      setAgentAddress(agentStatePDA.toBase58());
      setAgentPubkeyStr(agentPubkeyBase58);
      setTxSig(signature);
      setApiKey(savedApiKey);
      setStatus("success");
    } catch (err: any) {
      console.error("[registerAgent]", err);
      const msg = err?.logs?.join("\n") || err?.message || "Deploy failed";
      setErrorMsg(msg);
      setStatus("error");
    }
  };

  return (
    <main className="max-w-xl mx-auto px-4 py-16">
      <h1 className="text-xl font-bold text-white mb-1">Deploy Agent</h1>
      <p className="text-xs text-gray-500 mb-8">Register your AI trading agent on Solana devnet</p>

      {status === "success" ? (
        <div className="border border-[#01696f]/40 bg-[#01696f]/10 rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <span className="w-2 h-2 rounded-full bg-[#01696f] animate-pulse" />
            <p className="text-[#01696f] text-sm font-medium">Agent Deployed & Registered</p>
          </div>

          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Agent Pubkey</p>
            <div className="flex items-center gap-2 bg-[#111] rounded p-2">
              <p className="text-xs font-mono text-white break-all flex-1">{agentPubkeyStr}</p>
              <button onClick={() => copy(agentPubkeyStr, "pubkey")} className="text-[10px] font-mono text-gray-500 hover:text-white shrink-0 transition-colors">
                {copied === "pubkey" ? "✓" : "copy"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">Agent State PDA</p>
            <p className="text-xs font-mono text-gray-400 break-all bg-[#111] rounded p-2">{agentAddress}</p>
          </div>

          {apiKey && (
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">API Key — save this now, shown once</p>
              <div className="flex items-center gap-2 bg-[#111] rounded p-2 border border-yellow-900/40">
                <p className="text-xs font-mono text-yellow-400 break-all flex-1">{apiKey}</p>
                <button onClick={() => copy(apiKey, "apikey")} className="text-[10px] font-mono text-gray-500 hover:text-yellow-400 shrink-0 transition-colors">
                  {copied === "apikey" ? "✓" : "copy"}
                </button>
              </div>
              <p className="text-[10px] text-gray-600 font-mono mt-1.5">✓ Also saved to this session — visit My Agent to manage it.</p>
            </div>
          )}

          <div>
            <p className="text-gray-400 text-[10px] uppercase tracking-widest mb-1">TX Signature</p>
            <a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono text-[#4f98a3] break-all bg-[#111] rounded p-2 block hover:underline">{txSig}</a>
          </div>

          <div className="flex gap-2">
            <a href="/my-agent"
              className="flex-1 text-center px-4 py-2 bg-[#01696f] hover:bg-[#01595e] text-white rounded text-xs font-medium transition-colors">
              Go to My Agent →
            </a>
            <button onClick={() => { setStatus("idle"); setName(""); setTxSig(""); setApiKey(""); }}
              className="flex-1 px-4 py-2 border border-[#1f1f1f] text-gray-400 hover:text-white rounded text-xs transition-colors">
              Deploy Another
            </button>
          </div>
        </div>
      ) : (
        <div className="border border-[#1f1f1f] bg-[#111] rounded-lg p-6 flex flex-col gap-5">
          {status === "error" && (
            <div className="border border-red-900/50 bg-red-900/10 rounded p-3 max-h-40 overflow-auto">
              <p className="text-red-400 text-xs font-mono whitespace-pre-wrap">{errorMsg}</p>
            </div>
          )}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Agent Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Alpha-7"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none transition-colors placeholder:text-gray-700" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Strategy</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none cursor-pointer">
              {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1.5">Performance Fee (%) — max 30%</label>
            <input type="number" value={fee} onChange={e => setFee(e.target.value)} min="0" max="30" step="0.5"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded px-3 py-2.5 text-sm text-white font-mono focus:border-[#01696f] outline-none transition-colors" />
          </div>
          <div className="border border-[#1f1f1f] rounded p-3 bg-[#0a0a0a]">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">Developer Wallet</p>
            <p className="text-xs font-mono text-gray-300">{publicKey?.toBase58()}</p>
          </div>
          <button onClick={handleDeploy} disabled={status === "pending"}
            className="w-full py-2.5 bg-[#01696f] hover:bg-[#01595e] disabled:opacity-50 text-white rounded text-sm font-medium transition-colors flex items-center justify-center gap-2">
            {status === "pending"
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Deploying...</>
              : "Deploy Agent on Devnet"}
          </button>
        </div>
      )}
    </main>
  );
}

export default function Register() {
  return (
    <WalletGate
      title="Connect your wallet"
      description="You need a connected Solana wallet to deploy and register an AI trading agent."
    >
      <RegisterInner />
    </WalletGate>
  );
}
