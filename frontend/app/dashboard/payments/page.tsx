"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Clock, CheckCircle2, RefreshCw } from "lucide-react";
import { getDashboardOrders } from "@/app/lib/api";

interface OrderPayment {
  id: number;
  order_number: string;
  customer_email: string;
  total_price: number;
  currency: string;
  financial_status: string;
  fulfillment_status: string;
  ordered_at: string | null;
  created_at: string | null;
}

export default function PaymentsPage() {
  const [orders, setOrders] = useState<OrderPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardOrders()
      .then((data) => setOrders(data || []))
      .catch((err) => console.error("Failed to load orders:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.total_price) || 0), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  return (
    <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-600" />
            Financial Transactions & Orders
          </h3>
          <p className="text-xs text-slate-500">Live order billing history retrieved from Neon PostgreSQL</p>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
          TLS Secured
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-2xl font-black text-emerald-700">
            {loading ? "..." : `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-slate-500">Total Settled Revenue</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-2xl font-black text-blue-700">{loading ? "..." : orders.length}</p>
          <p className="text-xs text-slate-500">Total Transactions</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
          <p className="text-2xl font-black text-purple-700">
            {loading ? "..." : `$${avgOrderValue.toFixed(2)}`}
          </p>
          <p className="text-xs text-slate-500">Average Order Value (AOV)</p>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
          <p className="text-sm text-slate-500">Loading order transactions from Neon database...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <CreditCard className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No payment transactions found in Neon DB</p>
          <p className="text-xs text-slate-500">Orders placed by customers will automatically register here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((payment) => {
            const isPaid = payment.financial_status === "paid";
            return (
              <div
                key={payment.id}
                className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-violet-50/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                      isPaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {isPaid ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{payment.order_number}</p>
                    <p className="text-xs text-slate-500">{payment.customer_email}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">
                    ${Number(payment.total_price || 0).toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2 justify-end mt-0.5">
                    <span className="text-[10px] text-slate-400">
                      {payment.ordered_at
                        ? new Date(payment.ordered_at).toLocaleDateString()
                        : "Today"}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {payment.financial_status || "Completed"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
