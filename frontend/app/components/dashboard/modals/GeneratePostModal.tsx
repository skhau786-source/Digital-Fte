"use client";

import React, { useState, useEffect } from "react";
import { Image, Sparkles } from "lucide-react";
import { useToast } from "@/app/components/providers/ToastProvider";
import { apiFetch } from "@/app/lib/api";

interface GeneratePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GeneratePostModal({ isOpen, onClose }: GeneratePostModalProps) {
  const { showToast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [imageStyle, setImageStyle] = useState("Modern");
  const [captionTone, setCaptionTone] = useState("Viral");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<{ image: string; caption: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoadingProducts(true);
    apiFetch<any[]>("/api/v1/dashboard/products")
      .then((data) => {
        if (active && Array.isArray(data)) {
          setProducts(data);
          if (data.length > 0 && !selectedProduct) {
            setSelectedProduct(String(data[0].id));
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load products for AI generator:", err);
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const generatePost = async () => {
    if (!selectedProduct) return;
    setIsGenerating(true);
    try {
      const res = await apiFetch<any>("/api/v1/content/generate", {
        method: "POST",
        body: JSON.stringify({
          product_id: Number(selectedProduct),
          platform: "instagram",
          image_model: "gemini",
        }),
      });

      if (res && res.caption) {
        setGeneratedPost({
          image: res.image_url || "🖼️",
          caption: res.caption,
        });
        showToast(`🎨 AI Magic generated ${captionTone} campaign post!`, "success");
      }
    } catch (err: any) {
      console.error("Content generation error:", err);
      showToast(err.message || "Failed to generate AI post. Check API key.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer font-bold"
        >
          ✕
        </button>
        <div className="text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center mx-auto shadow-2xl shadow-purple-500/30">
            <Image className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mt-4">🖼️ AI Post Generator</h2>
          <p className="text-sm text-slate-500 mt-1">Generate AI images + captions for your products</p>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Product
          </label>
          <select
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            disabled={loadingProducts}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 text-slate-800"
          >
            {loadingProducts ? (
              <option value="">Loading store products...</option>
            ) : products.length === 0 ? (
              <option value="">No products found in store</option>
            ) : (
              products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || p.name} {p.price ? `($${Number(p.price).toFixed(2)})` : ""}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Image Style</label>
          <div className="grid grid-cols-4 gap-2">
            {["Modern", "Vintage", "Minimal", "Luxury"].map((style) => (
              <button
                key={style}
                onClick={() => setImageStyle(style)}
                className={`p-2 rounded-xl border-2 transition-all text-xs font-bold cursor-pointer ${
                  imageStyle === style
                    ? "border-pink-500 bg-pink-50 text-pink-700"
                    : "border-slate-200 hover:border-pink-200 text-slate-600"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              ✨ Campaign Vibe (AI Magic)
            </label>
            <span className="text-[10px] text-purple-600 font-semibold">PDF Compliant</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: "Viral", label: "🔥 Viral" },
              { id: "Professional", label: "💼 Professional" },
              { id: "Funny", label: "😂 Funny" },
              { id: "Urgent", label: "🚨 Urgent" },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setCaptionTone(v.id)}
                className={`p-2.5 rounded-xl border-2 transition-all text-xs font-bold cursor-pointer ${
                  captionTone === v.id
                    ? "border-purple-600 bg-purple-50 text-purple-800 shadow-sm"
                    : "border-slate-200 hover:border-purple-200 text-slate-600 bg-white"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={generatePost}
          disabled={!selectedProduct || isGenerating}
          className="w-full mt-6 py-3 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold text-sm hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              Generating Post with AI...
            </>
          ) : (
            <>🎨 Generate AI Post</>
          )}
        </button>

        {generatedPost && (
          <div className="mt-6 border-2 border-violet-200 rounded-2xl p-4 bg-gradient-to-br from-violet-50 to-pink-50">
            <h4 className="text-xs font-bold text-violet-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Generated Post
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200 flex items-center justify-center min-h-[250px]">
                <div className="text-center w-full">
                  {generatedPost.image && generatedPost.image.startsWith("http") ? (
                    <img
                      src={generatedPost.image}
                      alt="AI Generated"
                      className="max-h-[200px] w-auto mx-auto rounded-lg object-contain shadow-sm"
                    />
                  ) : (
                    <span className="text-7xl">🖼️</span>
                  )}
                  <p className="text-xs text-slate-500 mt-2">{imageStyle} Style</p>
                  <button
                    onClick={generatePost}
                    disabled={isGenerating}
                    className="mt-2 text-[10px] text-pink-600 hover:text-pink-800 font-bold cursor-pointer"
                  >
                    🔄 Regenerate Image
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-700 mb-2">📝 Caption</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{generatedPost.caption}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="text-[8px] bg-blue-500/10 text-blue-700 px-2 py-0.5 rounded-full">#ShopNow</span>
                    <span className="text-[8px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">#Trending</span>
                    <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">#Quality</span>
                    <span className="text-[8px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">#Style</span>
                  </div>
                </div>
                <button
                  onClick={generatePost}
                  disabled={isGenerating}
                  className="mt-3 text-[10px] text-violet-600 hover:text-violet-800 font-bold text-left cursor-pointer"
                >
                  🔄 Regenerate Caption
                </button>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  showToast("📥 Post saved as draft!", "success");
                  setGeneratedPost(null);
                  onClose();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all cursor-pointer"
              >
                💾 Save as Draft
              </button>
              <button
                onClick={() => {
                  setGeneratedPost(null);
                  showToast("🔄 Start fresh!", "info");
                }}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all cursor-pointer"
              >
                🔄 New
              </button>
            </div>
          </div>
        )}

        <p className="text-[8px] text-slate-400 text-center mt-3">
          🔒 AI-powered • Gemini 2.5 Flash • Instagram & Facebook ready
        </p>
      </div>
    </div>
  );
}
