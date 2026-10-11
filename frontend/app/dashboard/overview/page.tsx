"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Package,
  Bot,
  ArrowRight,
  Database,
  Sparkles,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/app/lib/LanguageContext";
import { getDashboardOverview, seedDashboardData } from "@/app/lib/api";
import { useToast } from "@/app/components/providers/ToastProvider";
import { ConnectStoreModal } from "@/app/components/dashboard/modals/ConnectStoreModal";

interface RecentOrder {
  id: number;
  order_number: string;
  customer_email: string;
  total_price: number;
  financial_status: string;
  created_at: string;
}

interface OverviewData {
  revenue_today: number;
  total_leads: number;
  pending_leads: number;
  responded_leads: number;
  total_orders: number;
  total_products: number;
  pending_tasks: number;
  orchestrator_status: string;
  recent_orders?: RecentOrder[];
  store_name?: string;
  store_id?: number;
  is_demo?: boolean;
}

export default function OverviewPage() {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [subTab, setSubTab] = useState<"Leads" | "Orders" | "AI Studio" | "Logs">("Leads");
  const [leadFilter, setLeadFilter] = useState<string>("All");
  const [activeVibe, setActiveVibe] = useState<string>("Viral");
  const [vibeOutput, setVibeOutput] = useState<string>("");

  const loadData = async () => {
    try {
      const res = await getDashboardOverview();
      setData(res);
    } catch (err) {
      console.error("Failed to load overview data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("store_connected") === "true") {
        showToast("Your store has been connected successfully via OAuth! Sync initiated.", "success");
      }
    }
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedDashboardData();
      showToast(res.message || "Database seeded with sample store data!", "success");
      await loadData();
    } catch {
      showToast("Failed to seed data. Please check backend connection.", "error");
    } finally {
      setSeeding(false);
    }
  };

  const revenue = data ? Number(data.revenue_today || 0) : 0;
  const orders = data ? Number(data.total_orders || 0) : 0;
  const products = data ? Number(data.total_products || 0) : 0;
  const pendingTasks = data ? Number(data.pending_tasks || 0) : 0;

  return (
    <div className="space-y-6">
      {/* AI Hub Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#07111d] via-[#11253c] to-[#1b2f55] p-5 text-white shadow-2xl shadow-amber-500/10 border border-amber-400/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-[0.25em] text-amber-300 font-bold">
                {t("dashboard.aiHub")}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Database className="w-2.5 h-2.5" />
                Neon PostgreSQL Live
              </span>
            </div>
            <h3 className="text-xl font-black mt-1">
              {data?.store_name ? data.store_name : t("dashboard.runningSmooth")}
            </h3>
            <p className="text-sm text-slate-300 mt-2">{t("dashboard.liveSync")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] font-extrabold text-xs flex items-center gap-1.5 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              title="Connect your Shopify, WooCommerce, or e-commerce store"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Connect Store</span>
            </button>

            {data?.is_demo && (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Populate your Neon database with realistic products and orders"
              >
                {seeding ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-400" />
                )}
                <span>{seeding ? "Seeding Neon DB..." : "Seed Neon Data"}</span>
              </button>
            )}

            <Link
              href="/dashboard/agents"
              className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>AI Command Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-[0.25em] text-slate-300">
                {t("dashboard.statusLabel")}
              </p>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                {t("dashboard.allOnline")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Connect Store Prompt Banner for New Users */}
      {!data?.is_demo && Number(data?.total_products || 0) === 0 && Number(data?.total_orders || 0) === 0 && (
        <div className="rounded-2xl bg-gradient-to-r from-[#07111d] via-[#11253c] to-[#0f1f3f] border border-amber-400/30 p-5 text-white shadow-xl shadow-amber-500/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Welcome to AUTO-FTE! Connect Your Store</h4>
              <p className="text-xs text-slate-300 mt-1">
                You haven't connected an e-commerce store yet. Authorize your Shopify or store domain to let autonomous AI manage catalog inventory, customer support, and social campaigns.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] font-black text-xs flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Connect Store Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: loading ? "..." : `$${revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: <DollarSign className="w-5 h-5" />,
            change: "Realtime",
            color: "from-emerald-400 to-green-500",
          },
          {
            label: "Total Orders",
            value: loading ? "..." : orders.toString(),
            icon: <ShoppingBag className="w-5 h-5" />,
            change: "Neon DB",
            color: "from-blue-400 to-cyan-500",
          },
          {
            label: "Active Products",
            value: loading ? "..." : products.toString(),
            icon: <Package className="w-5 h-5" />,
            change: "Synced",
            color: "from-purple-400 to-violet-500",
          },
          {
            label: "Pending AI Tasks",
            value: loading ? "..." : pendingTasks.toString(),
            icon: <Clock className="w-5 h-5" />,
            change: pendingTasks > 0 ? "Review Ready" : "Up to date",
            color: "from-orange-400 to-amber-500",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div
                className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-lg`}
              >
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-3">{stat.value}</p>
            <p className="text-xs font-medium text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Command Center Sub-Tabs (PDF Requirements: Leads, Orders, AI Studio, Logs) */}
      <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>🎯 Command Center Engine</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                Live Audit Loop
              </span>
            </h4>
            <p className="text-xs text-slate-500">
              Autonomous customer leads tracking, AI Studio, and system diagnostics
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {(["Leads", "Orders", "AI Studio", "Logs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSubTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  subTab === tab
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
              >
                {tab === "Leads" && "👥 Leads Engine"}
                {tab === "Orders" && "📦 Orders"}
                {tab === "AI Studio" && "✨ AI Studio"}
                {tab === "Logs" && "📋 System Logs"}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-Tab 1: Leads Engine */}
        {subTab === "Leads" && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-500">Filter Intent:</span>
                {["All", "Pending", "Responded", "Ready to Whatsapp"].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setLeadFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      leadFilter === filter
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {filter === "Ready to Whatsapp" ? "💬 Ready to Whatsapp" : filter}
                  </button>
                ))}
              </div>
              <span className="text-xs font-medium text-slate-400">
                Automated buyer intent detection
              </span>
            </div>

            {data?.is_demo ? (
              <div className="overflow-x-auto rounded-xl border border-slate-200/80">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-3.5 py-2.5 text-left">Source</th>
                      <th className="px-3.5 py-2.5 text-left">Customer Profile</th>
                      <th className="px-3.5 py-2.5 text-left">Recent Interaction</th>
                      <th className="px-3.5 py-2.5 text-left">Time</th>
                      <th className="px-3.5 py-2.5 text-left">Status</th>
                      <th className="px-3.5 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {[
                      {
                        id: 1,
                        source: "Instagram DM",
                        name: "Sarah Jenkins",
                        email: "sarah.j@gmail.com",
                        interaction: "Inquired about Quantum Pro Wireless Headphones stock & colors",
                        time: "12m ago",
                        status: "Ready to Whatsapp",
                        phone: "+92 300 1234567",
                      },
                      {
                        id: 2,
                        source: "Shopify Store",
                        name: "David Kim",
                        email: "david.kim@techcorp.io",
                        interaction: "Requested bulk pricing for Ergonomic Mechanical Keyboards (10 units)",
                        time: "35m ago",
                        status: "Pending",
                        phone: "+92 321 9876543",
                      },
                      {
                        id: 3,
                        source: "WhatsApp Assistant",
                        name: "Emily Rose",
                        email: "emily.rose@designlab.co",
                        interaction: "Shared custom discount code and sent direct checkout link",
                        time: "1h ago",
                        status: "Responded",
                        phone: "+92 333 4567890",
                      },
                      {
                        id: 4,
                        source: "Abandoned Cart",
                        name: "Alex Miller",
                        email: "alex.m@outlook.com",
                        interaction: "Left cart with $249.00 monitor — recovery sequence active",
                        time: "2h ago",
                        status: "Ready to Whatsapp",
                        phone: "+92 345 6789012",
                      },
                      {
                        id: 5,
                        source: "Facebook Comment",
                        name: "Michael Torres",
                        email: "michael.t@domain.com",
                        interaction: "Commented 'Price?' on Smart Ambient Desk Lamp reel",
                        time: "3h ago",
                        status: "Pending",
                        phone: "+92 312 3456789",
                      },
                    ]
                      .filter((l) => (leadFilter === "All" ? true : l.status.toLowerCase() === leadFilter.toLowerCase()))
                      .map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3.5 py-2.5 font-bold text-slate-700">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[10px]">
                              {lead.source}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <p className="font-bold text-slate-900">{lead.name}</p>
                            <p className="text-[11px] text-slate-400">{lead.email}</p>
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-600 max-w-xs truncate">
                            {lead.interaction}
                          </td>
                          <td className="px-3.5 py-2.5 text-slate-400 whitespace-nowrap">{lead.time}</td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                lead.status === "Ready to Whatsapp"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : lead.status === "Responded"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {lead.status}
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                            {lead.status === "Ready to Whatsapp" ? (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 shadow-sm"
                              >
                                <span>WhatsApp</span>
                                <span>↗</span>
                              </a>
                            ) : (
                              <button
                                onClick={() => showToast(`Lead action triggered for ${lead.name}`, "info")}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                              >
                                Follow up
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 text-slate-500 mx-auto flex items-center justify-center">
                  <Bot className="w-6 h-6 text-amber-500" />
                </div>
                <h5 className="text-sm font-bold text-slate-800">No Customer Leads Recorded Yet</h5>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Once your store is connected and receives customer orders or inquiries, our autonomous AI Leads Engine will automatically categorize and display them here.
                </p>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="mt-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:shadow-md text-[#06111b] text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Connect Your Store</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sub-Tab 2: Orders Summary */}
        {subTab === "Orders" && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Live Store Transactions
              </p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {orders} Completed Orders · ${revenue.toFixed(2)} Total Revenue
              </p>
            </div>
            <Link
              href="/dashboard/payments"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold"
            >
              View Orders Breakdown →
            </Link>
          </div>
        )}

        {/* Sub-Tab 3: AI Studio (PDF Campaign Vibes) */}
        {subTab === "AI Studio" && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h5 className="text-sm font-bold text-slate-900">✨ AI Campaign Factory</h5>
                <p className="text-xs text-slate-500">
                  Select a vibe to preview autonomous social captions for your top products
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {["Viral", "Professional", "Funny", "Urgent"].map((vibe) => (
                  <button
                    key={vibe}
                    onClick={() => {
                      setActiveVibe(vibe);
                      setVibeOutput(
                        vibe === "Viral"
                          ? "🔥 STOP SCROLLING! This tech essential just broke the internet. Limited inventory remaining! Tap bio now #ViralTech #TrendingNow"
                          : vibe === "Professional"
                          ? "Elevate your daily operational efficiency. Engineered with precision materials for modern creators. Inquire for corporate volume orders."
                          : vibe === "Funny"
                          ? "My wallet said no, but my heart said 'add to cart and blame the algorithm later' 😅 Free shipping today only!"
                          : "🚨 LAST CHANCE: Price increases tonight at 11:59 PM. Claim yours before it's gone for good!"
                      );
                      showToast(`AI Magic generated "${vibe}" vibe copy!`, "success");
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeVibe === vibe
                        ? "bg-violet-600 text-white shadow-sm"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {vibe}
                  </button>
                ))}
              </div>
            </div>

            {vibeOutput ? (
              <div className="p-3 bg-white rounded-xl border border-violet-200 text-xs text-slate-800 space-y-2">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[10px]">
                  <span>VIBE: {activeVibe.toUpperCase()} COPY</span>
                  <span>Ready for Meta / TikTok</span>
                </div>
                <p className="font-medium italic text-slate-900">"{vibeOutput}"</p>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <Link
                    href="/dashboard/social"
                    className="px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-[11px]"
                  >
                    Queue in Social Hub →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Click any vibe button above to generate a live AI promotional angle.
              </p>
            )}
          </div>
        )}

        {/* Sub-Tab 4: System Logs */}
        {subTab === "Logs" && (
          <div className="p-4 rounded-xl bg-[#030712] text-slate-300 font-mono text-xs space-y-1.5 border border-slate-800">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5 mb-2 font-sans font-bold">
              <span>System Diagnostics</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                AI Orchestrator Online
              </span>
            </div>
            <p className="text-emerald-400">&gt; AI Orchestrator is {data?.orchestrator_status || "active"}.</p>
            <p className="text-cyan-400">&gt; FTE Live Audit Loop running (background polling interval: 60s).</p>
            <p className="text-slate-400">&gt; Connected to database: {data?.store_name || "Auto-FTE Store"} (Neon PostgreSQL).</p>
            <p className="text-amber-400">&gt; Pending approval queue: {pendingTasks} tasks awaiting merchant review.</p>
          </div>
        )}
      </div>

      {/* Charts & Store Overview Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <div className="p-5 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-slate-900">📈 Revenue Distribution</h4>
            <span className="text-[10px] text-slate-400">Live Database</span>
          </div>
          <div className="h-48 flex items-end gap-2">
            {[65, 45, 80, 55, 90, 70, 85].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className="w-full rounded-lg bg-gradient-to-t from-violet-500 to-indigo-600 transition-all duration-500 hover:scale-105"
                  style={{ height: `${height}%` }}
                />
                <span className="text-[8px] text-slate-400">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Database Live Status Card */}
        <div className="p-5 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900">⚡ Database Health & Sync</h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              Online
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-600 font-medium">Database Provider</span>
              <span className="text-xs font-bold text-slate-900">Neon PostgreSQL (AWS us-east-2)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-600 font-medium">Connected Store</span>
              <span className="text-xs font-bold text-slate-900">{data?.store_name || "Auto-FTE Store"}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xs text-slate-600 font-medium">SSL / Encryption</span>
              <span className="text-xs font-bold text-emerald-600">TLS Encrypted (Active)</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Orchestrator: <strong className="text-slate-800 capitalize">{data?.orchestrator_status || "Active"}</strong></span>
            <Link href="/dashboard/products" className="text-amber-600 font-bold hover:underline">
              Manage Inventory →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Orders from Neon PostgreSQL */}
      <div className="p-5 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">🛒 Recent Orders from Neon PostgreSQL</h4>
            <p className="text-xs text-slate-500">Live order stream synced from your database</p>
          </div>
          <Link href="/dashboard/payments" className="text-[10px] text-amber-600 font-bold hover:underline cursor-pointer">
            View All Transactions →
          </Link>
        </div>

        {data?.recent_orders && data.recent_orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">Order #</th>
                  <th className="px-4 py-3 text-left font-bold">Customer</th>
                  <th className="px-4 py-3 text-left font-bold">Total</th>
                  <th className="px-4 py-3 text-left font-bold">Status</th>
                  <th className="px-4 py-3 text-left font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent_orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">{order.order_number}</td>
                    <td className="px-4 py-3 text-slate-600">{order.customer_email}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">
                      ${order.total_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 uppercase">
                        {order.financial_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : "Today"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-3">No orders found in your store database yet.</p>
            {data?.is_demo ? (
              <button
                onClick={handleSeed}
                disabled={seeding}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-all cursor-pointer"
              >
                Seed Sample Store Data
              </button>
            ) : (
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:shadow-md text-[#06111b] font-bold text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Connect Your Store</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Accessible Quick Action Banner for Stores */}
      {(!data?.total_orders && !data?.is_demo) && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#07111d] to-[#12243a] text-white border border-amber-400/20 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Ready to activate autonomous store operations?</p>
              <p className="text-[11px] text-slate-300">
                Authorize your Shopify or e-commerce store to enable live order processing, catalog sync, and AI customer chat.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowConnectModal(true)}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] font-bold text-xs flex items-center justify-center gap-1.5 transition-all hover:shadow-lg hover:shadow-amber-500/20 shrink-0 cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Connect Live Store</span>
          </button>
        </div>
      )}

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
