"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { OnboardingWizard } from "@/app/components/onboarding/OnboardingWizard";
import { AppHeader } from "@/app/components/ui/AppHeader";
import { Footer } from "@/app/components/Footer";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

export default function OnboardingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner text="Loading onboarding..." />;
  }

  return (
    <div className="min-h-screen bg-[#02040d] text-white flex flex-col font-sans">
      <AppHeader />
      <main className="flex-1 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
        <OnboardingWizard onComplete={() => router.push("/dashboard/overview")} />
      </main>
      <Footer />
    </div>
  );
}
