"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { AuthForm } from "@/app/components/auth/AuthForm";
import { AppHeader } from "@/app/components/ui/AppHeader";
import { Footer } from "@/app/components/Footer";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard/overview");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner text="Checking authentication..." />;
  }

  return (
    <div className="min-h-screen bg-[#02040d] text-white flex flex-col font-sans">
      <AppHeader />
      <main className="flex-1 flex flex-col justify-center py-6 px-4 sm:px-6 lg:px-8">
        <AuthForm mode="signin" />
      </main>
      <Footer />
    </div>
  );
}
