"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Play,
  ArrowRight,
  Package,
  Calendar,
  MessageCircle,
  Bot,
  BarChart3,
  Cpu,
  Zap,
  CheckCircle2,
  Check,
  Bell,
  Share2,
  HelpCircle,
  ChevronDown,
  Search,
} from "lucide-react";
import { InteractiveRobot } from "@/app/components/InteractiveRobot";
import { useLanguage } from "@/app/lib/LanguageContext";
import { useToast } from "@/app/components/providers/ToastProvider";

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [robotMotionPaused, setRobotMotionPaused] = useState(false);
  const [simActiveTab, setSimActiveTab] = useState<"inventory" | "content" | "support">("inventory");
  const [simStockTriggered, setSimStockTriggered] = useState(false);
  const [simContentGenerating, setSimContentGenerating] = useState(false);
  const [simGeneratedPost, setSimGeneratedPost] = useState(false);
  const [simChatLanguage, setSimChatLanguage] = useState<"en" | "ur">("en");
  const [landingFaqOpen, setLandingFaqOpen] = useState<number | null>(null);

  return (
    <div id="landing-view-root" className="w-full max-w-7xl mx-auto flex flex-col gap-20 py-4 animate-fade-in">
      {/* Hero Section */}
      <div id="hero" className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center py-4">
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-300 text-xs font-bold mb-6 tracking-wide uppercase shadow-sm hover:shadow-md hover:bg-amber-500/15 transition-all animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>{t("hero.badge")}</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 animate-fade-in">
            {t("hero.headline1")} <br />
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent animate-pulse">
              {t("hero.headline2")} {t("hero.headline3")}
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed mb-8 animate-fade-in-delay">
            {t("hero.subheadline")}
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-8 w-full sm:w-auto animate-fade-in-delay">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 text-sm font-bold text-center rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:shadow-xl text-[#06111b] shadow-lg shadow-amber-500/20 transform hover:scale-105 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 duration-300"
            >
              <span>{t("hero.ctaPrimary")}</span>
              <ArrowRight className="w-4 h-4 animate-bounce-right" />
            </button>
            <a
              href="#live-playground"
              className="px-8 py-4 text-sm font-bold text-center rounded-xl bg-[#07111d] border border-amber-400/20 text-amber-200 hover:bg-[#0c2034] hover:shadow-md hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2 duration-300"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-300">
                <Play className="w-2.5 h-2.5 fill-current" />
              </div>
              <span>{t("hero.demoLabel") || "Live Simulation"}</span>
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl w-full">
            <div className="rounded-2xl border border-white/10 bg-[#071121] p-4 text-sm text-slate-200 shadow-lg shadow-black/10">
              <p className="font-bold text-white">{t("hero.benefitFast")}</p>
              <p className="mt-2 text-slate-400">{t("hero.benefitFastDesc")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#071121] p-4 text-sm text-slate-200 shadow-lg shadow-black/10">
              <p className="font-bold text-white">{t("hero.benefitNoCard")}</p>
              <p className="mt-2 text-slate-400">{t("hero.benefitNoCardDesc")}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#071121] p-4 text-sm text-slate-200 shadow-lg shadow-black/10">
              <p className="font-bold text-white">{t("hero.benefitCancel")}</p>
              <p className="mt-2 text-slate-400">{t("hero.benefitCancelDesc")}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 relative w-full max-w-lg mx-auto flex items-center justify-center min-h-[460px]">
          <div className="absolute w-[280px] h-[240px] sm:w-[340px] sm:h-[300px] rounded-full bg-[radial-gradient(ellipse,rgba(245,158,11,0.2),transparent_68%)] blur-[50px] opacity-80" />
          <div
            className="relative flex h-[340px] w-[340px] items-center justify-center p-6 sm:h-[400px] sm:w-[400px] sm:-translate-y-8 -translate-y-6"
            onClick={() => setRobotMotionPaused((paused) => !paused)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setRobotMotionPaused((paused) => !paused);
              }
            }}
            aria-label={robotMotionPaused ? "Resume robot motion" : "Pause robot motion"}
          >
            <div className="absolute -inset-1.5 rounded-full animate-spin-slow" style={{ animationPlayState: robotMotionPaused ? "paused" : "running" }} />
            <div className="absolute -inset-8 rounded-full animate-pulse" style={{ animationPlayState: robotMotionPaused ? "paused" : "running" }} />
            <div className="relative z-10 h-[300px] w-[300px] robot-emitter transition-transform duration-500 hover:scale-105 sm:h-[360px] sm:w-[360px]">
              <InteractiveRobot
                isEmailFocused={false}
                isPasswordFocused={false}
                isPasswordVisible={false}
                isWaving
                showWelcome
                motionPaused={false}
                orbitRadiusX={190}
              />
            </div>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[220px] sm:w-[250px] h-[20px] bg-gradient-to-r from-slate-900 to-slate-800 border-t border-slate-700/50 rounded-b-lg shadow-xl flex items-center justify-center px-10">
              <div className="w-12 h-1 bg-slate-700 rounded-full" />
            </div>
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[200px] h-3 bg-amber-500/10 rounded-full blur-sm animate-pulse-shadow" />
        </div>
      </div>

      {/* 1. Integrations Banner */}
      <div id="integrations" className="pt-8 pb-4 border-y border-white/5">
        <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
          Connected Native Integrations & Infrastructure
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-slate-300">
          {[
            { name: "Shopify", badge: "Direct Webhooks", color: "from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-300" },
            { name: "WooCommerce", badge: "REST Sync", color: "from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-300" },
            { name: "Instagram", badge: "Meta Graph API", color: "from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-300" },
            { name: "Facebook", badge: "Catalog & Comments", color: "from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-300" },
            { name: "TikTok Shop", badge: "Viral Queue", color: "from-slate-700/40 to-slate-800/20 border-slate-600/40 text-slate-200" },
            { name: "YouTube", badge: "Community Posts", color: "from-red-500/20 to-rose-500/10 border-red-500/30 text-red-300" },
            { name: "Google Gemini 2.5", badge: "Multimodal AI", color: "from-amber-500/20 to-yellow-500/10 border-amber-500/30 text-amber-300" },
            { name: "Redis & Postgres", badge: "Sub-Second Bus", color: "from-orange-500/20 to-amber-500/10 border-orange-500/30 text-orange-300" },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-br ${item.color} border backdrop-blur-md shadow-sm hover:scale-105 transition-all duration-200`}
            >
              <span className="text-sm font-bold text-white">{item.name}</span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-black/40 text-white/80">
                {item.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Seven Specialized AI Agents */}
      <div id="ai-workforce" className="py-8 space-y-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Bot className="w-3.5 h-3.5" />
            Your 24/7 Digital Workforce
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Seven Specialized AI Agents. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300">
              Zero Human Churn.
            </span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Unlike single-purpose bots, AUTO-FTE coordinates 7 specialized agents operating in an event-driven loop. Each agent owns a critical pillar of your e-commerce operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              num: "01",
              role: "Inventory Sync Agent",
              desc: "Listens to live Shopify webhooks, prevents overselling, detects low stock, and automatically prepares supplier replenishment orders.",
              icon: Package,
              badge: "Real-Time Sync",
              metrics: "Sub-Second SKU Updates",
              accent: "border-amber-500/30 group-hover:border-amber-400/60",
            },
            {
              num: "02",
              role: "Content Generation Agent",
              desc: "Gemini-powered copywriter crafts conversion-focused captions, hashtags, and product lifestyle renders aligned with your brand guidelines.",
              icon: Sparkles,
              badge: "Gemini 2.5 Flash",
              metrics: "10x Faster Post Creation",
              accent: "border-purple-500/30 group-hover:border-purple-400/60",
            },
            {
              num: "03",
              role: "Content Scheduling Agent",
              desc: "Automatically schedules and publishes content to Instagram, Facebook, TikTok, YouTube, and LinkedIn at peak audience engagement windows.",
              icon: Calendar,
              badge: "Omnichannel Queue",
              metrics: "100% Autonomous Queue",
              accent: "border-blue-500/30 group-hover:border-blue-400/60",
            },
            {
              num: "04",
              role: "Support & Comments Agent",
              desc: "24/7 autonomous chatbot & comment replies in English, Urdu, and Roman Urdu. Resolves customer inquiries, product questions, and order lookups instantly.",
              icon: MessageCircle,
              badge: "Trilingual Support",
              metrics: "< 3s Response Time",
              accent: "border-emerald-500/30 group-hover:border-emerald-400/60",
            },
            {
              num: "05",
              role: "SEO Insights Agent",
              desc: "Meta tag auditor, Google Search trend analyzer, and organic keyword optimizer. Detects ranking opportunities and generates SEO descriptions.",
              icon: Search,
              badge: "SEO & Keyword Audit",
              metrics: "Automated SEO Audits",
              accent: "border-rose-500/30 group-hover:border-rose-400/60",
            },
            {
              num: "06",
              role: "Analytics & KPI Agent",
              desc: "Performs hourly order rollups, daily P&L digests, and anomaly detection so you always know your profit margins without opening spreadsheets.",
              icon: BarChart3,
              badge: "Hourly Rollup",
              metrics: "Automated Daily P&L",
              accent: "border-cyan-500/30 group-hover:border-cyan-400/60",
            },
            {
              num: "07",
              role: "Collaboration Orchestrator",
              desc: "The brain behind the system: manages agent heartbeats, multi-step workflows, task queues in Redis, and human-in-the-loop escalations.",
              icon: Cpu,
              badge: "Core Controller",
              metrics: "Fault-Tolerant Heartbeat",
              accent: "border-yellow-500/30 group-hover:border-yellow-400/60",
              spanFull: true,
            },
          ].map((agent, i) => (
            <div
              key={i}
              className={`p-6 sm:p-8 rounded-3xl bg-[#07111d]/90 border ${agent.accent} backdrop-blur-xl relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${
                agent.spanFull ? "lg:col-span-3 bg-gradient-to-r from-[#07111d] via-[#0d1c2d] to-[#07111d]" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono font-bold text-amber-400/80 px-2 py-1 rounded-md bg-amber-400/10">
                    Agent #{agent.num}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 px-2.5 py-1 rounded-full bg-white/5 border border-white/10">
                    {agent.badge}
                  </span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <agent.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
                    {agent.role}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-4">{agent.desc}</p>
              </div>
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {agent.metrics}
                </span>
                <span className="text-slate-500 group-hover:text-amber-400 transition-colors">24/7 Autopilot →</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Interactive Simulation Playground */}
      <div id="live-playground" className="py-8 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Play className="w-3.5 h-3.5" />
            Interactive Demo
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Experience AUTO-FTE Live</h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Test how the autonomous agents react to real e-commerce store events right in your browser.
          </p>
        </div>

        <div className="p-6 sm:p-10 rounded-3xl bg-[#07111d]/95 border border-white/10 shadow-2xl backdrop-blur-xl max-w-4xl mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 border-b border-white/10 pb-4">
            {[
              { id: "inventory", label: "📦 Inventory Auto-Alert" },
              { id: "content", label: "✨ AI Caption Studio" },
              { id: "support", label: "🤖 24/7 Bilingual Chat" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSimActiveTab(tab.id as any)}
                className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  simActiveTab === tab.id
                    ? "bg-amber-400 text-[#06111b] shadow-lg shadow-amber-400/20 scale-105"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Inventory */}
          {simActiveTab === "inventory" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white">Scenario: Product Stock Drops to 2 Units</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Item: Classic Leather Jacket (SKU: LJ-BLK-04)</p>
                </div>
                <button
                  onClick={() => {
                    setSimStockTriggered(true);
                    showToast("⚡ Stock event triggered: Agent 1 activated!", "info");
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  Trigger Low-Stock Event
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Shopify Webhook Input</span>
                  <pre className="text-xs font-mono text-amber-300/90 overflow-x-auto bg-black/60 p-3 rounded-xl">
{`{
  "event": "orders/create",
  "sku": "LJ-BLK-04",
  "remaining_stock": ${simStockTriggered ? "2" : "14"},
  "status": "${simStockTriggered ? "LOW_STOCK_ALERT" : "HEALTHY"}"
}`}
                  </pre>
                </div>

                <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-500/30 space-y-3">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autonomous Agent Actions
                  </span>
                  {simStockTriggered ? (
                    <div className="space-y-2 text-xs text-slate-200">
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Synced inventory count across Shopify & TikTok</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Pushed supplier replenishment draft to dashboard</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-blue-400 shrink-0" />
                        <span>Flagged "Hurry, only 2 left!" on live product page</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-28 flex items-center justify-center text-xs text-slate-400 italic text-center">
                      Click "Trigger Low-Stock Event" above to see real-time agent workflow
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Content Studio */}
          {simActiveTab === "content" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white">Target Product: Minimalist Chronograph Watch</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Tone: Luxury & Aesthetic • Channel: Instagram & TikTok</p>
                </div>
                <button
                  onClick={() => {
                    setSimContentGenerating(true);
                    setTimeout(() => {
                      setSimContentGenerating(false);
                      setSimGeneratedPost(true);
                      showToast("✨ Post crafted by Google Gemini 2.5!", "success");
                    }, 800);
                  }}
                  disabled={simContentGenerating}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-400/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {simContentGenerating ? "Crafting Copy..." : "Generate Social Post"}
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 border border-white/10">
                {simGeneratedPost ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        IG
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">yourstore_official • <span className="text-amber-400 font-normal">Auto-Scheduled</span></p>
                        <p className="text-[10px] text-slate-400">Optimal engagement window: Today at 6:45 PM</p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                      Precision meets timeless elegance. ⏳ Crafted for those who value every second, our Minimalist Chronograph is engineered with sapphire crystal glass and genuine Italian leather.
                      <br /><br />
                      ⚡ Limited production batch now live on store. Tap the link in bio to claim yours with complimentary worldwide shipping.
                      <br /><br />
                      <span className="text-amber-400">#LuxuryTimepiece #MinimalistDesign #ModernElegance #WatchCollector #ECommerceStyle</span>
                    </p>
                  </div>
                ) : (
                  <div className="h-28 flex items-center justify-center text-xs text-slate-400 italic text-center">
                    Click "Generate Social Post" above to simulate Google Gemini copywriter
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 3: Support */}
          {simActiveTab === "support" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white">24/7 Storefront Live Chatbot</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Supports both English and Urdu (اردو) automatically</p>
                </div>
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10">
                  <button
                    onClick={() => setSimChatLanguage("en")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      simChatLanguage === "en" ? "bg-amber-400 text-black" : "text-slate-400"
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setSimChatLanguage("ur")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      simChatLanguage === "ur" ? "bg-amber-400 text-black" : "text-slate-400"
                    }`}
                  >
                    اردو
                  </button>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                {simChatLanguage === "en" ? (
                  <>
                    <div className="flex justify-end">
                      <div className="max-w-xs px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs">
                        Hi! Where is my order #AFTE-8921?
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <div className="max-w-xs px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 text-slate-200 text-xs space-y-1">
                        <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          AUTO-FTE Support Agent
                        </p>
                        <p>Hello! Order #AFTE-8921 was fulfilled 3 hours ago via Express Logistics. Tracking: <span className="text-amber-300 font-mono">TRK-98124</span>. Expected arrival: Tomorrow by 2 PM!</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-start" dir="rtl">
                      <div className="max-w-xs px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-200 text-xs font-sans">
                        السلام علیکم! میرا آرڈر #AFTE-8921 کب تک پہنچے گا؟
                      </div>
                    </div>
                    <div className="flex justify-end" dir="rtl">
                      <div className="max-w-xs px-4 py-2.5 rounded-2xl bg-white/10 border border-white/10 text-slate-200 text-xs space-y-1 font-sans">
                        <p className="font-semibold text-emerald-400 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          AUTO-FTE سپورٹ ایجنٹ
                        </p>
                        <p>وعلیکم السلام! آپ کا آرڈر #AFTE-8921 کوریئر کو روانہ کر دیا گیا ہے۔ ٹریکنگ نمبر: <span className="text-amber-300 font-mono">TRK-98124</span> ہے۔ کل دوپہر 2 بجے تک موصول ہو جائے گا!</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4. Quantifiable Impact & Metrics */}
      <div className="py-8 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        {[
          { val: "< 1.2s", label: "Chatbot Response Time", sub: "Fastest in e-commerce" },
          { val: "10x", label: "Content Creation Speed", sub: "Gemini 2.5 studio" },
          { val: "15+ Hrs", label: "Saved Weekly / Store", sub: "Zero manual admin" },
          { val: "99.9%", label: "Real-Time Sync Uptime", sub: "Redis event streams" },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-6 rounded-3xl bg-[#07111d]/90 border border-white/10 text-center space-y-2 hover:border-amber-400/40 transition-all"
          >
            <p className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 font-mono">
              {stat.val}
            </p>
            <p className="text-xs sm:text-sm font-bold text-white">{stat.label}</p>
            <p className="text-[10px] text-slate-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* 5. FAQ */}
      <div id="faq" className="py-8 space-y-8 max-w-3xl mx-auto w-full">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5" />
            Common Questions
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-sm">
            Everything you need to know about setting up your autonomous AI employee.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: "Is it safe to connect my Shopify or WooCommerce store?",
              a: "Yes, 100%. AUTO-FTE connects via official OAuth API keys with read-only scopes by default. All access tokens are encrypted with AES-256 / Fernet key derivation, and your data is never used to train public AI models.",
            },
            {
              q: "How does the bilingual support (English & Urdu) work?",
              a: "Our customer support agent detects the language of incoming visitor messages automatically. Whether a customer types in formal English, Roman Urdu, or standard Urdu script, the AI resolves their order status and questions accurately in the same language.",
            },
            {
              q: "Can I review AI-generated posts and replies before they publish?",
              a: "Absolutely. You have total control: you can keep any agent in 'Human-in-the-Loop' mode where drafts require one-click approval, or toggle into full autonomous autopilot once you trust the brand voice.",
            },
            {
              q: "Do I need a credit card to start the free trial?",
              a: "No credit card is required. You get 14 days of full access to explore the dashboard, test the AI agents, and connect your store with zero financial obligation.",
            },
            {
              q: "Can I cancel or change my plan anytime?",
              a: "Yes. There are no contracts or long-term lock-ins. You can upgrade, downgrade, or cancel your subscription with a single click from the Settings tab.",
            },
          ].map((faq, idx) => {
            const isOpen = landingFaqOpen === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-[#07111d]/90 p-5 cursor-pointer transition-all hover:border-amber-400/30"
                onClick={() => setLandingFaqOpen(isOpen ? null : idx)}
              >
                <div className="flex items-center justify-between gap-4">
                  <h4 className="text-sm sm:text-base font-bold text-white">{faq.q}</h4>
                  <ChevronDown
                    className={`w-4 h-4 text-amber-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {isOpen && (
                  <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed pt-3 border-t border-white/5 animate-fade-in">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
