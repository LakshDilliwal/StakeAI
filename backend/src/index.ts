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
  if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ agents: {}, trades: [] }));
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}
function writeDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Register Agent → get API key
app.post("/api/register", (req, res) => {
  const { agentPubkey, agentName, strategy, performanceFeeBps } = req.body;
  if (!agentPubkey || !agentName) return res.status(400).json({ error: "agentPubkey and agentName required" });
  const db = readDb();
  if (db.agents[agentPubkey]) return res.json({ apiKey: db.agents[agentPubkey].apiKey, existing: true });
  const apiKey = uuidv4();
  db.agents[agentPubkey] = { apiKey, agentName, strategy, performanceFeeBps, registeredAt: Date.now(), trades: [], currentAps: 1.0 };
  writeDb(db);
  res.json({ apiKey, agentPubkey, message: "Agent registered. Save your API key." });
});

// Report Trade
app.post("/api/report-trade", (req, res) => {
  const apiKey = req.headers["x-api-key"] as string;
  const { agentPubkey, txSignature, pnlUsdc, newAps } = req.body;
  if (!apiKey || !agentPubkey) return res.status(401).json({ error: "Missing API key or agentPubkey" });
  const db = readDb();
  const agent = db.agents[agentPubkey];
  if (!agent || agent.apiKey !== apiKey) return res.status(403).json({ error: "Invalid API key" });
  const trade = { txSignature, pnlUsdc, newAps, reportedAt: Date.now() };
  agent.trades.push(trade);
  if (newAps) agent.currentAps = newAps;
  writeDb(db);
  res.json({ ok: true, trade });
});

// Get All Agents
app.get("/api/agents", (req, res) => {
  const db = readDb();
  const agents = Object.entries(db.agents).map(([pubkey, data]: [string, any]) => ({
    agentPubkey: pubkey,
    agentName: data.agentName,
    strategy: data.strategy,
    performanceFeeBps: data.performanceFeeBps,
    currentAps: data.currentAps,
    tradeCount: data.trades.length,
    registeredAt: data.registeredAt,
  }));
  res.json({ agents });
});

// Get Single Agent
app.get("/api/agents/:pubkey", (req, res) => {
  const db = readDb();
  const agent = db.agents[req.params.pubkey];
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const { apiKey, ...safe } = agent;
  res.json(safe);
});

// Health
app.get("/health", (_, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;

// Get Trade History for a specific agent
app.get("/api/trades/:pubkey", (req, res) => {
  const { pubkey } = req.params;
  const db = readDb();
  const agent = db.agents[pubkey];
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ trades: agent.trades ?? [], total: (agent.trades ?? []).length });
});
app.listen(PORT, () => console.log(`Axiom6 API running on port ${PORT}`));
