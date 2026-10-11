"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "error";
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type?: "success" | "info" | "error") => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: "success" | "info" | "error" = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Overlay */}
      <div id="toast-container" className="fixed top-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border flex items-center justify-between gap-3 animate-bounce-short transition-all duration-300 ${
              toast.type === "success"
                ? "bg-emerald-50/95 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                ? "bg-rose-50/95 border-rose-200 text-rose-800"
                : "bg-violet-50/95 border-violet-200 text-violet-800"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
              {toast.type === "info" && <Sparkles className="w-5 h-5 text-violet-600 shrink-0 animate-spin-slow" />}
              <p className="text-sm font-medium">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-xs font-semibold opacity-60 hover:opacity-100 transition-opacity"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
