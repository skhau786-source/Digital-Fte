"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Package,
  Share2,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { InteractiveRobot } from "@/app/components/InteractiveRobot";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { useLanguage } from "@/app/lib/LanguageContext";
import { AppLogo } from "@/app/components/ui/AppLogo";

export function Sidebar() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  const navItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: t("dashboard.tabs.dashboard") || "Overview", href: "/dashboard/overview" },
    { icon: <Bot className="w-4 h-4" />, label: t("dashboard.tabs.agents") || "AI Agents", href: "/dashboard/agents", isNew: true },
    { icon: <Package className="w-4 h-4" />, label: t("dashboard.tabs.inventory") || "Inventory", href: "/dashboard/products" },
    { icon: <Share2 className="w-4 h-4" />, label: t("dashboard.tabs.social") || "Social Media", href: "/dashboard/social" },
    { icon: <Users className="w-4 h-4" />, label: t("dashboard.tabs.customers") || "Customers", href: "/dashboard/customers" },
    { icon: <CreditCard className="w-4 h-4" />, label: t("dashboard.tabs.payments") || "Payments", href: "/dashboard/payments" },
    { icon: <BarChart3 className="w-4 h-4" />, label: t("dashboard.tabs.analytics") || "Analytics", href: "/dashboard/analytics" },
    { icon: <Settings className="w-4 h-4" />, label: t("dashboard.tabs.settings") || "Settings", href: "/dashboard/settings" },
  ];

  return (
    <div className="w-64 bg-[#07111d]/85 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-4 flex flex-col shrink-0 overflow-y-auto">
      {/* Brand Logo */}
      <div className="px-2 py-3 border-b border-white/10">
        <AppLogo href="/dashboard/overview" size="md" showText={true} showTagline={true} />
      </div>

      {/* Robot Status */}
      <div className="flex flex-col items-center py-4 border-b border-slate-700/50">
        <div className="w-28 h-28 bg-slate-950 rounded-2xl p-1 shadow-inner shadow-amber-500/10">
          <InteractiveRobot isEmailFocused={false} isPasswordFocused={false} isPasswordVisible={false} compact showOrbitItems={false} />
        </div>
        <p className="text-xs font-bold text-amber-300 mt-2">FTE-01 "Apex"</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[10px] text-emerald-400 font-medium">Online</span>
        </div>
        <div className="w-full mt-2">
          <div className="flex justify-between text-[8px] text-slate-400">
            <span>AI Power</span>
            <span>87%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-0.5 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 h-1.5 rounded-full animate-pulse" style={{ width: "87%" }} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 ${
                isActive
                  ? "bg-gradient-to-r from-amber-500/20 to-yellow-400/10 text-amber-300 border border-amber-400/30 shadow-sm"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={isActive ? "text-amber-300" : "text-slate-400"}>{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
              {item.isNew && !isActive && (
                <span className="ml-auto text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Live
                </span>
              )}
              {isActive && (
                <span className="ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b from-amber-400 to-yellow-500"></span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout Button */}
      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 border-t border-slate-700/50 pt-4 cursor-pointer"
      >
        <LogOut className="w-4 h-4" />
        <span className="text-sm font-medium">{t("dashboard.logout")}</span>
      </button>
    </div>
  );
}
