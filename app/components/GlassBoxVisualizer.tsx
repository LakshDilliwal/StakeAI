"use client";
import { motion } from "framer-motion";
import { ArrowRightLeft, Database, User } from "lucide-react";
export function GlassBoxVisualizer() {
  return (
    <div className="w-full bg-[#111] border border-[#222] rounded p-8 relative overflow-hidden h-64 flex flex-col items-center justify-center">
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)", backgroundSize: "20px 20px" }}></div>
      <div className="flex items-center justify-between w-full max-w-3xl z-10">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded border border-[#333] bg-[#0a0a0a] flex items-center justify-center">
            <User className="text-gray-400 w-6 h-6" />
          </div>
          <span className="text-xs font-mono text-gray-500 tracking-widest">STAKERS</span>
        </div>
        <div className="flex-1 h-[1px] mx-4 relative">
          <div className="absolute inset-0 bg-[#333]"></div>
          <motion.div className="absolute top-[-1px] left-0 h-[3px] w-8 bg-[#01696f] shadow-[0_0_10px_#01696f]"
            animate={{ x: ["0%", "400%"] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} />
        </div>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-24 h-24 rounded border border-[#01696f] bg-[#01696f]/10 flex flex-col items-center justify-center overflow-hidden">
            <Database className="text-[#01696f] w-8 h-8 mb-2" />
            <span className="text-[10px] font-mono text-[#01696f] font-bold">AXIOM6 VAULT</span>
          </div>
          <span className="text-xs font-mono text-gray-500 tracking-widest">PROGRAM PDA</span>
        </div>
        <div className="flex-1 h-[1px] mx-4 relative">
          <div className="absolute inset-0 bg-[#333]"></div>
          <motion.div className="absolute top-[-1px] left-0 h-[3px] w-8 bg-white shadow-[0_0_10px_white]"
            animate={{ x: ["0%", "400%"] }} transition={{ repeat: Infinity, duration: 1, ease: "linear", repeatDelay: 0.5 }} />
          <motion.div className="absolute top-[-1px] left-0 h-[3px] w-8 bg-[#01696f] shadow-[0_0_10px_#01696f]"
            animate={{ x: ["400%", "0%"] }} transition={{ repeat: Infinity, duration: 1, ease: "linear", repeatDelay: 0.5, delay: 0.5 }} />
        </div>
        <div className="flex flex-col items-center space-y-3">
          <div className="w-16 h-16 rounded border border-[#333] bg-[#0a0a0a] flex items-center justify-center">
            <ArrowRightLeft className="text-gray-400 w-6 h-6" />
          </div>
          <span className="text-xs font-mono text-gray-500 tracking-widest">JUPITER CPI</span>
        </div>
      </div>
      <div className="mt-12 flex justify-center w-full z-10 space-x-12">
        <motion.div initial={{opacity:0.5}} animate={{opacity:1}} transition={{repeat:Infinity,duration:2,repeatType:"reverse"}} className="flex items-center space-x-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#01696f]"></span><span className="text-gray-400">78% TO STAKERS</span>
        </motion.div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-white"></span><span className="text-gray-400">20% TO DEV</span>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-[#333]"></span><span className="text-gray-400">2% TO TREASURY</span>
        </div>
      </div>
    </div>
  );
}
