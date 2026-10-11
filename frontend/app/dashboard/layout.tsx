"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/auth/AuthProvider";
import { Sidebar } from "@/app/components/dashboard/Sidebar";
import { Topbar } from "@/app/components/dashboard/Topbar";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { ErrorBoundary } from "@/app/components/ui/ErrorBoundary";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <LoadingSpinner text="Verifying session..." />;
  }

  return (
    <div className="min-h-screen bg-[#02040d] text-white flex flex-col font-sans">
      <div className="flex-1 flex py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex h-[calc(100vh-80px)] w-full max-w-7xl mx-auto gap-4">
          <Sidebar />
          <div className="flex-1 bg-white/60 backdrop-blur-sm border border-white/20 rounded-3xl shadow-2xl p-6 overflow-y-auto flex flex-col">
            <Topbar />
            <div className="flex-1">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
