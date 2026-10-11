"use client";

import React, { useState, useEffect } from "react";
import {
  Package,
  Plus,
  RefreshCw,
  X,
  Search,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getDashboardProducts,
  createDashboardProduct,
  seedDashboardData,
  getSEOAnalysisLive,
  getDashboardOverview,
} from "@/app/lib/api";
import { useToast } from "@/app/components/providers/ToastProvider";

interface ProductItem {
  id: number;
  title: string;
  description: string;
  category: string;
  vendor: string;
  status: string;
  image_url: string;
  price: number;
  inventory_quantity: number;
  sku: string;
  created_at?: string;
}

export default function ProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // SEO Insights State (FTE-07)
  const [seoData, setSeoData] = useState<any>(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [showSEOSection, setShowSEOSection] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Electronics",
    price: "",
    inventory_quantity: "",
    sku: "",
    description: "",
  });

  const loadProducts = async () => {
    try {
      const data = await getDashboardProducts();
      setProducts(data || []);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadSEO = async () => {
    setSeoLoading(true);
    try {
      const ov = await getDashboardOverview();
      const sId = ov.store_id || 1;
      const data = await getSEOAnalysisLive(sId);
      setSeoData(data);
    } catch (err) {
      console.error("Failed to load SEO data:", err);
    } finally {
      setSeoLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    loadSEO();
  }, []);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast("Please enter a product title", "error");
      return;
    }

    setSubmitting(true);
    try {
      await createDashboardProduct({
        title: formData.title.trim(),
        category: formData.category,
        price: parseFloat(formData.price) || 0,
        inventory_quantity: parseInt(formData.inventory_quantity, 10) || 0,
        sku: formData.sku.trim() || undefined,
        description: formData.description.trim() || undefined,
      });

      showToast(`Product "${formData.title}" added to Neon database!`, "success");
      setShowAddModal(false);
      setFormData({
        title: "",
        category: "Electronics",
        price: "",
        inventory_quantity: "",
        sku: "",
        description: "",
      });
      await Promise.all([loadProducts(), loadSEO()]);
    } catch {
      showToast("Failed to create product. Check backend connection.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSeed = async () => {
    setLoading(true);
    try {
      const res = await seedDashboardData();
      showToast(res.message || "Seeded products into Neon database!", "success");
      await Promise.all([loadProducts(), loadSEO()]);
    } catch {
      showToast("Failed to seed data.", "error");
    } finally {
      setLoading(false);
    }
  };

  const inStockCount = products.filter((p) => (p.inventory_quantity || 0) > 10).length;
  const lowStockCount = products.filter(
    (p) => (p.inventory_quantity || 0) > 0 && (p.inventory_quantity || 0) <= 10
  ).length;
  const outOfStockCount = products.filter((p) => (p.inventory_quantity || 0) === 0).length;

  return (
    <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-600" />
            Inventory Management
          </h3>
          <p className="text-xs text-slate-500">Live products synced with Neon PostgreSQL</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md hover:shadow-amber-500/20 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-violet-50 rounded-xl text-center border border-violet-100">
          <p className="text-2xl font-black text-violet-700">{loading ? "..." : products.length}</p>
          <p className="text-xs text-slate-500">Total Products</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-xl text-center border border-emerald-100">
          <p className="text-2xl font-black text-emerald-700">{loading ? "..." : inStockCount}</p>
          <p className="text-xs text-slate-500">In Stock (&gt;10)</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-xl text-center border border-amber-100">
          <p className="text-2xl font-black text-amber-700">{loading ? "..." : lowStockCount}</p>
          <p className="text-xs text-slate-500">Low Stock (&le;10)</p>
        </div>
        <div className="p-4 bg-rose-50 rounded-xl text-center border border-rose-100">
          <p className="text-2xl font-black text-rose-700">{loading ? "..." : outOfStockCount}</p>
          <p className="text-xs text-slate-500">Out of Stock</p>
        </div>
      </div>

      {/* 🔍 SEO Insights & Catalog Health Panel (FTE-07 SEO Agent) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white border border-amber-400/20 shadow-xl mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-400/20 border border-amber-400/30 text-amber-400">
              <Search className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">🔍 SEO Insights &amp; Catalog Health</h4>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  FTE-07 SEO Agent
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Live organic keyword frequency &amp; meta tag suggestions for PostgreSQL catalog</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadSEO}
              disabled={seoLoading}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh SEO Analysis"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${seoLoading ? "animate-spin text-amber-400" : ""}`} />
            </button>
            <button
              onClick={() => setShowSEOSection(!showSEOSection)}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-slate-300 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>{showSEOSection ? "Collapse" : "Expand"}</span>
              {showSEOSection ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showSEOSection && (
          <div className="pt-4 space-y-4">
            {/* Live Metrics Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Keywords Extracted</span>
                <p className="text-xl font-black text-amber-300 mt-0.5">{seoData?.total_keywords || 0}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">From live titles</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Avg. Title Length</span>
                <p className="text-xl font-black text-cyan-300 mt-0.5">
                  {seoData?.avg_title_length ? `${seoData.avg_title_length}c` : "0c"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Recommended: 30-60 chars</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Missing Descriptions</span>
                <p
                  className={`text-xl font-black mt-0.5 ${
                    seoData?.missing_descriptions ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {seoData?.missing_descriptions || 0}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {seoData?.missing_descriptions ? "Action recommended" : "100% Complete"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Catalog Health</span>
                <p className="text-xl font-black text-emerald-400 mt-0.5">
                  {products.length > 0 ? (seoData?.missing_descriptions === 0 ? "100%" : "85%") : "0%"}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">SEO Readiness Score</p>
              </div>
            </div>

            {/* Keyword Pills & AI Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1">
              {/* Top Keywords */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-2.5">
                  <Tag className="w-3.5 h-3.5 text-cyan-400" />
                  Top Extracted Keywords (Neon PostgreSQL)
                </span>
                {seoData?.top_keywords && seoData.top_keywords.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {seoData.top_keywords.slice(0, 10).map((k: any, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-lg bg-white/10 text-[11px] text-slate-200 border border-white/10 flex items-center gap-1"
                      >
                        <span>#{k.keyword}</span>
                        <span className="text-[9px] font-bold text-amber-300">({k.count})</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {products.length === 0
                      ? "Sync your store or add products to unlock autonomous SEO keyword tracking."
                      : "No keywords extracted from short titles."}
                  </p>
                )}
              </div>

              {/* Actionable AI Suggestions */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mb-2.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Actionable AI Suggestions
                </span>
                {seoData?.suggestions && seoData.suggestions.length > 0 ? (
                  <div className="space-y-1.5">
                    {seoData.suggestions.map((sug: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="text-amber-400 shrink-0 mt-0.5">⚡</span>
                        <span className="leading-tight">{sug}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {products.length === 0
                      ? "Add products to view customized title and meta tag suggestions."
                      : "SEO looks healthy! All products have titles and descriptions."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product Table */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
          <p className="text-sm text-slate-500">Loading products from Neon database...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <Package className="w-10 h-10 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No products found in Neon database</p>
          <p className="text-xs text-slate-500 mb-4">Add your first product or seed sample catalog data</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
            >
              Add Product
            </button>
            <button
              onClick={handleSeed}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs"
            >
              Seed Sample Products
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Product</th>
                <th className="px-4 py-3 text-left font-bold">Category</th>
                <th className="px-4 py-3 text-left font-bold">SKU</th>
                <th className="px-4 py-3 text-left font-bold">Price</th>
                <th className="px-4 py-3 text-left font-bold">Stock</th>
                <th className="px-4 py-3 text-left font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => {
                const qty = p.inventory_quantity || 0;
                const statusLabel = qty === 0 ? "Out of Stock" : qty <= 10 ? "Low Stock" : "In Stock";
                const badgeColor =
                  qty === 0
                    ? "bg-rose-100 text-rose-800"
                    : qty <= 10
                    ? "bg-amber-100 text-amber-800"
                    : "bg-emerald-100 text-emerald-800";

                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.title}</div>
                      {p.description && (
                        <div className="text-xs text-slate-400 line-clamp-1">{p.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{p.category || "General"}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{p.sku || "-"}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      ${Number(p.price || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">{qty}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${badgeColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                Add New Product to Neon DB
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wireless Noise-Cancelling Headphones"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="99.99"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Inventory Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="50"
                    value={formData.inventory_quantity}
                    onChange={(e) => setFormData({ ...formData, inventory_quantity: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Electronics">Electronics</option>
                    <option value="Peripherals">Peripherals</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Smart Home">Smart Home</option>
                    <option value="Apparel">Apparel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WH-100-BLK"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Key features and details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Saving to Neon..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
