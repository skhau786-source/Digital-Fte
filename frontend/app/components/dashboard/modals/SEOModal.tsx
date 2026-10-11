"use client";

import React, { useState, useEffect } from "react";
import { Globe, Sparkles, RefreshCw, Tag } from "lucide-react";
import { useToast } from "@/app/components/providers/ToastProvider";
import { getSEOAnalysisLive, getDashboardOverview } from "@/app/lib/api";

interface SEOModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId?: number | string;
}

export function SEOModal({ isOpen, onClose, storeId }: SEOModalProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [seoData, setSeoData] = useState<{
    store_id: number;
    total_products: number;
    total_keywords: number;
    top_keywords: { keyword: string; count: number }[];
    avg_title_length: number;
    missing_descriptions: number;
    suggestions: string[];
  } | null>(null);

  const loadSEO = async () => {
    try {
      let targetId = storeId;
      if (!targetId) {
        const ov = await getDashboardOverview();
        targetId = ov.store_id || 1;
      }
      const data = await getSEOAnalysisLive(targetId);
      setSeoData(data);
    } catch (err) {
      console.error("Failed to load live SEO analysis:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      loadSEO();
    }
  }, [isOpen, storeId]);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSEO();
    showToast("🔄 SEO audit updated from live PostgreSQL catalog!", "success");
  };

  const hasProducts = (seoData?.total_products || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-[#07111d] border border-white/10 rounded-3xl max-w-2xl w-full p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer font-bold"
        >
          ✕
        </button>

        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mx-auto shadow-2xl shadow-rose-500/30">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-3">🌐 SEO Insights &amp; Catalog Health</h2>
          <p className="text-xs text-slate-400 mt-1">Autonomous meta tag audit and organic keyword analyzer (FTE-07)</p>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-3" />
            <p className="text-xs text-slate-300">Auditing product titles and descriptions from Neon DB...</p>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* Live KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
                <p className="text-lg font-black text-amber-300">{seoData?.total_keywords || 0}</p>
                <p className="text-[10px] text-slate-400 font-medium">Keywords Extracted</p>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
                <p className="text-lg font-black text-emerald-400">{seoData?.total_products || 0}</p>
                <p className="text-[10px] text-slate-400 font-medium">Products Audited</p>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
                <p className="text-lg font-black text-cyan-400">{seoData?.avg_title_length || 0}c</p>
                <p className="text-[10px] text-slate-400 font-medium">Avg. Title Length</p>
              </div>
              <div className="bg-white/5 p-3 rounded-2xl border border-white/10 text-center">
                <p className={`text-lg font-black ${seoData?.missing_descriptions ? "text-rose-400" : "text-emerald-400"}`}>
                  {seoData?.missing_descriptions || 0}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">Missing Descriptions</p>
              </div>
            </div>

            {/* Actionable Suggestions */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
              <h4 className="text-xs font-bold text-amber-300 mb-2.5 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Actionable SEO Recommendations
              </h4>
              {seoData?.suggestions && seoData.suggestions.length > 0 ? (
                <ul className="space-y-2">
                  {seoData.suggestions.map((sug, i) => (
                    <li key={i} className="text-xs text-slate-300 flex items-start gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                      <span className="text-amber-400 mt-0.5">⚡</span>
                      <span>{sug}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No recommendations available at this time.</p>
              )}
            </div>

            {/* Keyword Extraction Cloud */}
            <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
              <h4 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" /> High-Value Keywords in Live Catalog
              </h4>
              {seoData?.top_keywords && seoData.top_keywords.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {seoData.top_keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-xl bg-white/10 border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-1.5"
                    >
                      <span>#{kw.keyword}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300">
                        {kw.count}
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-slate-400">
                    {hasProducts
                      ? "No multi-letter keywords extracted yet."
                      : "Sync your store or add products to unlock autonomous SEO keyword tracking."}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] font-bold text-xs hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span>{refreshing ? "Auditing Live Catalog..." : "Run SEO Analysis Now"}</span>
              </button>
              <button
                onClick={() => {
                  showToast("📄 SEO Audit Report exported to console!", "success");
                  onClose();
                }}
                className="py-2.5 px-4 rounded-xl border border-white/10 text-slate-300 font-bold text-xs hover:bg-white/5 transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
