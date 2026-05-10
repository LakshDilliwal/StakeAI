"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GlassBox } from "../components/GlassBox";

function useCountUp(target: number, duration = 1800, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let t = 0;
    const step = 16;
    const inc = target / (duration / step);
    const id = setInterval(() => {
      t += inc;
      if (t >= target) { setVal(target); clearInterval(id); }
      else setVal(t);
    }, step);
    return () => clearInterval(id);
  }, [target, duration, start]);
  return val;
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

const WORDS = ["Agents", "Algorithms", "Autonomy", "Alpha"];

export default function Home() {
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => { setWordIdx(i => (i + 1) % WORDS.length); setWordVisible(true); }, 400);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const statsSection    = useInView(0.3);
  const featuresSection = useInView(0.1);
  const ctaSection      = useInView(0.2);
  const tvl    = useCountUp(12.8,  1600, statsSection.inView);
  const agents = useCountUp(24,    1200, statsSection.inView);
  const vol    = useCountUp(3.29,  1400, statsSection.inView);
  const apy    = useCountUp(18.6,  1800, statsSection.inView);

  return (
    <div className="relative overflow-x-hidden">

      {/* HERO */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-4 pt-8 pb-20 overflow-hidden">
        <div className="pointer-events-none absolute inset-0" style={{ transform: `translateY(${scrollY * 0.3}px)` }}>
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-[0.07]"
            style={{ background: "radial-gradient(ellipse, #01696f 0%, transparent 70%)" }} />
          <div className="absolute top-[30%] left-[10%] w-[300px] h-[300px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse, #9945ff 0%, transparent 70%)" }} />
          <div className="absolute top-[20%] right-[8%] w-[250px] h-[250px] rounded-full opacity-[0.04]"
            style={{ background: "radial-gradient(ellipse, #2775ca 0%, transparent 70%)" }} />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: "256px" }} />

        <div className="relative mb-8 flex items-center gap-2 border border-[#01696f]/30 bg-[#01696f]/5 rounded-full px-4 py-1.5 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[#01696f] animate-pulse shadow-[0_0_6px_#01696f]" />
          <span className="text-[11px] font-mono tracking-[0.2em] text-[#01696f] uppercase">Live on Solana Devnet</span>
        </div>

        <h1 className="relative text-center font-bold leading-[1.05] tracking-tight max-w-3xl">
          <span className="block text-white" style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)" }}>
            Institutional Vaults for
          </span>
          <span className="block" style={{
            fontSize: "clamp(2.4rem, 6vw, 5rem)",
            background: "linear-gradient(135deg, #01696f 0%, #4f98a3 50%, #9945ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            transition: "opacity 0.35s ease, transform 0.35s ease",
            opacity: wordVisible ? 1 : 0,
            transform: wordVisible ? "translateY(0)" : "translateY(12px)",
          }}>
            Autonomous AI {WORDS[wordIdx]}
          </span>
        </h1>

        <p className="relative mt-6 text-center text-gray-400 max-w-xl leading-relaxed"
           style={{ fontSize: "clamp(0.95rem, 1.5vw, 1.15rem)" }}>
          Back AI trading agents with real capital —{" "}
          <span className="text-gray-200">without ever handing over your keys.</span>
          {" "}Security enforced by math, not trust.
        </p>

        <div className="relative mt-10 flex flex-wrap gap-3 justify-center">
          <Link href="/dashboard"
            className="group flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300"
            style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)", boxShadow: "0 0 0 1px #01696f40, 0 8px 32px #01696f30" }}>
            Explore Vaults
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </Link>
          <Link href="/register"
            className="flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold text-gray-300 border border-[#2a2a2a] hover:border-[#444] hover:text-white transition-all duration-300 bg-[#111]/80 backdrop-blur-sm">
            Deploy Agent
          </Link>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-[10px] tracking-widest text-gray-500 uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent animate-pulse" />
        </div>
      </section>

      {/* GLASS BOX */}
      <section className="relative py-4 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-[10px] font-mono tracking-[0.25em] text-gray-600 uppercase mb-6">
            How It Works — Live Simulation
          </p>
          <div className="relative rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] overflow-hidden"
            style={{ boxShadow: "0 0 0 1px #1f1f1f, 0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)" }}>
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-[#1a1a1a]">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
              <span className="ml-3 text-[10px] font-mono text-gray-600">stakeai://vault/live-simulation</span>
            </div>
            <div className="p-6">
              <GlassBox vaultUsdc={128450.72} totalShares={128450720000} aps={1.0} trades={2847} active={true} />
            </div>
          </div>
          <p className="mt-4 text-center text-[10px] font-mono text-gray-600 leading-relaxed">
            Agent signs trades via CPI · USDC never leaves the vault PDA · Output always returns to same address
          </p>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 px-4" ref={statsSection.ref}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Value Locked", value: `$${tvl.toFixed(1)}M`,    change: "+12.4%", color: "#01696f" },
            { label: "Active Agents",      value: agents.toFixed(0),         change: "+3",     color: "#4f98a3" },
            { label: "24h Volume",         value: `$${vol.toFixed(2)}M`,     change: "+8.7%",  color: "#9945ff" },
            { label: "Avg APY",            value: `${apy.toFixed(1)}%`,      change: "+2.1%",  color: "#2775ca" },
          ].map((s, i) => (
            <div key={s.label}
              className="relative border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-5 overflow-hidden group"
              style={{
                opacity: statsSection.inView ? 1 : 0,
                transform: statsSection.inView ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.5s ease ${i * 80}ms, transform 0.5s ease ${i * 80}ms`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
              }}>
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(ellipse at top left, ${s.color}08 0%, transparent 60%)` }} />
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">{s.label}</p>
              <p className="text-2xl font-bold font-mono text-white tabular-nums">{s.value}</p>
              <p className="text-[11px] font-mono mt-1" style={{ color: s.color }}>{s.change}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PROTOCOL GUARANTEES */}
      <section className="py-12 px-4" ref={featuresSection.ref}>
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-[10px] font-mono tracking-[0.25em] text-gray-600 uppercase mb-10">Protocol Guarantees</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
                title: "Non-Custodial Vaults",
                body: "Funds held in audited on-chain PDAs. Agents never hold your keys. Withdrawal is always yours.",
                color: "#01696f", delay: 0,
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
                title: "Jupiter-Powered Execution",
                body: "Best-route swaps via Jupiter CPI. Slippage optimized every trade. Output always flows back.",
                color: "#c7843a", delay: 100,
              },
              {
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
                title: "Performance-Fee Model",
                body: "Agents earn only when you profit. High-water mark enforced on-chain. Zero fees on drawdowns.",
                color: "#9945ff", delay: 200,
              },
            ].map(f => (
              <div key={f.title}
                className="relative border border-[#1f1f1f] bg-[#0d0d0d] rounded-xl p-6 group overflow-hidden"
                style={{
                  opacity: featuresSection.inView ? 1 : 0,
                  transform: featuresSection.inView ? "translateY(0)" : "translateY(32px)",
                  transition: `opacity 0.6s ease ${f.delay}ms, transform 0.6s ease ${f.delay}ms`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
                }}>
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(ellipse at top left, ${f.color}10 0%, transparent 60%)` }} />
                <div className="relative z-10">
                  <div className="mb-4 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${f.color}15`, color: f.color, border: `1px solid ${f.color}25` }}>
                    {f.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEE SPLIT */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="border border-[#1f1f1f] rounded-2xl p-8 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #0a1a1a 0%, #0d0d0d 50%, #0a0a14 100%)", boxShadow: "inset 0 1px 0 rgba(1,105,111,0.15)" }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, #01696f40, transparent)" }} />
            <h2 className="text-lg font-bold text-white mb-1 text-center">Transparent Fee Structure</h2>
            <p className="text-xs text-gray-500 text-center mb-8">Every epoch, profits split automatically on-chain</p>
            {[
              { label: "You (Staker)",     pct: 78, color: "#01696f", width: "78%" },
              { label: "Agent Developer",  pct: 20, color: "#4f98a3", width: "20%" },
              { label: "StakeAI Protocol",  pct: 2,  color: "#1f3f3f", width: "2%"  },
            ].map((r, i) => (
              <div key={r.label} className="mb-4 last:mb-0">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs text-gray-400">{r.label}</span>
                  <span className="text-xs font-mono font-bold" style={{ color: r.color }}>{r.pct}%</span>
                </div>
                <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: r.width, background: r.color, transitionDelay: `${i * 150}ms` }} />
                </div>
              </div>
            ))}
            <p className="text-[10px] text-gray-600 text-center mt-6 font-mono">
              Performance fees only above high-water mark · Zero fees on drawdowns
            </p>
          </div>
        </div>
      </section>

      {/* MISSING PRIMITIVE CTA */}
      <section className="py-20 px-4" ref={ctaSection.ref}>
        <div className="max-w-3xl mx-auto">
          <div className="relative rounded-2xl p-10 md:p-16 overflow-hidden text-center"
            style={{
              background: "linear-gradient(135deg, #0a1a1a 0%, #0d0d0d 50%, #0a0a14 100%)",
              border: "1px solid #1f1f1f",
              boxShadow: "inset 0 1px 0 rgba(1,105,111,0.15), 0 40px 80px rgba(0,0,0,0.5)",
              opacity: ctaSection.inView ? 1 : 0,
              transform: ctaSection.inView ? "translateY(0) scale(1)" : "translateY(40px) scale(0.97)",
              transition: "opacity 0.8s ease, transform 0.8s ease",
            }}>
            <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: "linear-gradient(#01696f 1px, transparent 1px), linear-gradient(90deg, #01696f 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
            <div className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(ellipse at center top, #01696f12 0%, transparent 60%)" }} />
            <div className="relative z-10">
              <p className="text-[10px] font-mono tracking-[0.25em] text-gray-600 uppercase mb-4">The Missing Primitive</p>
              <h2 className="font-bold text-white mb-2" style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", lineHeight: 1.1 }}>
                The missing financial primitive
              </h2>
              <h2 className="font-bold mb-6" style={{ fontSize: "clamp(1.6rem, 4vw, 2.8rem)", lineHeight: 1.1, background: "linear-gradient(135deg, #01696f, #4f98a3)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                in the agentic stack.
              </h2>
              <p className="text-sm text-gray-400 leading-relaxed max-w-xl mx-auto mb-8">
                Everyone built the brain <span className="text-gray-300 font-medium">(ElizaOS)</span>, the hands{" "}
                <span className="text-gray-300 font-medium">(Agent Kit)</span>, the expense account{" "}
                <span className="text-gray-300 font-medium">(Agent-Cred)</span>.{" "}
                Nobody built the <span className="text-white font-semibold underline decoration-[#01696f] underline-offset-4">bank account</span>.
              </p>
              <div className="flex flex-wrap gap-2 justify-center mb-10">
                {[
                  { label: "ElizaOS",    sub: "Brain",  color: "#4f98a3" },
                  { label: "Agent Kit",  sub: "Hands",  color: "#9945ff" },
                  { label: "Agent-Cred", sub: "Wallet", color: "#2775ca" },
                  { label: "StakeAI",     sub: "Bank ✦", color: "#01696f", highlight: true },
                ].map(t => (
                  <div key={t.label} className="px-3 py-2 rounded-lg text-xs font-mono"
                    style={{ border: `1px solid ${t.color}${t.highlight ? "60" : "30"}`, background: `${t.color}${t.highlight ? "15" : "08"}`, color: t.highlight ? t.color : "#888" }}>
                    <span className={t.highlight ? "font-bold" : ""}>{t.label}</span>
                    <span className="ml-1 opacity-60">/ {t.sub}</span>
                  </div>
                ))}
              </div>
              <Link href="/dashboard"
                className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold text-white transition-all duration-300"
                style={{ background: "linear-gradient(135deg, #01696f, #0c4e54)", boxShadow: "0 0 0 1px #01696f50, 0 8px 32px #01696f30" }}>
                Start Staking
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1a1a1a] py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white font-mono">Stake<span style={{ color: "#01696f" }}>AI</span></span>
            <span className="text-[10px] text-gray-700 font-mono">/ non-custodial vaults for AI agents</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors font-mono">Solscan ↗</a>
            <Link href="/dashboard" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors font-mono">Dashboard</Link>
            <Link href="/register" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors font-mono">Deploy</Link>
          </div>
          <span className="text-[10px] text-gray-700 font-mono">Solana Devnet · {new Date().getFullYear()}</span>
        </div>
      </footer>

    </div>
  );
}
