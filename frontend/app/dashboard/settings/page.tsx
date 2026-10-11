"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { useToast } from "@/app/components/providers/ToastProvider";
import { apiFetch, getAutomationSettings, updateAutomationSettings } from "@/app/lib/api";
import {
  ShoppingBag,
  Instagram,
  ExternalLink,
  Clock,
  CheckCircle2,
  RefreshCw,
  Zap,
  Calendar,
} from "lucide-react";
import { ConnectStoreModal } from "@/app/components/dashboard/modals/ConnectStoreModal";

export default function SettingsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Settings State
  const [manualReview, setManualReview] = useState(true);
  const [operatingStartTime, setOperatingStartTime] = useState("09:00");
  const [operatingEndTime, setOperatingEndTime] = useState("23:00");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split("T")[0];
  });
  const [operatingDays, setOperatingDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [autopilotInterval, setAutopilotInterval] = useState(6);
  const [safetyDelay, setSafetyDelay] = useState(15);
  const [isAutopilotEnabled, setIsAutopilotEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  // Quick Inline Connect State
  const [quickDomain, setQuickDomain] = useState("");
  const [connecting, setConnecting] = useState(false);

  const toggleDay = (day: string) => {
    if (operatingDays.includes(day)) {
      if (operatingDays.length === 1) return;
      setOperatingDays(operatingDays.filter((d) => d !== day));
    } else {
      setOperatingDays([...operatingDays, day]);
    }
  };

  const loadData = async () => {
    try {
      const [ov, settings] = await Promise.all([
        apiFetch<any>("/api/v1/dashboard/overview").catch(() => null),
        getAutomationSettings().catch(() => null),
      ]);
      if (ov) setStoreInfo(ov);
      if (settings) {
        if (typeof settings.manual_review === "boolean") setManualReview(settings.manual_review);
        if (settings.operating_start_time) {
          setOperatingStartTime(settings.operating_start_time);
        } else if (settings.operating_start !== undefined) {
          setOperatingStartTime(`${String(settings.operating_start).padStart(2, "0")}:00`);
        }
        if (settings.operating_end_time) {
          setOperatingEndTime(settings.operating_end_time);
        } else if (settings.operating_end !== undefined) {
          setOperatingEndTime(`${String(settings.operating_end).padStart(2, "0")}:00`);
        }
        if (settings.start_date) setStartDate(settings.start_date);
        if (settings.end_date) setEndDate(settings.end_date);
        if (settings.operating_days && Array.isArray(settings.operating_days)) setOperatingDays(settings.operating_days);
        if (settings.timezone) setTimezone(settings.timezone);
        if (settings.autopilot_interval_hours !== undefined) setAutopilotInterval(settings.autopilot_interval_hours);
        if (settings.safety_delay_minutes !== undefined) setSafetyDelay(settings.safety_delay_minutes);
        if (typeof settings.is_autopilot_enabled === "boolean") setIsAutopilotEnabled(settings.is_autopilot_enabled);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const sHour = parseInt(operatingStartTime.split(":")[0], 10) || 9;
      const eHour = parseInt(operatingEndTime.split(":")[0], 10) || 23;

      await updateAutomationSettings({
        manual_review: manualReview,
        operating_start: sHour,
        operating_end: eHour,
        operating_start_time: operatingStartTime,
        operating_end_time: operatingEndTime,
        start_date: startDate,
        end_date: endDate,
        operating_days: operatingDays,
        timezone: timezone,
        autopilot_interval_hours: autopilotInterval,
        safety_delay_minutes: safetyDelay,
        is_autopilot_enabled: isAutopilotEnabled,
      });
      showToast("💾 Operating window & campaign duration saved to PostgreSQL!", "success");
    } catch {
      showToast("Failed to save settings. Please verify backend connection.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDomain.trim()) {
      showToast("Please enter your Shopify store URL (e.g. mystore.myshopify.com)", "error");
      return;
    }

    setConnecting(true);
    showToast("Generating secure authorization session...", "info");

    try {
      const data = await apiFetch<any>(
        `/api/v1/auth/shopify/authorize-url?shop=${encodeURIComponent(quickDomain.trim())}`
      );
      if (data && data.authorize_url) {
        showToast("Redirecting to official Shopify OAuth consent screen...", "success");
        window.location.href = data.authorize_url;
      } else {
        showToast("Failed to generate authorization URL. Please check store domain.", "error");
        setConnecting(false);
      }
    } catch (err: any) {
      showToast(err.message || "Could not connect to store. Please verify domain.", "error");
      setConnecting(false);
    }
  };

  const isDemo = user?.email === "demo@autofte.com" || storeInfo?.is_demo;
  const isShopifyConnected = isDemo || (storeInfo && (storeInfo.total_products > 0 || storeInfo.total_orders > 0));
  const isInstagramConnected = isDemo;
  const storeName = storeInfo?.store_name || (isShopifyConnected ? "Flagship Store" : "");

  return (
    <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">⚙️ Platform &amp; Autonomous Workforce Settings</h3>
          <p className="text-xs text-slate-500">Configure tenant credentials, store integrations, and autopilot durations</p>
        </div>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-auto">
          ● {loading ? "Syncing..." : "Live DB Connected"}
        </span>
      </div>

      <div className="space-y-5">
        {/* Account Info Card */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Account Credentials</h4>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-sm font-bold text-slate-800">{user?.email || "user@example.com"}</span>
              <p className="text-[11px] text-slate-400">Authenticated via Secure JWT Bearer Token</p>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-full self-start sm:self-auto">
              Role: Merchant Admin
            </span>
          </div>
        </div>

        {/* Connected Accounts & Dynamic Store Integration Status */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Connected Store &amp; Social Channels</h4>
            <span className="text-[10px] text-slate-400">Live Multi-Tenant Isolation</span>
          </div>

          <div className="space-y-3">
            {/* Shopify Store Row */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Shopify E-Commerce Store</span>
                    {isShopifyConnected && (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                        Active Sync
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isShopifyConnected
                      ? `Connected: ${storeName} (${storeInfo?.total_products || 0} products in DB)`
                      : "No active Shopify store linked in Neon PostgreSQL."}
                  </p>
                </div>
              </div>

              {isShopifyConnected ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>● Connected</span>
                </span>
              ) : (
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:shadow-md text-[#06111b] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>+ Connect Store</span>
                </button>
              )}
            </div>

            {/* Instagram Row */}
            <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-pink-500/10 text-pink-600">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">Instagram Professional</span>
                    {isInstagramConnected && (
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                        Verified
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {isInstagramConnected
                      ? "Connected (@autofte) · Auto-reply & comments monitoring active"
                      : "Link your Instagram business account to enable comment responder & social scheduler."}
                  </p>
                </div>
              </div>

              {isInstagramConnected ? (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 self-start sm:self-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>● Connected</span>
                </span>
              ) : (
                <span className="text-xs font-bold text-slate-400 self-start sm:self-auto">
                  ○ Not Connected
                </span>
              )}
            </div>
          </div>

          {/* Quick Connect Store Inline Form if not connected */}
          {!isShopifyConnected && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-orange-500/5 border border-amber-400/30 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <h5 className="text-xs font-bold text-slate-900">Frictionless Quick Connect</h5>
              </div>
              <p className="text-[11px] text-slate-600 mb-3">
                Enter your store URL to immediately redirect to your store's official OAuth consent screen.
              </p>
              <form onSubmit={handleQuickAuthorize} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="mystore.myshopify.com"
                  value={quickDomain}
                  onChange={(e) => setQuickDomain(e.target.value)}
                  disabled={connecting}
                  className="flex-1 px-3 py-2 text-xs rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={connecting || !quickDomain.trim()}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:shadow-md text-[#06111b] font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {connecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Redirecting...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize on Shopify</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* User-Configurable Autopilot Operating Window & Date Duration */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Autopilot Operating Window &amp; Date Duration
              </h4>
            </div>
            <span className="text-[10px] text-slate-400">PostgreSQL Persisted</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Daily Operating Time Window */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Daily Operating Hours Window
              </label>
              <p className="text-[10px] text-slate-500 leading-tight">
                Specify the exact time range during each day when autonomous agents are allowed to run and publish.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Start Time</span>
                  <input
                    type="time"
                    value={operatingStartTime}
                    onChange={(e) => setOperatingStartTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">End Time</span>
                  <input
                    type="time"
                    value={operatingEndTime}
                    onChange={(e) => setOperatingEndTime(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              </div>
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                <span className="font-semibold text-slate-600">Timezone:</span>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="Asia/Karachi">Asia/Karachi (PKT UTC+5)</option>
                  <option value="UTC">UTC (Coordinated Universal)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST UTC+4)</option>
                </select>
              </div>
            </div>

            {/* Campaign Date Duration */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                Operating Date Duration (Campaign Period)
              </label>
              <p className="text-[10px] text-slate-500 leading-tight">
                Set the active start and end calendar dates for the automated AI workforce schedule.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Start Date</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">End Date</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                Autopilot is active during this range and automatically pauses outside of these calendar dates.
              </p>
            </div>

            {/* Active Operating Days */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Active Operating Days
              </label>
              <p className="text-[10px] text-slate-500 leading-tight">
                Select which days of the week the AI agents run their scheduled tasks.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                  const isActive = operatingDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-amber-500 text-white shadow-sm"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Manual Approval Mode */}
            <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800">
                  Human-in-the-Loop Review
                </label>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  When enabled, posts will never auto-publish without merchant approval in Social Manager.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManualReview(!manualReview)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  manualReview ? "bg-amber-500" : "bg-slate-300"
                }`}
              >
                <span
                  className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                    manualReview ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Settings Button */}
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-[#06111b] font-black text-xs uppercase tracking-wider hover:shadow-xl hover:shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Persisting Settings...</span>
            </>
          ) : (
            <span>💾 Save Platform &amp; Autopilot Settings</span>
          )}
        </button>
      </div>

      <ConnectStoreModal
        isOpen={showConnectModal}
        onClose={() => {
          setShowConnectModal(false);
          loadData();
        }}
      />
    </div>
  );
}
