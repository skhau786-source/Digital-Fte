"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { AppHeader } from "@/app/components/ui/AppHeader";
import { LandingPage } from "@/app/components/landing/LandingPage";
import { Footer } from "@/app/components/Footer";

export default function RootPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#02040d] text-white flex flex-col font-sans transition-all duration-300">
      <AppHeader />
      <main className="flex-1 flex flex-col py-6 px-4 sm:px-6 lg:px-8">
        <LandingPage
          onGetStarted={() => router.push(isAuthenticated ? "/dashboard/overview" : "/signup")}
        />
      </main>
      <Footer />
    </div>
  );
}
