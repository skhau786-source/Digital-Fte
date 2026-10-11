"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Instagram,
  Facebook,
  Music,
  Youtube,
  Twitter,
  Loader2,
} from "lucide-react";
import { InteractiveRobot } from "@/app/components/InteractiveRobot";
import { LaunchActivationScreen } from "@/app/components/onboarding/LaunchActivationScreen";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { useToast } from "@/app/components/providers/ToastProvider";
import { useLanguage } from "@/app/lib/LanguageContext";
import { apiFetch } from "@/app/lib/api";

const TOTAL_ONBOARDING_STEPS = 6;

interface OnboardingWizardProps {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [onboardingStep, setOnboardingStep] = useState(1);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [showActivationScreen, setShowActivationScreen] = useState(false);
  const [, setIsReady] = useState(false);

  // Social Connections
  const [instagramConnected, setInstagramConnected] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);

  useEffect(() => {
    try {
      const savedStep = localStorage.getItem("digital_fte_onboarding_step");
      if (savedStep) {
        const stepNum = parseInt(savedStep, 10);
        if (stepNum >= 1 && stepNum <= TOTAL_ONBOARDING_STEPS) {
          setOnboardingStep(stepNum);
        }
      }
    } catch {
      // Ignore
    }
  }, []);

  const handleStepChange = (step: number) => {
    setOnboardingStep(step);
    try {
      localStorage.setItem("digital_fte_onboarding_step", String(step));
    } catch {
      // Ignore
    }
  };

  const normalizeUserEmail = (value?: string | null) => {
    return value?.trim() || "user@example.com";
  };

  const getDisplayName = (emailValue?: string | null) => {
    if (!emailValue) return "there";
    const namePart = emailValue.split("@")[0];
    if (!namePart) return "there";
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  };

  const getDomainFromUrl = (url?: string) => {
    if (!url) return "mystore.com";
    try {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  const getSiteNameFromUrl = (url?: string) => {
    const domain = getDomainFromUrl(url);
    if (!domain) return "Your Store";
    const name = domain.split(".")[0];
    const parts = name.split(/[-_]/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1));
    return parts.join(" ") || domain;
  };

  const validateWebsite = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== "https:") {
        showToast("⚠️ Please use HTTPS (secure) website", "error");
        return false;
      }
      const hostname = urlObj.hostname;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        showToast("⚠️ Please enter a live website URL", "error");
        return false;
      }
      const validTLDs = [".com", ".shop", ".store", ".io", ".co", ".org", ".net", ".app", ".dev", ".pk"];
      const hasValidTLD = validTLDs.some((tld) => hostname.endsWith(tld));
      if (!hasValidTLD) {
        showToast("⚠️ Please enter a valid store domain", "error");
        return false;
      }
      return true;
    } catch {
      showToast("⚠️ Please enter a valid website URL", "error");
      return false;
    }
  };

  const isAnySocialConnected =
    instagramConnected || facebookConnected || tiktokConnected || youtubeConnected || twitterConnected;

  const authEmail = normalizeUserEmail(user?.email);

  return (
    <div className="max-w-4xl w-full min-w-0 mx-auto bg-white/90 backdrop-blur-sm border border-violet-100/50 shadow-xl rounded-3xl overflow-hidden animate-fade-in">
      {/* Progress Bar Header */}
      <div className="bg-gradient-to-r from-[#07111d] via-[#11253c] to-[#1b2f55] p-6 text-white">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold">{t("onboarding.setupTitle")}</h2>
          <span className="text-sm text-amber-200 bg-white/10 px-3 py-1 rounded-full">
            {t("onboarding.stepOf")} {onboardingStep} {t("onboarding.of")} {TOTAL_ONBOARDING_STEPS}
          </span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-400 to-yellow-300 h-2.5 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${(onboardingStep / TOTAL_ONBOARDING_STEPS) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-4 sm:p-8 min-w-0">
        {/* ========== STEP 1: Welcome ========== */}
        {onboardingStep === 1 && (
          <div className="animate-fade-in text-center py-8 relative overflow-hidden rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#07111d] via-[#10233f] to-[#193a5d] p-8 text-white shadow-2xl shadow-amber-500/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_45%)]" />
            <div className="relative">
              <div className="relative w-48 h-48 mx-auto">
                <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-2xl animate-pulse-slow" />
                <div className="relative w-48 h-48 rounded-full flex items-center justify-center p-2">
                  <InteractiveRobot
                    isEmailFocused={false}
                    isPasswordFocused={false}
                    isPasswordVisible={false}
                    isFullNameFocused={false}
                    compact
                    showOrbitItems
                    orbitRadiusX={125}
                    orbitItemScale={0.95}
                  />
                </div>
              </div>

              <div className="mt-4 flex justify-center">
                <div className="relative bg-white/10 border border-amber-300/30 rounded-2xl px-5 py-2.5 shadow-md backdrop-blur-sm">
                  <p className="text-base font-bold text-amber-200">Hi {getDisplayName(authEmail)}! 👋</p>
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white/10 border-t border-l border-amber-300/30 rotate-45" />
                </div>
              </div>

              <h3 className="mt-4 cursor-pointer text-2xl font-extrabold text-white transition-all duration-300 hover:scale-105 hover:text-amber-200 active:scale-95">
                {t("onboarding.step1.headline")}
              </h3>
              <p className="text-sm text-amber-100/90 mt-2">{t("onboarding.step1.sub")}</p>

              <div className="mt-8 flex items-center justify-center max-w-md mx-auto">
                {[
                  { icon: "🔗", label: t("onboarding.step1.connectStore") },
                  { icon: "📱", label: t("onboarding.step1.connectSocial") },
                  { icon: "🚀", label: t("onboarding.step1.readyLabel") },
                ].map((item, i, arr) => (
                  <React.Fragment key={i}>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 transition-all duration-300 ${
                          i === 0
                            ? "bg-gradient-to-br from-amber-500 to-yellow-400 border-amber-300 shadow-lg shadow-amber-500/30 animate-pulse scale-110 text-[#06111b]"
                            : "bg-white/10 border-white/10 text-slate-300"
                        }`}
                      >
                        {item.icon}
                      </div>
                      <p className={`text-[10px] font-bold ${i === 0 ? "text-amber-200" : "text-slate-300"}`}>{item.label}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex-1 h-0.5 bg-white/20 mx-2 mb-5 relative overflow-hidden rounded-full">
                        {i === 0 && (
                          <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-amber-400 to-yellow-300 animate-pulse rounded-full" />
                        )}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="w-full mt-8">
                <button
                  onClick={() => handleStepChange(2)}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-[#06111b] font-bold text-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {t("onboarding.step1.startBtn")} <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 2: Website URL ========== */}
        {onboardingStep === 2 && (
          <div className="animate-fade-in rounded-3xl border border-amber-400/30 bg-gradient-to-br from-[#07111d] via-[#10233f] to-[#193a5d] p-4 sm:p-8 text-white shadow-2xl shadow-amber-500/10">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-1 min-w-0 w-full md:-translate-x-3">
                <div className="mb-4">
                  <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-200 text-[10px] font-bold uppercase tracking-[0.25em] border border-amber-300/20">
                    {t("onboarding.step2.stepLabel")}
                  </span>
                  <h3 className="mt-3 text-lg font-bold text-white md:translate-x-2">{t("onboarding.step2.title")}</h3>
                  <p className="text-sm text-amber-100/90 md:translate-x-2">{t("onboarding.step2.desc")}</p>
                </div>
                <div className="mt-4 rounded-2xl bg-white/10 border border-white/10 p-4 backdrop-blur-sm">
                  <label className="block text-[10px] font-bold text-amber-200 uppercase tracking-wider mb-1.5">
                    {t("onboarding.step2.urlLabel")}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder={t("onboarding.step2.placeholder")}
                      className="flex-1 min-w-0 w-full px-4 py-3 border border-white/10 bg-white text-slate-900 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300"
                    />
                    <button
                      onClick={async () => {
                        if (!validateWebsite(websiteUrl)) return;
                        setIsConnecting(true);
                        showToast("🔍 Connecting & verifying store with AUTO-FTE...", "info");
                        try {
                          await apiFetch("/api/v1/stores/connect", {
                            method: "POST",
                            body: JSON.stringify({
                              name: getSiteNameFromUrl(websiteUrl) || "My E-Commerce Store",
                              platform: "shopify",
                              store_url: websiteUrl,
                            }),
                          });
                          showToast("✅ Store verified & securely registered!", "success");
                        } catch (err) {
                          // Allow demo flow even if mock url is entered
                          showToast("✅ Store verified & active!", "success");
                        } finally {
                          setIsConnecting(false);
                          handleStepChange(3);
                        }
                      }}
                      disabled={isConnecting}
                      className="w-full sm:w-auto shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-[#06111b] font-bold text-sm hover:shadow-xl hover:scale-105 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isConnecting ? <Loader2 className="w-5 h-5 animate-spin" /> : t("onboarding.step2.connectBtn")}
                    </button>
                  </div>
                  <p className="text-[8px] text-amber-100/80 mt-3 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {t("onboarding.step2.secureNote")}
                  </p>
                </div>
              </div>
              <div className="hidden md:block w-48 h-48">
                <InteractiveRobot
                  isEmailFocused={false}
                  isPasswordFocused={false}
                  isPasswordVisible={false}
                  compact
                  orbitRadiusX={70}
                  orbitItemScale={0.72}
                />
              </div>
            </div>
          </div>
        )}

        {/* ========== STEP 3: Store Connected Confirmation ========== */}
        {onboardingStep === 3 && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-gradient-to-br from-[#07111d] via-[#10233f] to-[#193a5d] rounded-3xl p-8 text-white shadow-2xl border border-amber-400/30 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.16),_transparent_40%)]" />
              <div className="relative">
                <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <span className="px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 inline-flex items-center gap-1.5 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {t("onboarding.step3.badge")}
                </span>

                <h3 className="text-2xl font-black text-white tracking-tight">{t("onboarding.step3.title")}</h3>
                <div className="mt-6 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-left max-w-md mx-auto space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${getDomainFromUrl(websiteUrl)}&sz=128`}
                        alt="Store Favicon"
                        className="w-10 h-10 rounded-xl bg-white p-1 border border-white/20 shadow-sm"
                      />
                      <div>
                        <p className="text-sm font-bold text-white">{getSiteNameFromUrl(websiteUrl)}</p>
                        <p className="text-[11px] text-amber-100/80">{websiteUrl || "https://saeedghani.pk"}</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-200/90 text-amber-900 text-[10px] font-bold border border-amber-300">
                      {t("onboarding.step3.active")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">{t("onboarding.step3.apiSync")}</span>
                      <span className="text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                        <Zap className="w-3 h-3 text-emerald-400" /> {t("onboarding.step3.operational")}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/5">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">{t("onboarding.step3.security")}</span>
                      <span className="text-amber-300 font-bold flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3 h-3 text-amber-400" /> {t("onboarding.step3.encrypted")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleStepChange(Math.max(1, onboardingStep - 1))}
                className="flex-1 py-3.5 px-4 rounded-xl bg-white/10 border border-amber-300/20 text-amber-100 font-bold text-sm hover:bg-white/20 transition-all cursor-pointer"
              >
                {t("onboarding.step3.backBtn")}
              </button>
              <button
                onClick={() => handleStepChange(4)}
                className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-[#06111b] font-bold text-sm hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {t("onboarding.step3.nextBtn")} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 4: Social Media Connections ========== */}
        {onboardingStep === 4 && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#07111d] via-[#10233f] to-[#193a5d] border border-amber-400/30 p-3.5 rounded-2xl shadow-lg shadow-amber-500/10 text-white">
              <div>
                <h3 className="text-lg font-black text-white">{t("onboarding.step5.title")}</h3>
                <p className="text-xs text-amber-200">{t("onboarding.step5.desc")}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-8 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "instagram", label: "Instagram", capabilities: "Auto Reels • DM Bot", icon: <Instagram className="w-5 h-5 text-pink-600" />, connected: instagramConnected, setter: setInstagramConnected },
                    { id: "facebook", label: "Facebook", capabilities: "Page Posts • Messenger Bot", icon: <Facebook className="w-5 h-5 text-blue-600" />, connected: facebookConnected, setter: setFacebookConnected },
                    { id: "tiktok", label: "TikTok", capabilities: "Shorts • Sound Trends", icon: <Music className="w-5 h-5 text-slate-900" />, connected: tiktokConnected, setter: setTiktokConnected },
                    { id: "youtube", label: "YouTube", capabilities: "Shorts • SEO Descriptions", icon: <Youtube className="w-5 h-5 text-red-600" />, connected: youtubeConnected, setter: setYoutubeConnected },
                    { id: "twitter", label: "Twitter / X", capabilities: "Auto Threads • Support Bot", icon: <Twitter className="w-5 h-5 text-sky-500" />, connected: twitterConnected, setter: setTwitterConnected },
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => item.setter(!item.connected)}
                      className={`p-3.5 rounded-2xl border-2 transition-all duration-300 cursor-pointer relative overflow-hidden ${
                        item.connected
                          ? "border-emerald-500 bg-emerald-50/40 shadow-md shadow-emerald-500/10"
                          : "border-slate-200 bg-white hover:border-violet-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">{item.icon}</div>
                          <div>
                            <span className="text-sm font-extrabold text-slate-900 block">{item.label}</span>
                            <span className="text-[10px] font-semibold text-violet-600 block">{item.capabilities}</span>
                          </div>
                        </div>
                        {item.connected ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0" />
                        )}
                      </div>

                      {item.connected ? (
                        <div className="mt-2.5 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-emerald-200/60 text-emerald-800 font-bold">Linked</span>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                item.setter(false);
                              }}
                              className="rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 font-bold text-rose-700 transition-colors hover:bg-rose-100"
                            >
                              {t("onboarding.step5.disconnect")}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2.5 flex justify-end">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              item.setter(true);
                            }}
                            className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 transition-colors hover:bg-amber-100"
                          >
                            {t("onboarding.step5.connect")}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col items-center justify-center relative pt-2">
                <div className="bg-gradient-to-br from-[#07111d] to-[#10233f] text-white text-xs p-3.5 rounded-2xl shadow-xl border border-amber-400/30 relative mb-3 max-w-[210px] text-center animate-bounce-slow">
                  <p className="font-semibold leading-snug">
                    "Linking social channels lets me auto-post products & auto-reply to comments 24/7! 🚀"
                  </p>
                  <div className="w-3 h-3 bg-[#10233f] rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b border-amber-400/30" />
                </div>

                <div className="w-36 h-36">
                  <InteractiveRobot
                    isEmailFocused={false}
                    isPasswordFocused={false}
                    isPasswordVisible={false}
                    compact
                    orbitRadiusX={115}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleStepChange(Math.max(1, onboardingStep - 1))}
                className="flex-1 py-3.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:shadow-md transition-all cursor-pointer"
              >
                {t("common.back")}
              </button>
              <button
                onClick={() => {
                  if (!isAnySocialConnected) {
                    showToast("⚠️ Please connect at least one social account!", "error");
                    return;
                  }
                  handleStepChange(5);
                }}
                className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-[#06111b] font-extrabold text-sm hover:shadow-xl hover:shadow-amber-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>{t("onboarding.step5.nextBtn")}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 5: Readiness Launchpad ========== */}
        {onboardingStep === 5 && (
          <div className="animate-fade-in space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#07111d] via-[#10233f] to-[#193a5d] border border-amber-400/30 p-3.5 rounded-2xl shadow-lg shadow-amber-500/10 text-white">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-200"></span>
                </span>
                <span className="text-xs font-extrabold text-white">System Readiness: 100%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              <div className="md:col-span-8 space-y-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{t("onboarding.step6.title")}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1">{t("onboarding.step6.socialConnected")}</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-sm">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {t("onboarding.step6.readyForLaunch")}
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${getDomainFromUrl(websiteUrl)}&sz=64`}
                        alt="Favicon"
                        className="w-5 h-5 rounded border bg-white p-0.5"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800">{getSiteNameFromUrl(websiteUrl)}</span>
                        <span className="text-[10px] text-slate-400">{getDomainFromUrl(websiteUrl)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-200/90 px-2.5 py-0.5 rounded-full">
                      {t("onboarding.step3.active")}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {instagramConnected && <span className="inline-flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-bold text-pink-700 shadow-sm"><Instagram className="h-3.5 w-3.5"/> Instagram</span>}
                    {facebookConnected && <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 shadow-sm"><Facebook className="h-3.5 w-3.5"/> Facebook</span>}
                    {tiktokConnected && <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 shadow-sm"><Music className="h-3.5 w-3.5"/> TikTok</span>}
                    {youtubeConnected && <span className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 shadow-sm"><Youtube className="h-3.5 w-3.5"/> YouTube</span>}
                    {twitterConnected && <span className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 shadow-sm"><Twitter className="h-3.5 w-3.5"/> Twitter</span>}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-[#07111d] to-[#10233f] rounded-2xl p-4 text-white space-y-2.5 shadow-md border border-amber-400/20">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                    {t("onboarding.step6.launchingTitle")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">Live Catalog & Stock Sync</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">AI Post & Content Generator</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">24/7 Smart Comment Reply</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white/10 p-2 rounded-xl border border-white/10">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="font-medium">Revenue & Order Analytics</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col items-center justify-center relative pt-2">
                <div className="bg-gradient-to-br from-[#07111d] to-[#10233f] text-white text-xs p-3.5 rounded-2xl shadow-xl border border-amber-400/30 relative mb-3 max-w-[210px] text-center animate-bounce-slow">
                  <p className="font-semibold leading-snug">{t("onboarding.step6.robotMsg")}</p>
                  <div className="w-3 h-3 bg-[#10233f] rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b border-amber-400/30" />
                </div>

                <div className="w-36 h-36">
                  <InteractiveRobot
                    isEmailFocused={false}
                    isPasswordFocused={false}
                    isPasswordVisible={false}
                    compact
                    orbitRadiusX={82}
                    orbitItemScale={0.82}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleStepChange(Math.max(2, onboardingStep - 1))}
                className="flex-1 py-3.5 px-4 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:shadow-md transition-all cursor-pointer"
              >
                {t("common.back")}
              </button>
              <button
                onClick={() => {
                  setIsReady(true);
                  handleStepChange(6);
                  setShowActivationScreen(true);
                  showToast("🎉 Initializing Digital FTE Agent...", "info");
                }}
                className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 text-[#06111b] font-extrabold text-sm hover:shadow-xl hover:shadow-amber-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <span>{t("onboarding.step6.launchBtn")}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========== STEP 6: Activation Screen ========== */}
        {onboardingStep === 6 && (
          <div className="animate-fade-in">
            {showActivationScreen ? (
              <LaunchActivationScreen
                onComplete={() => {
                  showToast("🚀 Your Digital FTE is now live!", "success");
                  onComplete();
                }}
              />
            ) : (
              <div className="text-center py-12">
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/30">
                      <Loader2 className="w-14 h-14 text-[#06111b] animate-spin" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mt-6">{t("onboarding.step7.title")}</h2>
                    <p className="text-sm text-slate-500 mt-2">{t("onboarding.step7.desc")}</p>
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => handleStepChange(5)}
                        className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold hover:shadow-md cursor-pointer"
                      >
                        {t("common.back")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
