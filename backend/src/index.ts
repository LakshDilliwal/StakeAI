import express from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, "../db.json");

function readDb() {
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ agents: {}, stakes: [] }));
  const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
  if (!raw.stakes) raw.stakes = [];
  for (const key of Object.keys(raw.agents ?? {})) {
    if (!raw.agents[key].votes) raw.agents[key].votes = { likes: 0, dislikes: 0, voters: {} };
    if (!raw.agents[key].ownerWallet) raw.agents[key].ownerWallet = null;
    if (!raw.agents[key].trades) raw.agents[key].trades = [];
  }
  return raw;
}
function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ── Register Agent ───────────────────────────────────────────────────────────
app.post("/api/register", (req, res) => {
  const { agentPubkey, agentName, strategy, performanceFeeBps, ownerWallet } = req.body;
  if (!agentPubkey || !agentName) return res.status(400).json({ error: "agentPubkey and agentName required" });
  const db = readDb();
  if (db.agents[agentPubkey]) return res.json({ apiKey: db.agents[agentPubkey].apiKey, existing: true });
  const apiKey = uuidv4();
  db.agents[agentPubkey] = {
    apiKey,
    agentName,
    strategy,
    performanceFeeBps,
    ownerWallet: ownerWallet ?? null,
    registeredAt: Date.now(),
    trades: [],
    currentAps: 1.0,
    tvlUsdc: 0,
    votes: { likes: 0, dislikes: 0, voters: {} },
  };
  writeDb(db);
  res.json({ apiKey, agentPubkey, message: "Agent registered. Save your API key." });
});

// ── Report Trade ─────────────────────────────────────────────────────────────
app.post("/api/report-trade", (req, res) => {
  const apiKey = req.headers["x-api-key"] as string;
  const { agentPubkey, txSignature, pnlUsdc, newAps } = req.body;
  if (!apiKey || !agentPubkey) return res.status(401).json({ error: "Missing API key or agentPubkey" });
  const db = readDb();
  const agent = db.agents[agentPubkey];
  if (!agent || agent.apiKey !== apiKey) return res.status(403).json({ error: "Invalid API key" });
  if (txSignature === "verify_only") return res.json({ ok: true, verified: true });
  const trade = { txSignature, pnlUsdc, newAps: newAps ?? null, reportedAt: Date.now() };
  agent.trades.push(trade);
  if (newAps) agent.currentAps = newAps;
  writeDb(db);
  res.json({ ok: true, trade });
});

// ── Get All Agents ────────────────────────────────────────────────────────────
app.get("/api/agents", (req, res) => {
  const db = readDb();
  const agents = Object.entries(db.agents).map(([pubkey, data]: [string, any]) => ({
    agentPubkey: pubkey,
    agentName: data.agentName,
    strategy: data.strategy,
    performanceFeeBps: data.performanceFeeBps,
    currentAps: data.currentAps,
    tradeCount: (data.trades || []).length,
    tvlUsdc: data.tvlUsdc || 0,
    registeredAt: data.registeredAt,
    ownerWallet: data.ownerWallet ?? null,
    likes: data.votes?.likes ?? 0,
    dislikes: data.votes?.dislikes ?? 0,
  }));
  res.json({ agents });
});

// ── Get Agents by Owner Wallet ────────────────────────────────────────────────
app.get("/api/my-agents", (req, res) => {
  const wallet = req.query.wallet as string;
  if (!wallet) return res.status(400).json({ error: "wallet query param required" });
  const db = readDb();
  const agents = Object.entries(db.agents)
    .filter(([_, data]: [string, any]) => data.ownerWallet === wallet)
    .map(([pubkey, data]: [string, any]) => ({
      agentPubkey: pubkey,
      agentName: data.agentName,
      strategy: data.strategy,
      performanceFeeBps: data.performanceFeeBps,
      currentAps: data.currentAps,
      tradeCount: (data.trades || []).length,
      tvlUsdc: data.tvlUsdc || 0,
      registeredAt: data.registeredAt,
      likes: data.votes?.likes ?? 0,
      dislikes: data.votes?.dislikes ?? 0,
    }));
  res.json({ agents });
});

// ── Get Single Agent ──────────────────────────────────────────────────────────
app.get("/api/agents/:pubkey", (req, res) => {
  const db = readDb();
  const agent = db.agents[req.params.pubkey];
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const { apiKey, ...safe } = agent;
  res.json({ ...safe, agentPubkey: req.params.pubkey });
});

// ── Like / Dislike ────────────────────────────────────────────────────────────
app.post("/api/agents/:pubkey/vote", (req, res) => {
  const { pubkey } = req.params;
  const { voter, type } = req.body as { voter: string; type: "like" | "dislike" };
  if (!voter || !type || !["like", "dislike"].includes(type)) {
    return res.status(400).json({ error: "voter and type (like|dislike) required" });
  }
  const db = readDb();
  const agent = db.agents[pubkey];
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  if (!agent.votes) agent.votes = { likes: 0, dislikes: 0, voters: {} };
  const prev = agent.votes.voters[voter];
  if (prev === type) {
    agent.votes[type === "like" ? "likes" : "dislikes"] = Math.max(0, agent.votes[type === "like" ? "likes" : "dislikes"] - 1);
    delete agent.votes.voters[voter];
  } else {
    if (prev) {
      agent.votes[prev === "like" ? "likes" : "dislikes"] = Math.max(0, agent.votes[prev === "like" ? "likes" : "dislikes"] - 1);
    }
    agent.votes[type === "like" ? "likes" : "dislikes"] += 1;
    agent.votes.voters[voter] = type;
  }
  writeDb(db);
  res.json({ likes: agent.votes.likes, dislikes: agent.votes.dislikes, myVote: agent.votes.voters[voter] ?? null });
});

// ── Trade History ─────────────────────────────────────────────────────────────
app.get("/api/trades/:pubkey", (req, res) => {
  const db = readDb();
  const agent = db.agents[req.params.pubkey];
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ trades: agent.trades ?? [], total: (agent.trades ?? []).length });
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get("/api/stats", (req, res) => {
  const db = readDb();
  const agents = Object.values(db.agents) as any[];
  res.json({
    totalAgents: agents.length,
    totalTrades: agents.reduce((s: number, a: any) => s + (a.trades?.length || 0), 0),
    totalTvlUsdc: agents.reduce((s: number, a: any) => s + (a.tvlUsdc || 0), 0),
    topAps: agents.length ? Math.max(...agents.map((a: any) => a.currentAps || 0)) : 0,
  });
});

// ── Stake ─────────────────────────────────────────────────────────────────────
app.post("/api/stake", (req, res) => {
  const { wallet, agentPubkey, amountUsdc } = req.body;
  if (!wallet || !agentPubkey || !amountUsdc)
    return res.status(400).json({ error: "Missing fields" });
  const db = readDb();
  const agent = db.agents[agentPubkey];
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const shares = Number(amountUsdc) / (agent.currentAps || 1);
  db.stakes.push({ wallet, agentPubkey, amountUsdc: Number(amountUsdc), shares, stakedAt: Date.now() });
  agent.tvlUsdc = (agent.tvlUsdc || 0) + Number(amountUsdc);
  writeDb(db);
  res.json({ success: true, shares });
});

// ── Portfolio ─────────────────────────────────────────────────────────────────
app.get("/api/portfolio", (req, res) => {
  const wallet = req.query.wallet as string;
  if (!wallet) return res.status(400).json({ error: "wallet required" });
  const db = readDb();
  res.json({ stakes: db.stakes.filter((s: any) => s.wallet === wallet) });
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(Number(PORT), "0.0.0.0", () => console.log(`Axiom6 API running on port ${PORT}`));
