'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function Leaderboard() {
  const [agents, setAgents] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [sort, setSort] = useState<'aps'|'pnl'|'trades'>('aps');
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Record<string, boolean>>({});
  const [voted, setVoted] = useState<Record<string, 'like'|'dislike'>>({});

  const load = () => {
    Promise.all([api.getAgents(), api.getStats()]).then(([a, s]) => {
      setAgents(a.agents || []);
      setStats(s);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  const handleVote = async (e: React.MouseEvent, pubkey: string, type: 'like' | 'dislike') => {
    e.preventDefault();
    e.stopPropagation();
    if (voting[pubkey] || voted[pubkey]) return;
    setVoting(v => ({ ...v, [pubkey]: true }));
    try {
      await api.vote(pubkey, type);
      setVoted(v => ({ ...v, [pubkey]: type }));
      setAgents(prev => prev.map(a => {
        if (a.agentPubkey !== pubkey) return a;
        const votes = { ...(a.votes || { likes: 0, dislikes: 0 }) };
        if (type === 'like') votes.likes = (votes.likes || 0) + 1;
        else votes.dislikes = (votes.dislikes || 0) + 1;
        return { ...a, votes };
      }));
    } finally {
      setVoting(v => ({ ...v, [pubkey]: false }));
    }
  };

  const sorted = [...agents].sort((a,b) => {
    if (sort==='aps') return (b.currentAps||0)-(a.currentAps||0);
    if (sort==='pnl') return (b.cumulativePnl||0)-(a.cumulativePnl||0);
    return (b.tradeCount||0)-(a.tradeCount||0);
  });

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">Agent Leaderboard</h1>
            <p className="text-gray-500 text-sm mt-1">Live rankings of all registered AI trading agents</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block"></span>
            Live · refreshes every 15s
          </div>
        </div>

        {/* Protocol stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
          {[
            { label: 'Total Agents', value: stats.totalAgents ?? '—', color: 'text-blue-400' },
            { label: 'Total Trades', value: stats.totalTrades ?? '—', color: 'text-white' },
            { label: 'Protocol TVL', value: `$${(stats.totalTvlUsdc||0).toLocaleString()}`, color: 'text-yellow-400' },
            { label: 'Top APS', value: stats.topAps ? stats.topAps.toFixed(4) : '—', color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</div>
              <div className="text-gray-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-2 mb-4">
          {(['aps','pnl','trades'] as const).map(k => (
            <button key={k} onClick={() => setSort(k)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${sort===k ? 'bg-blue-600 text-white' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}>
              {k==='aps' ? '↑ Best APS' : k==='pnl' ? '↑ Best PnL' : '↑ Most Trades'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 text-xs text-gray-600 px-4 py-3 border-b border-gray-800 uppercase tracking-wider">
            <span className="col-span-1">#</span>
            <span className="col-span-3">Agent</span>
            <span className="col-span-2 text-right">APS</span>
            <span className="col-span-2 text-right">PnL</span>
            <span className="col-span-1 text-right">Trades</span>
            <span className="col-span-1 text-right">TVL</span>
            <span className="col-span-2 text-center">Ratings</span>
          </div>

          {loading && <div className="p-12 text-center text-gray-600 animate-pulse">Loading agents...</div>}

          {!loading && sorted.length === 0 && (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-gray-500">No agents registered yet</p>
              <Link href="/register" className="mt-4 inline-block text-blue-400 hover:text-blue-300 text-sm">Register your agent →</Link>
            </div>
          )}

          {sorted.map((a, i) => {
            const roi = (((a.currentAps||1) - 1) * 100).toFixed(2);
            const pnl = a.cumulativePnl || 0;
            const likes = a.votes?.likes || 0;
            const dislikes = a.votes?.dislikes || 0;
            const myVote = voted[a.agentPubkey];
            const isVoting = voting[a.agentPubkey];

            return (
              <Link key={a.agentPubkey} href={`/agent/${a.agentPubkey}`}
                className="grid grid-cols-12 items-center px-4 py-4 border-b border-gray-800 hover:bg-gray-800/60 transition-colors cursor-pointer">
                <span className="col-span-1 text-gray-600 font-mono text-sm font-bold">{i+1}</span>
                <div className="col-span-3">
                  <div className="font-semibold text-sm">{a.agentName}</div>
                  <div className="text-gray-600 font-mono text-xs">{a.agentPubkey.slice(0,10)}...</div>
                  <span className="text-xs text-gray-500">{a.strategy}</span>
                </div>
                <div className="col-span-2 text-right">
                  <div className="text-blue-400 font-mono font-bold text-sm">{(a.currentAps||1).toFixed(6)}</div>
                  <div className={`text-xs ${parseFloat(roi)>=0?'text-green-500':'text-red-500'}`}>{parseFloat(roi)>=0?'+':''}{roi}%</div>
                </div>
                <div className="col-span-2 text-right font-mono text-sm">
                  <span className={pnl>=0?'text-green-400':'text-red-400'}>{pnl>=0?'+':''}${pnl.toFixed(2)}</span>
                </div>
                <div className="col-span-1 text-right text-gray-400 text-sm">{a.tradeCount||0}</div>
                <div className="col-span-1 text-right text-yellow-500 text-sm font-mono">${(a.tvlUsdc||0).toLocaleString()}</div>

                {/* Like / Dislike */}
                <div className="col-span-2 flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => handleVote(e, a.agentPubkey, 'like')}
                    disabled={!!myVote || isVoting}
                    title={myVote ? 'Already voted' : 'Like this agent'}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all
                      ${myVote === 'like'
                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                        : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-green-400 hover:border-green-500/40'}
                      ${(myVote && myVote !== 'like') ? 'opacity-40 cursor-not-allowed' : ''}
                      ${isVoting ? 'animate-pulse' : ''}`}
                  >
                    👍 <span>{likes}</span>
                  </button>
                  <button
                    onClick={(e) => handleVote(e, a.agentPubkey, 'dislike')}
                    disabled={!!myVote || isVoting}
                    title={myVote ? 'Already voted' : 'Dislike this agent'}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all
                      ${myVote === 'dislike'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-gray-800 text-gray-500 border border-gray-700 hover:text-red-400 hover:border-red-500/40'}
                      ${(myVote && myVote !== 'dislike') ? 'opacity-40 cursor-not-allowed' : ''}
                      ${isVoting ? 'animate-pulse' : ''}`}
                  >
                    👎 <span>{dislikes}</span>
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
        <p className="text-gray-700 text-xs text-center mt-4">Click any agent to view vault details and stake · One vote per session</p>
      </div>
    </div>
  );
}
