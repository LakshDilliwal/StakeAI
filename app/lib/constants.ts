import { PublicKey } from "@solana/web3.js";
export const PROGRAM_ID = new PublicKey("2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ");
export const DEVNET_RPC_URL = "https://api.devnet.solana.com";
export const PYTH_FEEDS = {
  SOL: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLw5HKPteL2s4"),
  USDC: new PublicKey("5SSkXsEKQepjZPoZCXFzcpEqxX2vQ1o4nEM9X13gG1wA"),
  BTC: new PublicKey("HovQMDrbAgAYxDvA2Zo1aA7K21L2H9J4d6d8T8y9Y7bX"),
};
export const JUPITER_PROGRAM_ID = new PublicKey("JUP6LkbZbjS1jKKwapdH67y95eVxmA58WwNiE8kQc6a");
export const SHARES_MULTIPLIER = 1_000_000;
