"use client";

import { use, useEffect, useState } from "react";
import { buildApiUrl } from "../../lib/config";
import { StoreChatWidget } from "../../components/storefront/StoreChatWidget";

interface Variant {
  variant_id: number;
  option: string;
  price: string;
  stock: number;
  in_stock: boolean;
}

interface Product {
  product_id: number;
  title: string;
  category: string | null;
  description: string | null;
  image_url: string | null;
  variants: Variant[];
}

interface Catalog {
  currency: string | null;
  products: Product[];
}

// Public storefront page: live catalog from the synced products/variants tables + the support chat widget.
export default function StorePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = use(params);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(buildApiUrl(`/api/v1/storefront/${storeId}/products`))
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "This store was not found." : "Could not load the catalog.");
        return r.json();
      })
      .then(setCatalog)
      .catch((e: Error) => setError(e.message));
  }, [storeId]);

  return (
    <main className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-8">
      <h1 className="mb-6 text-2xl font-bold">Our products</h1>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {!catalog && !error && <p className="text-slate-500">Loading…</p>}
      {catalog && catalog.products.length === 0 && <p className="text-slate-500">No products are available yet.</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {catalog?.products.map((p) => (
          <article key={p.product_id} className="rounded-xl border border-slate-200 p-4">
            {p.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image_url} alt={p.title} className="mb-3 h-40 w-full rounded-lg object-cover" />
            )}
            <h2 className="font-semibold">{p.title}</h2>
            {p.category && <p className="text-xs uppercase tracking-wide text-slate-500">{p.category}</p>}
            <ul className="mt-2 space-y-1 text-sm">
              {p.variants.map((v) => (
                <li key={v.variant_id} className="flex justify-between gap-2">
                  <span>{v.option && v.option !== "Default Title" ? v.option : "Standard"}</span>
                  <span>
                    {catalog.currency ? `${catalog.currency} ` : ""}
                    {v.price} · {v.in_stock ? `${v.stock} in stock` : "Out of stock"}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <StoreChatWidget storeId={storeId} />
    </main>
  );
}
