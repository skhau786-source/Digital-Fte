"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingSpinner({ text = "Loading Digital FTE..." }: { text?: string }) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 text-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Loader2 className="w-8 h-8 text-[#06111b] animate-spin" />
        </div>
      </div>
      <p className="text-xs font-bold text-amber-300 tracking-wider uppercase animate-pulse">
        {text}
      </p>
    </div>
  );
}
