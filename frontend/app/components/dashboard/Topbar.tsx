"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { useLanguage } from "@/app/lib/LanguageContext";

export function Topbar() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();

  const getTitle = () => {
    if (pathname.includes("/overview")) return t("dashboard.titles.dashboard") || "Overview";
    if (pathname.includes("/products")) return t("dashboard.titles.inventory") || "Inventory";
    if (pathname.includes("/social")) return t("dashboard.titles.social") || "Social Media";
    if (pathname.includes("/customers")) return t("dashboard.titles.customers") || "Customers";
    if (pathname.includes("/payments")) return t("dashboard.titles.payments") || "Payments";
    if (pathname.includes("/analytics")) return t("dashboard.titles.analytics") || "Analytics";
    if (pathname.includes("/settings")) return t("dashboard.titles.settings") || "Settings";
    return "Dashboard";
  };

  const userInitial = (user?.full_name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200/50">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">{getTitle()}</h2>
        <p className="text-sm text-slate-500">
          {t("dashboard.welcomeBack")}, {user?.full_name || user?.email || "Founder"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Bell className="w-5 h-5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center text-[#06111b] font-bold shadow-lg shadow-amber-500/20">
          {userInitial}
        </div>
      </div>
    </div>
  );
}
