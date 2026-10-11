"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useGoogleLogin } from "@react-oauth/google";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Chrome,
} from "lucide-react";
import { InteractiveRobot } from "@/app/components/InteractiveRobot";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { useAuth } from "./AuthProvider";
import { useToast } from "@/app/components/providers/ToastProvider";
import { useLanguage } from "@/app/lib/LanguageContext";
import { buildApiUrl } from "@/app/lib/config";
import { AppLogo } from "@/app/components/ui/AppLogo";
import { login as apiLogin, signup as apiSignup } from "@/app/lib/api";

interface AuthFormProps {
  mode: "signin" | "signup";
}

export function AuthForm({ mode: initialMode }: AuthFormProps) {
  const [authMode, setAuthMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Field focus states for robot tracking
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isFullNameFocused, setIsFullNameFocused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const { login } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const router = useRouter();

  const handleOAuth = (platform: "shopify" | "google") => {
    if (platform === "google") {
      googleLogin();
    } else {
      showToast("Initializing secure OAuth with Shopify App Store...", "info");
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        const userObj = {
          id: "shopify_user",
          email: email || "founder@mystore.com",
          username: (email || "founder").split("@")[0],
          full_name: fullName || "Store Founder",
        };
        login("mock_token_shopify", userObj);
        showToast("Welcome! Successfully connected via Shopify.", "success");
        router.push("/onboarding");
      }, 1500);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      showToast("Authenticating with Google...", "info");
      setLoading(true);

      try {
        const response = await fetch("https://www.googleapis.com/oauth2/v1/userinfo", {
          headers: { Authorization: `Bearer ${codeResponse.access_token}` },
        });
        const userInfo = await response.json();

        const userEmail = userInfo.email || "user@example.com";
        const userObj = {
          id: userInfo.id || String(Date.now()),
          email: userEmail,
          username: userEmail.split("@")[0],
          full_name: userInfo.name || "Google User",
        };

        login(codeResponse.access_token, userObj);
        showToast(`Welcome ${userInfo.name || "there"}! Successfully logged in with Google.`, "success");

        try {
          await fetch(buildApiUrl("/auth/google"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: userInfo.email,
              name: userInfo.name,
              picture: userInfo.picture,
              googleId: userInfo.id,
            }),
          });
        } catch {
          // Backend sync optional
        }

        router.push("/onboarding");
      } catch (error) {
        setLoading(false);
        showToast("Google authentication failed. Please try again.", "error");
        console.error("Google login error:", error);
      }
    },
    onError: () => {
      showToast("Google login failed. Please try again.", "error");
    },
    flow: "implicit",
  });

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    if (authMode === "signup" && !fullName) {
      showToast("Please enter your full name.", "error");
      return;
    }
    if (!password || password.length < 6) {
      showToast("Password must be at least 6 characters long.", "error");
      return;
    }

    setLoading(true);
    showToast(
      authMode === "signin"
        ? "Verifying secure credentials..."
        : "Creating your AUTO-FTE enterprise account...",
      "info"
    );

    try {
      if (authMode === "signin") {
        const res = await apiLogin(email, password);
        login(res.access_token, {
          id: String(res.user?.id || ""),
          email: res.user?.email || email,
          username: res.user?.username || email.split("@")[0],
          full_name: res.user?.full_name || fullName || email.split("@")[0],
        });
        showToast("Login successful! Welcome back.", "success");
        router.push("/dashboard/overview");
      } else {
        const res = await apiSignup(email, password, fullName);
        login(res.access_token, {
          id: String(res.user?.id || ""),
          email: res.user?.email || email,
          username: res.user?.username || email.split("@")[0],
          full_name: res.user?.full_name || fullName,
        });
        showToast("Account created successfully! Welcome to AUTO-FTE.", "success");
        router.push("/onboarding");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      showToast(err.message || "Authentication failed. Please verify credentials.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div id="unified-split-container" className="max-w-6xl w-full mx-auto bg-[#02040d]/95 border border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.45)] rounded-[32px] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Left Panel - Auth Form */}
        <div id="auth-left-panel" className="lg:col-span-6 p-6 sm:p-10 md:p-12 flex flex-col justify-between bg-[#07111d]/95 border-r border-white/10">
          <div className="mb-6">
            <div className="mb-3 lg:hidden">
              <AppLogo size="sm" showTagline={false} />
            </div>
            <h2 className="text-3xl font-extrabold text-white tracking-tight">
              {authMode === "signin" ? t("auth.signIn") : t("auth.getStarted")}
            </h2>
            <p className="text-sm text-slate-400 mt-1.5">
              {authMode === "signin" ? t("auth.loginDesc") : t("auth.signupDesc")}
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {/* Mode Switcher */}
            <div className="relative flex p-1 bg-white/5 rounded-xl mb-6 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signin");
                  showToast("Switched to Sign In mode.", "info");
                }}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all z-10 cursor-pointer ${
                  authMode === "signin"
                    ? "bg-[#0d172f] text-amber-300 shadow-sm border border-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t("auth.signIn")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  showToast("Switched to Create Account mode.", "info");
                }}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all z-10 cursor-pointer ${
                  authMode === "signup"
                    ? "bg-[#0d172f] text-amber-300 shadow-sm border border-amber-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {t("auth.signUp")}
              </button>
            </div>

            {/* Social Logins */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={loading}
                className="group flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl border-2 border-amber-500/20 bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] text-xs font-bold transition-all duration-300 hover:shadow-lg hover:shadow-amber-400/30 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Chrome className="w-5 h-5 text-[#4285F4] shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="flex-1">{t("auth.continueGoogle")}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                )}
              </button>
            </div>

            <div className="relative flex py-2 items-center mb-6">
              <div className="flex-grow border-t border-slate-700/50"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {t("auth.orContinueWith")}
              </span>
              <div className="flex-grow border-t border-slate-700/50"></div>
            </div>

            {/* Main Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div
                className={`transition-all duration-300 overflow-hidden ${
                  authMode === "signup" ? "max-h-[85px] opacity-100 mb-4" : "max-h-0 opacity-0 pointer-events-none"
                }`}
              >
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  {t("auth.fullNameLabel")}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User
                      className={`w-4 h-4 transition-colors ${
                        isFullNameFocused ? "text-amber-400" : "text-slate-400"
                      }`}
                    />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onFocus={() => setIsFullNameFocused(true)}
                    onBlur={() => setIsFullNameFocused(false)}
                    className="block w-full pl-10 pr-3.5 py-3 bg-white/5 border border-white/10 focus:border-amber-400 focus:bg-white/10 focus:ring-amber-400/20 outline-none rounded-xl text-white placeholder-slate-500 text-sm transition-all duration-300"
                    placeholder={t("auth.fullNamePlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-1.5">
                  {t("auth.emailLabel")}
                </label>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail
                      className={`w-4 h-4 transition-colors ${isEmailFocused ? "text-amber-400" : "text-slate-400"}`}
                    />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                    className="block w-full pl-10 pr-3.5 py-3 bg-white/5 border border-white/10 focus:border-amber-400 focus:bg-white/10 focus:ring-amber-400/20 outline-none rounded-xl text-white placeholder-slate-500 text-sm transition-all duration-300"
                    placeholder={t("auth.emailPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide">
                    {t("auth.passwordLabel")}
                  </label>
                  {authMode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(true);
                        showToast("Please input reset target.", "info");
                      }}
                      className="text-xs font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer"
                    >
                      {t("auth.forgotPassword")}
                    </button>
                  )}
                </div>
                <div className="relative rounded-xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock
                      className={`w-4 h-4 transition-colors ${
                        isPasswordFocused ? "text-amber-400" : "text-slate-400"
                      }`}
                    />
                  </div>
                  <input
                    type={isPasswordVisible ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className="block w-full pl-10 pr-12 py-3 bg-white/5 border border-white/10 focus:border-amber-400 focus:bg-white/10 focus:ring-amber-400/20 outline-none rounded-xl text-white placeholder-slate-500 text-sm transition-all duration-300"
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsPasswordVisible(!isPasswordVisible);
                      showToast(
                        isPasswordVisible
                          ? "Privacy mode enabled. Robot is closing eyes."
                          : "Peeking mode enabled! Robot is watching.",
                        "info"
                      );
                    }}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                    title={isPasswordVisible ? "Hide password" : "Show password"}
                  >
                    {isPasswordVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-400 text-[#06111b] font-bold text-sm tracking-wide shadow-lg shadow-amber-300/30 hover:shadow-amber-400 transform active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-[#06111b] border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>{authMode === "signin" ? t("auth.signIn") : t("pricing.trialBtn")}</span>
                    <ArrowRight className="w-4 h-4 text-[#06111b]" />
                  </>
                )}
              </button>

              {authMode === "signin" && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("demo@autofte.com");
                      setPassword("AutoFTE@2026!");
                      showToast("Filled sample credentials: demo@autofte.com / AutoFTE@2026!", "info");
                    }}
                    className="text-[11px] text-amber-400/90 hover:text-amber-300 font-medium underline underline-offset-4 cursor-pointer transition-colors"
                  >
                    ⚡ Use Sample Enterprise Account (demo@autofte.com)
                  </button>
                </div>
              )}
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-700/50 text-center text-xs text-slate-400">
            {authMode === "signin" ? (
              <p>
                {t("auth.noAccount")}{" "}
                <button
                  onClick={() => setAuthMode("signup")}
                  className="text-amber-300 font-bold hover:underline cursor-pointer"
                >
                  {t("auth.signUpLink")}
                </button>
              </p>
            ) : (
              <p>
                {t("auth.haveAccount")}{" "}
                <button
                  onClick={() => setAuthMode("signin")}
                  className="text-amber-300 font-bold hover:underline cursor-pointer"
                >
                  {t("auth.signInLink")}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Right Panel - Robot Eye Tracking */}
        <div id="auth-right-panel" className="lg:col-span-6 bg-[#020918] p-8 sm:p-12 relative flex flex-col items-center justify-center overflow-visible border-t lg:border-t-0 lg:border-l border-white/10">
          <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full bg-amber-500/10 blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-[250px] h-[250px] rounded-full bg-violet-500/10 blur-2xl animate-float-delayed" />
          <div className="absolute top-12 right-12 w-6 h-6 rounded-full bg-amber-300/30 blur-md animate-pulse" />
          <div className="absolute top-1/3 -right-32 w-[500px] h-[500px] rounded-full bg-violet-400/08 blur-3xl animate-pulse-slow" />

          <div className="relative w-full flex items-center justify-center my-6 z-30">
            <div className="absolute w-64 h-64 bg-gradient-to-r from-violet-400/20 to-indigo-400/20 rounded-full blur-2xl animate-pulse-slow" />
            <InteractiveRobot
              isEmailFocused={isEmailFocused}
              isPasswordFocused={isPasswordFocused}
              isPasswordVisible={isPasswordVisible}
              isFullNameFocused={isFullNameFocused}
              orbitItemScale={1.25}
              visualScale={0.82}
            />
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </>
  );
}
