"use client";

import React from "react";
import { MessageCircle, Instagram, Facebook, Twitter, Music } from "lucide-react";
import { useToast } from "@/app/components/providers/ToastProvider";

import { useAuth } from "@/app/components/auth/AuthProvider";

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsModal({ isOpen, onClose }: CommentsModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();

  if (!isOpen) return null;

  const isDemo = user?.email === "demo@autofte.com";

  const mockComments = [
    { platform: <Instagram className="w-4 h-4 text-pink-400" />, user: "@sarah_j", comment: "Love this product! 😍", time: "2 hours ago", status: "Pending" },
    { platform: <Facebook className="w-4 h-4 text-blue-400" />, user: "@mike_23", comment: "Is this available in blue?", time: "5 hours ago", status: "Replied" },
    { platform: <Twitter className="w-4 h-4 text-sky-400" />, user: "@emma_w", comment: "Great quality, just ordered!", time: "1 day ago", status: "Replied" },
    { platform: <Music className="w-4 h-4 text-slate-300" />, user: "@alex_t", comment: "How long does shipping take?", time: "2 days ago", status: "Pending" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-[#07111d]/95 border border-white/10 rounded-3xl max-w-3xl w-full p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer font-bold"
        >
          ✕
        </button>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/30">
            <MessageCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-4">💬 Comments Dashboard</h2>
          <p className="text-sm text-slate-400 mt-1">View & manage all social comments</p>
        </div>

        <div className="mt-4 space-y-3">
          {isDemo ? (
            mockComments.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:border-amber-400/30 transition-all">
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-2">
                    {item.platform} {item.user}
                  </p>
                  <p className="text-xs text-slate-300">{item.comment}</p>
                  <p className="text-[8px] text-slate-500">{item.time}</p>
                </div>
                <span
                  className={`px-2 py-0.5 text-[8px] font-bold rounded-full ${
                    item.status === "Replied"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-400/30"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-white/5 rounded-2xl border border-white/10 p-6 space-y-2">
              <p className="text-sm font-bold text-white">No Customer Comments Detected Yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Once customer inquiries or comments arrive on your connected channels, AUTO-FTE's support agent will draft and manage autonomous replies here.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => showToast("🔄 Comments refreshed!", "success")}
          className="w-full mt-4 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold text-sm hover:shadow-xl transition-all cursor-pointer"
        >
          🔄 Refresh Comments
        </button>
        <p className="text-[8px] text-slate-400 text-center mt-3">🔒 Real-time comments • Auto-reply enabled</p>
      </div>
    </div>
  );
}
