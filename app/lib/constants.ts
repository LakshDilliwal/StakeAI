import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "2aFgAGbsujHkPyaHFyqUy5wPNCmPmYsbv9AtxS9FpykJ"
);

// Devnet USDC mint
export const USDC_MINT = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export const NETWORK = "devnet";
export const RPC_URL = "https://api.devnet.solana.com";

// Alias used by layout.tsx
export const DEVNET_RPC_URL = RPC_URL;
