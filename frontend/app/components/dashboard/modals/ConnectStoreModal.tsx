"use client";

import React, { useState, useEffect } from "react";
import { ShoppingBag, ExternalLink, ShieldCheck } from "lucide-react";
import { useToast } from "@/app/components/providers/ToastProvider";
import { apiFetch } from "@/app/lib/api";

interface ConnectStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUPPORTED_PLATFORMS = [
  { id: "shopify", name: "Shopify", placeholder: "mystore.myshopify.com", hint: "Enter your myshopify.com domain" },
  { id: "woocommerce", name: "WooCommerce", placeholder: "https://yourshop.com", hint: "Enter your WordPress/WooCommerce site URL" },
  { id: "daraz", name: "Daraz", placeholder: "Seller ID / Store URL", hint: "Enter your Daraz Seller Center domain" },
  { id: "amazon", name: "Amazon", placeholder: "Seller Central Merchant ID", hint: "Enter your Amazon SP-API Merchant ID" },
  { id: "bigcommerce", name: "BigCommerce", placeholder: "store-xyz.mybigcommerce.com", hint: "Enter your BigCommerce store hash/URL" },
];

export function ConnectStoreModal({ isOpen, onClose }: ConnectStoreModalProps) {
  const [platform, setPlatform] = useState<string>("shopify");
  const [storeDomain, setStoreDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlatformInfo = SUPPORTED_PLATFORMS.find((p) => p.id === platform) || SUPPORTED_PLATFORMS[0];

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeDomain.trim()) {
      showToast("Please enter your store URL or domain to proceed.", "error");
      return;
    }

    setConnecting(true);
    showToast("Generating secure authorization session...", "info");

    try {
      // Call backend to generate official OAuth authorization URL
      const data = await apiFetch<any>(
        `/api/v1/auth/${platform}/authorize-url?shop=${encodeURIComponent(storeDomain.trim())}`
      );

      if (data && data.authorize_url) {
        showToast("Redirecting to store authorization page...", "success");
        // Direct browser redirect to the platform's official OAuth consent screen
        window.location.href = data.authorize_url;
      } else {
        showToast("Failed to generate authorization URL. Please verify your store URL.", "error");
        setConnecting(false);
      }
    } catch (err: any) {
      showToast(err.message || "Could not connect to store. Please check the URL and try again.", "error");
      setConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-gradient-to-b from-[#07111d] to-[#0b1728] border border-amber-400/20 shadow-2xl shadow-amber-500/10 rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          disabled={connecting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 font-bold cursor-pointer disabled:opacity-50"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-400/20 border border-amber-400/30 text-amber-400">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Connect Your Store</h3>
            <p className="text-xs text-slate-400">Official OAuth Store Authorization</p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-3 leading-relaxed">
          Connect your live e-commerce store with <strong>AUTO-FTE</strong>. You will be redirected to your store's official admin page to authorize real-time catalog &amp; order synchronization.
        </p>

        <form onSubmit={handleAuthorize} className="mt-5 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Select E-Commerce Platform
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SUPPORTED_PLATFORMS.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlatform(p.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    platform === p.id
                      ? "bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm"
                      : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Store URL / Domain
            </label>
            <div className="relative rounded-xl shadow-sm">
              <input
                type="text"
                autoFocus
                value={storeDomain}
                onChange={(e) => setStoreDomain(e.target.value)}
                placeholder={currentPlatformInfo.placeholder}
                disabled={connecting}
                className="block w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 transition-all placeholder:text-slate-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
              <span>ℹ️</span>
              <span>{currentPlatformInfo.hint}</span>
            </p>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-200/90 text-xs flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <span className="text-[11px] leading-relaxed">
              Your connection is secured with end-to-end TLS and AES-256 encryption. AUTO-FTE only requests necessary read &amp; inventory permissions.
            </span>
          </div>

          <button
            type="submit"
            disabled={connecting || !storeDomain.trim()}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] font-bold text-xs tracking-wider hover:shadow-lg hover:shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {connecting ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-[#06111b] border-t-transparent animate-spin" />
                <span>Redirecting to {currentPlatformInfo.name}...</span>
              </>
            ) : (
              <>
                <span>Connect &amp; Authorize on Store</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
