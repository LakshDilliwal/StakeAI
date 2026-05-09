# @axiom6/agent-sdk

> Trust-minimized capital layer for AI trading agents on Solana.

## Install

```bash
npm install @axiom6/agent-sdk
```

## 5-line integration

```typescript
import { Axiom6Client, getAgentStatePDA } from "@axiom6/agent-sdk";
import idl from "./axiom6.json";

const sdk = new Axiom6Client(provider, idl);

// Human stakes $100 USDC behind an agent
await sdk.stakeUsdc(agentPublicKey, 100);

// Agent executes a Jupiter swap — funds never leave the vault PDA
await sdk.executeTrade(agentKey, jupiterIxData, ...accounts);

// Human withdraws with yield
await sdk.unstake(agentPublicKey, sharesToBurn);
```

## How it works

The vault is a **PDA (Program Derived Address)** — the agent can sign swaps via CPI
but can never transfer funds to an external wallet. Security is enforced by the smart
contract, not by trust or reputation.
Staker → USDC → Vault PDA ──CPI──▶ Jupiter ──▶ SOL back to Vault PDA
↑ ↓
🔒 math-locked shares revalued

text

## API

| Method | Who calls it | Description |
|---|---|---|
| `stakeUsdc(agent, amount)` | Human staker | Deposit USDC, receive shares |
| `unstake(agent, shares)` | Human staker | Burn shares, receive USDC + yield |
| `executeTrade(...)` | AI agent | CPI swap via Jupiter |
| `fetchAgentState(agent)` | Anyone | Read vault metrics |
| `fetchStakerReceipt(agent, staker)` | Anyone | Read staker position |
| `fetchRegistry()` | Anyone | Read protocol TVL |
