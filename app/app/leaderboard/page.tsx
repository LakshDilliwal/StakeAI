"use client";
import { useState, useMemo } from "react";
import Link from "next/link";

const STRATEGIES = ["All Strategies","Momentum Scalper","Delta Neutral","Mean Reversion","Arbitrage Hunter","Grid Trading","Sentiment Analysis"];
const SORT_OPTIONS = [{label:"TVL",key:"tvl"},{label:"APY",key:"apy"},{label:"Win Rate",key:"winRate"},{label:"PnL",key:"pnl"}];

interface Agent {
  rank:number; name:string; pubkey:string; strategy:string;
  tvl:number; apy:number; winRate:number; pnl:number; trades:number;
  status:"active"|"paused"; isNew?:boolean;
}

const MOCK_AGENTS: Agent[] = [
  {rank:1,name:"StakeAI Alpha",      pubkey:"7sKSU5At",strategy:"Momentum Scalper", tvl:128450,apy:18.6,winRate:71.2,pnl:23841, trades:2847,status:"active"},
  {rank:2,name:"Sigma Delta",       pubkey:"9xKMT2Pq",strategy:"Delta Neutral",    tvl:94200, apy:14.3,winRate:68.5,pnl:13486, trades:1920,status:"active"},
  {rank:3,name:"Mean Rev Bot",      pubkey:"AcKp7Rz3",strategy:"Mean Reversion",   tvl:76300, apy:11.8,winRate:64.0,pnl:9012,  trades:1540,status:"active"},
  {rank:4,name:"Arb Hunter IV",     pubkey:"Bm2nP8Xt",strategy:"Arbitrage Hunter", tvl:55000, apy:9.4, winRate:59.3,pnl:5170,  trades:3210,status:"active"},
  {rank:5,name:"Grid Master Pro",   pubkey:"Cw8sL1Qa",strategy:"Grid Trading",     tvl:34100, apy:7.2, winRate:55.1,pnl:2460,  trades:890, status:"paused"},
  {rank:6,name:"Sentiment Alpha",   pubkey:"Dv3kR5Nz",strategy:"Sentiment Analysis",tvl:21900,apy:5.8, winRate:52.0,pnl:1272,  trades:412, status:"active",isNew:true},
  {rank:7,name:"Newborn Quant",     pubkey:"Ev1bQ2Mx",strategy:"Momentum Scalper", tvl:5200,  apy:0,   winRate:0,   pnl:0,     trades:0,   status:"active",isNew:true},
];

function fmt(n:number,d=2){return n.toLocaleString("en-US",{maximumFractionDigits:d});}

export default function Leaderboard() {
  const [strategy,setStrategy]   = useState("All Strategies");
  const [sortKey,setSortKey]     = useState<"tvl"|"apy"|"winRate"|"pnl">("tvl");
  const [sortDir,setSortDir]     = useState<"desc"|"asc">("desc");
  const [watchlist,setWatchlist] = useState<Set<string>>(new Set());

  const toggleWatchlist = (pk:string) =>
    setWatchlist(prev=>{const s=new Set(prev);s.has(pk)?s.delete(pk):s.add(pk);return s;});

  const toggleSort = (key:typeof sortKey) => {
    if(key===sortKey)setSortDir(d=>d==="desc"?"asc":"desc");
    else{setSortKey(key);setSortDir("desc");}
  };

  const filtered = useMemo(()=>{
    let list=[...MOCK_AGENTS];
    if(strategy!=="All Strategies")list=list.filter(a=>a.strategy===strategy);
    list.sort((a,b)=>sortDir==="desc"?b[sortKey]-a[sortKey]:a[sortKey]-b[sortKey]);
    return list;
  },[strategy,sortKey,sortDir]);

  const watched = MOCK_AGENTS.filter(a=>watchlist.has(a.pubkey));

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Agent Leaderboard</h1>
        <p className="text-xs text-gray-500 mt-1">Ranked by risk-adjusted performance · Updated every epoch</p>
      </div>

      {watched.length>0&&(
        <div className="border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-3 font-mono">⭐ Your Watchlist</p>
          <div className="flex flex-wrap gap-2">
            {watched.map(a=>(
              <Link key={a.pubkey} href={`/agent/${a.pubkey}`}
                className="flex items-center gap-2 border border-[#2a2a2a] bg-[#111] hover:border-[#01696f]/50 rounded-lg px-3 py-2 text-xs transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#01696f]"/>
                <span className="font-medium text-white">{a.name}</span>
                <span className="text-gray-600 font-mono">{a.apy>0?`${a.apy}% APY`:"New"}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select value={strategy} onChange={e=>setStrategy(e.target.value)}
            className="appearance-none bg-[#111] border border-[#2a2a2a] text-xs text-gray-300 font-mono rounded-lg px-3 py-2 pr-8 focus:border-[#01696f] outline-none cursor-pointer transition-colors">
            {STRATEGIES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 text-[10px]">▼</span>
        </div>
        <div className="flex items-center border border-[#2a2a2a] rounded-lg overflow-hidden">
          <span className="text-[10px] text-gray-600 px-3 font-mono uppercase tracking-wider border-r border-[#2a2a2a]">Sort</span>
          {SORT_OPTIONS.map(o=>(
            <button key={o.key} onClick={()=>toggleSort(o.key as typeof sortKey)}
              className={`px-3 py-2 text-[11px] font-mono transition-colors border-r border-[#1f1f1f] last:border-0 ${sortKey===o.key?"bg-[#01696f]/15 text-[#01696f]":"text-gray-500 hover:text-gray-300"}`}>
              {o.label}{sortKey===o.key&&<span className="ml-1">{sortDir==="desc"?"↓":"↑"}</span>}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-gray-700 font-mono ml-auto">{filtered.length} agents</span>
      </div>

      <div className="border border-[#1f1f1f] rounded-xl overflow-hidden">
        <div className="grid grid-cols-[28px_28px_1fr_140px_90px_90px_88px_80px_160px] gap-0 px-4 py-2.5 border-b border-[#1a1a1a] bg-[#0a0a0a]">
          {["","#","AGENT","STRATEGY","TVL","APY","WIN RATE","TRADES",""].map((h,i)=>(
            <span key={i} className="text-[9px] font-mono text-gray-600 uppercase tracking-widest">{h}</span>
          ))}
        </div>
        {filtered.map((agent,idx)=>(
          <div key={agent.pubkey}
            className="grid grid-cols-[28px_28px_1fr_140px_90px_90px_88px_80px_160px] gap-0 px-4 py-3.5 border-b border-[#111] last:border-0 hover:bg-[#0d0d0d] transition-colors items-center group">
            <button onClick={()=>toggleWatchlist(agent.pubkey)}
              className={`text-sm transition-colors ${watchlist.has(agent.pubkey)?"text-yellow-400":"text-gray-700 hover:text-gray-500"}`}
              title={watchlist.has(agent.pubkey)?"Remove from watchlist":"Add to watchlist"}>
              {watchlist.has(agent.pubkey)?"★":"☆"}
            </button>
            <span className={`text-xs font-mono font-bold ${idx===0?"text-yellow-400":idx===1?"text-gray-400":idx===2?"text-amber-700":"text-gray-600"}`}>{idx+1}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                {agent.isNew&&<span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#01696f]/15 text-[#01696f] border border-[#01696f]/20">NEW</span>}
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${agent.status==="active"?"bg-[#01696f]":"bg-yellow-600"}`}/>
              </div>
              <span className="text-[10px] font-mono text-gray-600">{agent.pubkey}…</span>
            </div>
            <span className="text-[10px] font-mono text-gray-500 truncate pr-2">{agent.strategy}</span>
            <span className="text-xs font-mono text-white tabular-nums">
              {agent.tvl>0?`$${fmt(agent.tvl,0)}`:<span className="text-gray-700 text-[10px]" title="Awaiting first deposit">—</span>}
            </span>
            <span className={`text-xs font-mono tabular-nums ${agent.apy>0?"text-[#01696f]":"text-gray-700"}`}>
              {agent.apy>0?`${agent.apy}%`:(
                <span title="No settled epochs yet. APY calculated after first epoch settlement.">
                  <span className="text-gray-700">—</span><span className="text-[9px] text-gray-700 ml-1 cursor-help">ⓘ</span>
                </span>
              )}
            </span>
            <span className={`text-xs font-mono tabular-nums ${agent.winRate>0?"text-gray-300":"text-gray-700"}`}>
              {agent.winRate>0?`${agent.winRate}%`:(
                <span title="Win rate populates after 10+ completed trades">
                  <span className="text-gray-700">—</span><span className="text-[9px] text-gray-700 ml-1 cursor-help">ⓘ</span>
                </span>
              )}
            </span>
            <span className="text-xs font-mono text-gray-400 tabular-nums">
              {agent.trades>0?fmt(agent.trades,0):<span className="text-gray-700 text-[10px]" title="Awaiting first trade execution">0</span>}
            </span>
            <div className="flex items-center gap-1.5 justify-end">
              <Link href={`/agent/${agent.pubkey}`}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all"
                style={{background:"linear-gradient(135deg,#01696f,#0c4e54)",boxShadow:"0 0 0 1px #01696f40"}}>
                Stake
              </Link>
              <Link href={`/agent/${agent.pubkey}`}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-gray-500 border border-[#2a2a2a] hover:border-[#3a3a3a] hover:text-gray-300 transition-colors">
                Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-mono text-gray-700 text-center">Performance data sourced from on-chain PDA state · Past returns do not guarantee future performance</p>
    </main>
  );
}
