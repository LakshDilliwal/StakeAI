"use client";
import { useEffect, useRef, useState } from "react";

interface Particle {
  id: number;
  type: "usdc" | "sol";
  phase: "falling" | "swapping" | "returning";
  x: number;
  progress: number;
  opacity: number;
}

interface GlassBoxProps {
  vaultUsdc: number;
  totalShares: number;
  aps: number;
  trades: number;
  active?: boolean;
}

export function GlassBox({ vaultUsdc, totalShares, aps, trades, active = true }: GlassBoxProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [swapping, setSwapping]   = useState(false);
  const [vaultGlow, setVaultGlow] = useState(false);
  const counterRef = useRef(0);
  const rafRef     = useRef<number>();

  // Animate particles
  useEffect(() => {
    if (!active) return;

    const interval = setInterval(() => {
      const id = counterRef.current++;
      // Spawn USDC particle falling in
      setParticles(p => [...p, {
        id, type: "usdc", phase: "falling",
        x: 30 + Math.random() * 40,
        progress: 0, opacity: 1,
      }]);

      // After 1.2s trigger swap glow
      setTimeout(() => {
        setSwapping(true);
        setVaultGlow(true);
        setTimeout(() => setSwapping(false), 600);
        setTimeout(() => setVaultGlow(false), 900);
        // Spawn SOL returning
        setTimeout(() => {
          const rid = counterRef.current++;
          setParticles(p => [...p, {
            id: rid, type: "sol", phase: "returning",
            x: 30 + Math.random() * 40,
            progress: 0, opacity: 1,
          }]);
        }, 400);
      }, 1200);

      // Clean old particles
      setTimeout(() => {
        setParticles(p => p.filter(pt => pt.id !== id));
      }, 2400);
    }, 2800);

    return () => clearInterval(interval);
  }, [active]);

  // Progress particles
  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setParticles(p => p.map(pt => ({
        ...pt,
        progress: Math.min(1, pt.progress + dt * 0.75),
        opacity: pt.progress > 0.85 ? 1 - (pt.progress - 0.85) / 0.15 : 1,
      })));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="relative w-full select-none">
      {/* Flow diagram */}
      <div className="relative h-64 flex items-center justify-between px-4 gap-3">

        {/* Left: Staker */}
        <div className="flex flex-col items-center gap-2 w-20 shrink-0">
          <div className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xl">👤</div>
          <span className="text-[9px] text-gray-500 text-center uppercase tracking-wider">Staker</span>
          <div className="text-[10px] font-mono text-[#01696f]">${(vaultUsdc).toFixed(2)}</div>
        </div>

        {/* Arrow + USDC particles (staker → vault) */}
        <div className="relative flex-1 h-full flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-[#01696f]/60 to-transparent" />
          {/* USDC particles */}
          {particles.filter(p => p.type === "usdc" && p.phase === "falling").map(p => (
            <div key={p.id} className="absolute pointer-events-none"
              style={{
                left: `${p.progress * 100}%`,
                top: `${45 + Math.sin(p.progress * Math.PI) * -20}%`,
                opacity: p.opacity,
                transform: "translate(-50%, -50%)",
                transition: "none",
              }}>
              <div className="w-6 h-6 rounded-full bg-[#2775ca] border border-[#2775ca]/50 flex items-center justify-center text-[9px] font-bold text-white shadow-lg shadow-[#2775ca]/30">$</div>
            </div>
          ))}
          <span className="absolute left-1/2 -translate-x-1/2 -top-4 text-[9px] text-gray-600 whitespace-nowrap">USDC in</span>
        </div>

        {/* Center: Glass Box Vault */}
        <div className="relative shrink-0 w-28">
          <div className={`relative border-2 rounded-xl p-3 transition-all duration-300 ${
            vaultGlow
              ? "border-[#01696f] shadow-lg shadow-[#01696f]/30 bg-[#01696f]/10"
              : "border-[#1f3f3f] bg-[#0d1f1f]"
          }`}>
            {/* Glass shimmer */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            </div>
            <div className="relative z-10 text-center space-y-1">
              <div className="text-[10px] text-gray-500 uppercase tracking-widest">Vault PDA</div>
              <div className={`text-sm font-mono font-bold transition-colors ${vaultGlow ? "text-[#01696f]" : "text-white"}`}>
                ${vaultUsdc.toFixed(2)}
              </div>
              <div className="text-[9px] text-gray-600">{(totalShares / 1_000_000).toFixed(2)} shares</div>
            </div>
            {/* Lock icon */}
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#0a0a0a] border border-[#1f3f3f] flex items-center justify-center text-[10px]">🔒</div>
            {/* Swap glow pulse */}
            {swapping && (
              <div className="absolute inset-0 rounded-xl border-2 border-[#01696f] animate-ping opacity-40" />
            )}
          </div>
          <div className="text-center mt-1.5">
            <span className="text-[9px] text-[#01696f] font-mono">Glass Box</span>
          </div>
        </div>

        {/* Arrow + Jupiter CPI */}
        <div className="relative flex-1 h-full flex flex-col items-center justify-center gap-1">
          {/* Up arrow (vault → Jupiter) */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#c7843a]/50 to-transparent" />
          <div className="flex items-center gap-1.5 bg-[#1a1209] border border-[#c7843a]/30 rounded-full px-2 py-1">
            <img
              src="https://cdn.simpleicons.org/jupiter"
              alt="Jupiter"
              className="w-3 h-3"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-[9px] text-[#c7843a] font-medium">Jupiter CPI</span>
          </div>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-[#9945ff]/50 to-transparent" />
          {swapping && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[8px] text-[#c7843a] animate-pulse font-mono">swapping...</div>
            </div>
          )}
        </div>

        {/* Right side: SOL returning */}
        <div className="relative flex-1 h-full flex items-center">
          <div className="w-full h-px bg-gradient-to-l from-[#9945ff]/60 to-transparent" />
          {/* SOL particles returning */}
          {particles.filter(p => p.type === "sol" && p.phase === "returning").map(p => (
            <div key={p.id} className="absolute pointer-events-none"
              style={{
                right: `${p.progress * 100}%`,
                top: `${45 + Math.sin(p.progress * Math.PI) * -20}%`,
                opacity: p.opacity,
                transform: "translate(50%, -50%)",
              }}>
              <div className="w-6 h-6 rounded-full bg-[#9945ff] border border-[#9945ff]/50 flex items-center justify-center shadow-lg shadow-[#9945ff]/30">
                <img src="https://cdn.simpleicons.org/solana/ffffff" alt="SOL" className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
          <span className="absolute right-0 -top-4 text-[9px] text-gray-600 whitespace-nowrap">SOL back</span>
        </div>

        {/* Far right: Agent */}
        <div className="flex flex-col items-center gap-2 w-20 shrink-0">
          <div className={`w-12 h-12 rounded-full border flex items-center justify-center text-xl transition-all duration-300 ${
            swapping ? "border-[#01696f] bg-[#01696f]/10 shadow-lg shadow-[#01696f]/20" : "border-[#2a2a2a] bg-[#1a1a1a]"
          }`}>🤖</div>
          <span className="text-[9px] text-gray-500 text-center uppercase tracking-wider">Agent</span>
          <div className="text-[10px] font-mono text-gray-600">{trades} trades</div>
        </div>
      </div>

      {/* Security callout */}
      <div className="mt-2 flex items-center justify-center gap-6 border-t border-[#1a1a1a] pt-3">
        {[
          { icon: "🔒", label: "Agent can't withdraw", color: "text-[#01696f]" },
          { icon: "📊", label: `APS: ${aps.toFixed(6)}`, color: "text-white" },
          { icon: "✓",  label: "Math-enforced", color: "text-[#01696f]" },
        ].map(b => (
          <div key={b.label} className="flex items-center gap-1.5">
            <span className="text-sm">{b.icon}</span>
            <span className={`text-[10px] font-medium ${b.color}`}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
