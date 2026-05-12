const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Generate a stable anonymous voter ID for this browser session
function getVoterId(): string {
  let id = (typeof window !== 'undefined' && (window as any).__axiom_voter_id);
  if (!id) {
    id = 'anon_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    if (typeof window !== 'undefined') (window as any).__axiom_voter_id = id;
  }
  return id;
}

export const api = {
  getAgents: () => fetch(`${BASE}/api/agents`, {cache:'no-store'}).then(r=>r.json()),
  getAgent:  (p: string) => fetch(`${BASE}/api/agents/${p}`, {cache:'no-store'}).then(r=>r.json()),
  getStats:  () => fetch(`${BASE}/api/stats`, {cache:'no-store'}).then(r=>r.json()),
  getPortfolio: (w: string) => fetch(`${BASE}/api/portfolio?wallet=${w}`, {cache:'no-store'}).then(r=>r.json()),
  stake:     (d: any) => fetch(`${BASE}/api/stake`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).then(r=>r.json()),
  vote:      (pubkey: string, type: string) => fetch(`${BASE}/api/agents/${pubkey}/vote`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type, voter: getVoterId()})}).then(r=>r.json()),
};
