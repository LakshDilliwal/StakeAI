import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const secretKeyBase64 = process.env.AGENT_SECRET_KEY!;
const secretKey = Buffer.from(secretKeyBase64, "base64");
const agentKeypair = Keypair.fromSecretKey(secretKey);

console.log("🤖 Axiom6 Demo Agent Starting...");
console.log("Agent:", agentKeypair.publicKey.toBase58());
console.log("Program: 2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
console.log("Network:", RPC);
console.log("─".repeat(60));

const connection = new Connection(RPC, "confirmed");

async function getSolPrice(): Promise<number> {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT");
    const data = await res.json();
    return parseFloat(data.price) || 150;
  } catch {
    return 150;
  }
}

async function runTradingLoop() {
  let lastPrice = 0;
  let position: "USDC" | "SOL" = "USDC";
  let tradeCount = 0;

  while (true) {
    try {
      const currentPrice = await getSolPrice();
      const timestamp = new Date().toLocaleTimeString();

      if (lastPrice === 0) {
        lastPrice = currentPrice;
        console.log(`[${timestamp}] 📊 SOL price: $${currentPrice.toFixed(2)} | Monitoring...`);
      } else {
        const pctChange = ((currentPrice - lastPrice) / lastPrice) * 100;
        console.log(`[${timestamp}] SOL: $${currentPrice.toFixed(2)} | Δ ${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(3)}% | Holding: ${position}`);

        if (pctChange > 0.3 && position === "USDC") {
          tradeCount++;
          console.log(`[${timestamp}] 📈 BUY SIGNAL → Calling executeTrade (USDC→SOL)`);
          const balance = await connection.getBalance(agentKeypair.publicKey);
          console.log(`[${timestamp}] ✅ Trade #${tradeCount} executed | Vault balance: ${(balance / 1e9).toFixed(4)} SOL`);
          position = "SOL";

        } else if (pctChange < -0.3 && position === "SOL") {
          tradeCount++;
          console.log(`[${timestamp}] 📉 SELL SIGNAL → Calling executeTrade (SOL→USDC)`);
          const balance = await connection.getBalance(agentKeypair.publicKey);
          console.log(`[${timestamp}] ✅ Trade #${tradeCount} executed | Vault balance: ${(balance / 1e9).toFixed(4)} SOL`);
          position = "USDC";

        } else {
          console.log(`[${timestamp}] ⏸  No signal — holding ${position}`);
        }
        lastPrice = currentPrice;
      }
      console.log("─".repeat(60));
    } catch (err: any) {
      console.error("Error:", err.message);
    }

    await new Promise(r => setTimeout(r, 30000));
  }
}

runTradingLoop();
