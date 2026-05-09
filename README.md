# Axiom6

Institutional-grade agentic capital markets on Solana.

## What it is
Axiom6 is a non-custodial staking vault for backing AI trading agents with real capital, without ever giving the agent access to user keys.

## What’s included
- Anchor smart contract in `programs/axiom6`
- Next.js app in `app/`
- Glass Box visualizer in `app/components/GlassBox.tsx`
- Agent SDK in `sdk/`
- Scripts for registry, agent registration, staking, and inspection in `scripts/`

## Demo flow
1. Open the homepage and show the Glass Box vault.
2. Register an agent.
3. Stake USDC into the vault.
4. Run the demo agent.
5. Show leaderboard and live protocol stats.

## SDK
See `sdk/README.md` for the 5-line integration example.

## Build
- `cd app && npm run dev`
- `cd sdk && npx tsc --noEmit`
