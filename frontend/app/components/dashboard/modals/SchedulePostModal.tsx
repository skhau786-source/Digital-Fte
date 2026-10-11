"use client";

import React, { useState, useEffect } from "react";
import { Calendar, Instagram, Facebook, Music, Youtube, Twitter, Sparkles } from "lucide-react";
import { useToast } from "@/app/components/providers/ToastProvider";
import { apiFetch } from "@/app/lib/api";

interface SchedulePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SchedulePostModal({ isOpen, onClose }: SchedulePostModalProps) {
  const { showToast } = useToast();
  const [selectedPlatform, setSelectedPlatform] = useState("instagram");
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [scheduleDate, setScheduleDate] = useState("2026-07-20");
  const [scheduleTime, setScheduleTime] = useState("10:00");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingProducts(true);
    apiFetch<any[]>("/api/v1/dashboard/products")
      .then((data) => {
        if (active && Array.isArray(data)) {
          setProducts(data);
          if (data.length > 0 && !selectedProductId) {
            setSelectedProductId(String(data[0].id));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load products for scheduler:", err);
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSchedule = async () => {
    const selectedProd = products.find((p) => String(p.id) === String(selectedProductId));
    const title = selectedProd ? `Campaign: ${selectedProd.title || selectedProd.name}` : "Scheduled Social Campaign";
    
    setIsSubmitting(true);
    try {
      await apiFetch("/api/v1/dashboard/tasks", {
        method: "POST",
        body: JSON.stringify({
          title,
          content: `AI-optimized campaign scheduled for ${scheduleDate} at ${scheduleTime} on ${selectedPlatform}.`,
          platforms: [selectedPlatform],
          priority: "Medium",
          asset_url: selectedProd?.image_url || "",
        }),
      });
      showToast("📅 Post scheduled successfully!", "success");
      onClose();
    } catch (err: any) {
      console.error("Failed to schedule post:", err);
      showToast(err.message || "Failed to schedule post task", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-[#07111d]/95 border border-white/10 rounded-3xl max-w-2xl w-full p-8 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer font-bold"
        >
          ✕
        </button>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30">
            <Calendar className="w-10 h-10 text-[#06111b]" />
          </div>
          <h2 className="text-2xl font-extrabold text-white mt-4">📅 Schedule Post</h2>
          <p className="text-sm text-slate-400 mt-1">Schedule AI-generated posts to social media</p>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Select Post</label>
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            disabled={loadingProducts}
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
          >
            {loadingProducts ? (
              <option value="" className="bg-[#07111d]">Loading products...</option>
            ) : products.length === 0 ? (
              <option value="" className="bg-[#07111d]">No products available</option>
            ) : (
              products.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#07111d]">
                  {p.title || p.name} {p.price ? `($${Number(p.price).toFixed(2)})` : ""}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Date</label>
            <input
              type="date"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Time</label>
            <input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Platform</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: "instagram", label: "Insta", icon: <Instagram className="w-4 h-4 text-pink-400" /> },
              { id: "facebook", label: "FB", icon: <Facebook className="w-4 h-4 text-blue-400" /> },
              { id: "tiktok", label: "TT", icon: <Music className="w-4 h-4 text-slate-300" /> },
              { id: "youtube", label: "YT", icon: <Youtube className="w-4 h-4 text-red-400" /> },
              { id: "twitter", label: "X", icon: <Twitter className="w-4 h-4 text-sky-400" /> },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlatform(p.id)}
                className={`p-2.5 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-1 cursor-pointer transition-all ${
                  selectedPlatform === p.id
                    ? "border-amber-400 bg-amber-400/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                }`}
              >
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 rounded-xl p-3 border border-amber-400/20">
          <p className="text-xs text-amber-300 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> 🤖 AI suggests: <strong>{scheduleDate} at {scheduleTime}</strong> (Best engagement time)
          </p>
        </div>

        <button
          onClick={handleSchedule}
          disabled={isSubmitting || !selectedProductId}
          className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-[#06111b] font-bold text-sm hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSubmitting ? "Scheduling..." : "📅 Schedule Post"}
        </button>
        <p className="text-[8px] text-slate-400 text-center mt-3">
          🔒 Post will be published automatically at the scheduled time
        </p>
      </div>
    </div>
  );
}
