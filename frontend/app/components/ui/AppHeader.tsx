"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, ShoppingBag } from "lucide-react";
import { SiteNav } from "@/app/components/SiteNav";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { useLanguage } from "@/app/lib/LanguageContext";
import { AppLogo } from "@/app/components/ui/AppLogo";
import { ConnectStoreModal } from "@/app/components/dashboard/modals/ConnectStoreModal";

export function AppHeader() {
  const { isAuthenticated, logout } = useAuth();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [showConnectModal, setShowConnectModal] = useState(false);

  const isLanding = pathname === "/";

  return (
    <>
      <header id="app-header" className="border-b border-white/10 bg-[#04090f]/95 backdrop-blur-xl sticky top-0 z-40 px-6 sm:px-12 py-4 flex items-center justify-between">
        <AppLogo href="/" size="md" showText={true} showTagline={true} />

        {isLanding && !isAuthenticated && <SiteNav />}

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => setShowConnectModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-400/20 text-amber-300 border border-amber-400/40 hover:bg-amber-500/30 transition-all cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95"
                title="Connect your Shopify, WooCommerce, or e-commerce store"
              >
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                <span>Connect Store</span>
              </button>

              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-[#0f1f3f]/90 text-white border border-white/10 hover:bg-[#162a57]/95 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t("auth.logOut")}</span>
              </button>
            </>
          ) : isLanding ? (
          <Link
            href="/signup"
            className="px-4 py-2.5 text-sm font-bold rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:shadow-lg text-[#06111b] shadow-md shadow-amber-500/20 transition-all cursor-pointer"
          >
            {t("auth.getStarted")}
          </Link>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-[#09151f] text-amber-200 border border-amber-300/20 hover:bg-[#11253c] transition-all cursor-pointer"
          >
            <span>{t("auth.backHome")}</span>
          </Link>
        )}
      </div>
    </header>
    <ConnectStoreModal
      isOpen={showConnectModal}
      onClose={() => setShowConnectModal(false)}
    />
  </>
  );
}
