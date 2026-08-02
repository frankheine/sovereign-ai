// src/components/A2HSOverlay.tsx
import { Share } from "lucide-react";

export default function A2HSOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-zinc-950 text-white p-6 text-center">
      <div className="max-w-md flex flex-col items-center gap-6 bg-black/40 p-8 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl">
        <div className="w-16 h-16 bg-violet-500/20 rounded-2xl flex items-center justify-center border border-violet-500/30 mb-2">
          <Share className="w-8 h-8 text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Install Sovereign AI</h1>
        <p className="text-white/70 text-sm leading-relaxed">
          To bypass iOS memory limits and secure persistent storage for the local AI models, this app must be installed to your Home Screen.
        </p>
        <div className="flex flex-col gap-3 w-full text-left bg-white/5 p-4 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold shrink-0">1</span>
            <span className="text-sm text-white/90">Tap the <strong>Share</strong> button below.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold shrink-0">2</span>
            <span className="text-sm text-white/90">Select <strong>Add to Home Screen</strong>.</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold shrink-0">3</span>
            <span className="text-sm text-white/90">Launch the app from your Home Screen.</span>
          </div>
        </div>
      </div>
    </div>
  );
}