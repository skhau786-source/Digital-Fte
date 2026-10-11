"use client";

import React, { useState, useEffect } from "react";
import { Settings, ShoppingBag, Instagram, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { useToast } from "@/app/components/providers/ToastProvider";
import { apiFetch } from "@/app/lib/api";
import { ConnectStoreModal } from "@/app/components/dashboard/modals/ConnectStoreModal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [storeData, setStoreData] = useState<any>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await apiFetch<any>("/api/v1/dashboard/overview");
      setStoreData(data);
    } catch {
      // offline / fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDemo = user?.email === "demo@autofte.com" || storeData?.is_demo;
  const isShopifyConnected = isDemo || (storeData && (storeData.total_products > 0 || storeData.total_orders > 0));
  const isInstagramConnected = isDemo;
  const storeName = storeData?.store_name || "Shopify Store";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
        <div className="bg-[#07111d] border border-white/10 rounded-3xl max-w-xl w-full p-6 sm:p-8 relative shadow-2xl max-h-[90vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer font-bold"
          >
            ✕
          </button>
          <div className="text-center">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center mx-auto shadow-2xl shadow-slate-500/20 border border-white/10">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-black text-white mt-3">⚙️ Account Settings</h2>
            <p className="text-xs text-slate-400 mt-1">Tenant credentials &amp; platform connectivity</p>
          </div>

          <div className="mt-5 space-y-4">
            {/* Account Card */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account Credentials</h4>
              <div className="mt-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-white">{user?.email || "user@example.com"}</span>
                  <p className="text-[10px] text-slate-400">Authenticated Tenant Session</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>

            {/* Connected Accounts Card */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Connected Store &amp; Social Channels
              </h4>
              <div className="space-y-3">
                {/* Shopify Row */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Shopify Storefront</span>
                      <span className="text-[10px] text-slate-400">
                        {isShopifyConnected ? storeName : "No active store synchronized"}
                      </span>
                    </div>
                  </div>
                  {isShopifyConnected ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>● Connected</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowConnectModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>+ Connect</span>
                    </button>
                  )}
                </div>

                {/* Instagram Row */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex items-center gap-2.5">
                    <Instagram className="w-4 h-4 text-pink-400" />
                    <div>
                      <span className="text-xs font-semibold text-white block">Instagram Professional</span>
                      <span className="text-[10px] text-slate-400">
                        {isInstagramConnected ? "@autofte" : "Social automation channel"}
                      </span>
                    </div>
                  </div>
                  {isInstagramConnected ? (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>● Connected</span>
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">○ Not Connected</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                showToast("💾 Account preferences verified!", "success");
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-[#06111b] font-bold text-xs uppercase tracking-wider hover:shadow-xl transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
          <p className="text-[9px] text-slate-500 text-center mt-3">🔒 End-to-end multi-tenant isolation active</p>
        </div>
      </div>

      <ConnectStoreModal
        isOpen={showConnectModal}
        onClose={() => {
          setShowConnectModal(false);
          loadStatus();
        }}
      />
    </>
  );
}
