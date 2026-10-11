"use client";

import React, { useState, useEffect } from "react";
import { Users, Mail, ShoppingBag, RefreshCw } from "lucide-react";
import { getDashboardCustomers } from "@/app/lib/api";

interface CustomerItem {
  id: number;
  name: string;
  email: string;
  orders_count: number;
  total_spent: number;
  last_order: string | null;
  status: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardCustomers()
      .then((data) => setCustomers(data || []))
      .catch((err) => console.error("Failed to load customers:", err))
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);

  return (
    <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-600" />
            Customer Intelligence
          </h3>
          <p className="text-xs text-slate-500">Live customer records aggregated from Neon PostgreSQL orders</p>
        </div>
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
          {customers.length} Active Records
        </span>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="text-2xl font-black text-blue-700">{loading ? "..." : customers.length}</p>
          <p className="text-xs text-slate-500">Total Customers</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-2xl font-black text-emerald-700">
            {loading ? "..." : `$${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </p>
          <p className="text-xs text-slate-500">Lifetime Revenue</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 col-span-2 md:col-span-1">
          <p className="text-2xl font-black text-purple-700">
            {loading || customers.length === 0
              ? "$0.00"
              : `$${(totalSpent / customers.length).toFixed(2)}`}
          </p>
          <p className="text-xs text-slate-500">Average Spend / Customer</p>
        </div>
      </div>

      {/* Customers List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
          <p className="text-sm text-slate-500">Fetching customer records from Neon database...</p>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No customer records in Neon DB yet</p>
          <p className="text-xs text-slate-500">Customers will automatically appear here as orders are placed.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-violet-50/40 transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                  {customer.name ? customer.name[0].toUpperCase() : "C"}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {customer.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200/50">
                <div>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-1 sm:justify-end">
                    <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                    {customer.orders_count} orders
                  </p>
                  <p className="text-xs text-slate-400">
                    {customer.last_order ? new Date(customer.last_order).toLocaleDateString() : "Recent"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-600">
                    ${Number(customer.total_spent || 0).toFixed(2)}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
