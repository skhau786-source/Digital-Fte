"use client";

import React, { useState } from "react";
import { Lock, Mail, Check, ArrowRight } from "lucide-react";
import { useToast } from "@/app/components/providers/ToastProvider";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast("Please enter your email.", "error");
      return;
    }
    setForgotSubmitted(true);
    showToast(`Password reset instruction secure payload dispatched to ${forgotEmail}`, "success");
    setTimeout(() => {
      onClose();
      setForgotSubmitted(false);
      setForgotEmail("");
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white border border-violet-100 shadow-2xl rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold"
        >
          ✕
        </button>
        <h3 className="text-lg font-bold text-violet-950 flex items-center gap-2">
          <Lock className="w-5 h-5 text-violet-600" />
          <span>Recover Account Access</span>
        </h3>
        <p className="text-xs text-slate-500 mt-2">
          No stress. Provide your verified email and we'll dispatch a secure recovery vector.
        </p>
        <form onSubmit={handleForgotSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative rounded-xl shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="w-4 h-4 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="block w-full pl-10 pr-3.5 py-2.5 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600 transition-all"
                placeholder="founder@mystore.com"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={forgotSubmitted}
            className="w-full py-2.5 px-4 rounded-xl bg-violet-700 text-white font-bold text-xs tracking-wider hover:bg-violet-800 transition-all flex items-center justify-center gap-2"
          >
            {forgotSubmitted ? (
              <>
                <Check className="w-4 h-4" />
                <span>Payload Dispatched!</span>
              </>
            ) : (
              <>
                <span>Dispatch Recovery Key</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
