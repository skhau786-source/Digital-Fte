"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildApiUrl } from "../../lib/config";

interface CartLine {
  product: string;
  option: string;
  quantity: number;
  unit_price: string;
  line_total: string;
}

interface Cart {
  items: CartLine[];
  item_count: number;
  total: string;
  checkout_url: string | null;
  warnings: string[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const EMPTY_CART: Cart = { items: [], item_count: 0, total: "0.00", checkout_url: null, warnings: [] };

// Conversation lives for the browser session (tab) only.
const storageKey = (storeId: number | string) => `dfte_store_chat_${storeId}`;

function loadSession(storeId: number | string): { sessionId: string | null; messages: ChatMessage[] } {
  try {
    const raw = sessionStorage.getItem(storageKey(storeId));
    if (raw) return JSON.parse(raw);
  } catch {
    /* storage unavailable or corrupt - start fresh */
  }
  return { sessionId: null, messages: [] };
}

export function StoreChatWidget({ storeId, storeName }: { storeId: number | string; storeName?: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCart, setShowCart] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Restore this tab's conversation, then re-sync from the server (source of truth for history + cart).
  useEffect(() => {
    const saved = loadSession(storeId);
    setMessages(saved.messages);
    setSessionId(saved.sessionId);
    if (saved.sessionId) {
      fetch(buildApiUrl(`/api/v1/storefront/chat/${saved.sessionId}?store_id=${storeId}`))
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d) return;
          if (Array.isArray(d.messages) && d.messages.length) setMessages(d.messages);
          if (d.cart) setCart(d.cart);
        })
        .catch(() => undefined);
    }
  }, [storeId]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey(storeId), JSON.stringify({ sessionId, messages }));
    } catch {
      /* ignore */
    }
  }, [storeId, sessionId, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy, open]);

  // Lock page scroll behind the full-screen mobile panel.
  useEffect(() => {
    if (!open) return;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    if (!isMobile) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || busy) return;
      setError(null);
      setMessages((m) => [...m, { role: "user", content: message }]);
      setInput("");
      setBusy(true);
      try {
        const res = await fetch(buildApiUrl("/api/v1/storefront/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store_id: Number(storeId), message, session_id: sessionId }),
        });
        if (res.status === 429) {
          setError("You're sending messages too quickly. Please wait a moment.");
          return;
        }
        if (!res.ok) {
          const detail = (await res.json().catch(() => null))?.detail;
          setError(typeof detail === "string" ? detail : "Chat is unavailable right now. Please try again shortly.");
          return;
        }
        const data = await res.json();
        setSessionId(data.session_id);
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        if (data.cart) setCart(data.cart);
      } catch {
        setError("Couldn't reach the store. Check your connection and try again.");
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, sessionId, storeId]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open chat"
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-[1000] flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl transition hover:bg-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-300"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {cart.item_count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-xs font-bold text-slate-900">
              {cart.item_count}
            </span>
          )}
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Store chat"
          className="fixed inset-0 z-[1000] flex flex-col bg-white text-slate-900 sm:inset-auto sm:bottom-4 sm:right-4 sm:h-[600px] sm:max-h-[calc(100vh-2rem)] sm:w-[380px] sm:rounded-2xl sm:shadow-2xl sm:ring-1 sm:ring-slate-200"
        >
          <header className="flex items-center justify-between bg-indigo-600 px-4 py-3 text-white sm:rounded-t-2xl">
            <div>
              <p className="text-sm font-semibold leading-tight">{storeName || "Store"} support</p>
              <p className="text-xs text-indigo-100">Ask about products, your cart or an order</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowCart((v) => !v)}
                className="rounded-md px-2 py-1 text-xs font-medium hover:bg-indigo-500"
                aria-expanded={showCart}
              >
                Cart ({cart.item_count})
              </button>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-lg leading-none hover:bg-indigo-500"
              >
                ×
              </button>
            </div>
          </header>

          {showCart && (
            <div className="max-h-48 overflow-y-auto border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              {cart.items.length === 0 ? (
                <p className="text-slate-500">Your cart is empty.</p>
              ) : (
                <>
                  <ul className="space-y-1">
                    {cart.items.map((l, i) => (
                      <li key={i} className="flex justify-between gap-2">
                        <span>
                          {l.quantity} × {l.product}
                          {l.option && l.option !== "Default Title" ? ` (${l.option})` : ""}
                        </span>
                        <span className="shrink-0">{l.line_total}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{cart.total}</span>
                  </p>
                  {cart.warnings.map((w, i) => (
                    <p key={i} className="mt-1 text-xs text-amber-700">{w}</p>
                  ))}
                  {cart.checkout_url && (
                    <a
                      href={cart.checkout_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block rounded-md bg-indigo-600 px-3 py-2 text-center font-medium text-white hover:bg-indigo-500"
                    >
                      Checkout
                    </a>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600">
                Hi! Ask me about our products, prices and stock, manage your cart, or check an order. You can write in English or Roman Urdu.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user" ? "rounded-br-sm bg-indigo-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-900"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-500">Typing…</div>
              </div>
            )}
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form
            className="flex items-end gap-2 border-t border-slate-200 p-3"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              maxLength={1000}
              placeholder="Type your message…"
              aria-label="Message"
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:text-sm"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      )}
    </>
  );
}
