import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
    }
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { bypassCache?: boolean } = {}
): Promise<T> {
  const isGet = !options.method || options.method.toUpperCase() === "GET";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const cacheKey = normalizedPath;

  // Instant SWR: Return cached response immediately if valid
  if (isGet && !options.bypassCache && apiCache.has(cacheKey)) {
    const entry = apiCache.get(cacheKey)!;
    if (Date.now() - entry.timestamp < CACHE_TTL_MS) {
      return entry.data as T;
    }
  }

  const token = typeof window !== "undefined" ? localStorage.getItem("digital_fte_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${normalizedPath}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("digital_fte_token");
      localStorage.removeItem("digital_fte_user");
      window.location.href = "/login";
    }
    throw new ApiError(401, "Unauthorized");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail || res.statusText || "Request failed");
  }

  const data = await res.json();

  if (isGet) {
    apiCache.set(cacheKey, { data, timestamp: Date.now() });
  } else {
    // Invalidate cache on state mutations (POST, PUT, DELETE, PATCH)
    apiCache.clear();
  }

  return data as T;
}

// --- Auth Endpoints ---
export const login = (email: string, password: string) =>
  apiFetch<{ access_token: string; token_type: string; user: any }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const signup = (email: string, password: string, fullName: string) =>
  apiFetch<{ access_token: string; token_type: string; user: any }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
      username: email.split("@")[0] || `user_${Date.now()}`,
    }),
  });

export const googleLogin = (payload: { email: string; name: string; picture?: string; googleId?: string }) =>
  apiFetch<{ access_token: string; token_type: string; user: any }>("/auth/google", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMe = () => apiFetch<any>("/auth/me");

export const forgotPassword = (email: string) =>
  apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });

export const resetPassword = (token: string, newPassword: string) =>
  apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });

// --- Store & Ecommerce Endpoints ---
export const listStores = () => apiFetch<any[]>("/api/v1/stores");

export const getStore = (storeId: string) => apiFetch<any>(`/api/v1/stores/${storeId}`);

export const connectStore = (data: { platform: string; shop_url: string; api_key?: string; api_secret?: string }) =>
  apiFetch<any>("/api/v1/stores/connect", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const disconnectStore = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}`, { method: "DELETE" });

export const triggerSync = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/sync`, { method: "POST" });

export const getStoreStats = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/stats`);

export const getStoreProducts = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/products`);

export const getStoreOrders = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/orders`);

export const getStoreAlerts = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/alerts/low-stock`);

export const resolveAlert = (storeId: string, alertId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/alerts/${alertId}/resolve`, { method: "POST" });

// --- AI Content & Scheduling ---
export const generatePost = (data: any) =>
  apiFetch<any>("/api/v1/content/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const schedulePost = (data: any) =>
  apiFetch<any>("/api/v1/content/schedule", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const listPosts = () => apiFetch<any[]>("/api/v1/content/posts");

// --- Comments & Engagement ---
export const listComments = (storeId: string) =>
  apiFetch<any[]>(`/api/v1/stores/${storeId}/comments`);

export const replyComment = (storeId: string, commentId: string, reply: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/comments/${commentId}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply }),
  });

// --- Analytics ---
export const getAnalyticsDashboard = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/analytics`);

export const generateAnalyticsSummary = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/analytics/summary`, { method: "POST" });

// --- Customers ---
export const listCustomers = (storeId: string) =>
  apiFetch<any[]>(`/api/v1/stores/${storeId}/customers`);

// --- SEO ---
export const getSEOAnalysis = (storeId: string) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/seo`);

// --- Chatbots ---
export const queryFreeChatbot = (message: string, sessionId?: string) =>
  apiFetch<any>("/chatbot/query", {
    method: "POST",
    body: JSON.stringify({ message, session_id: sessionId }),
  });

export const queryProChatbot = (message: string, storeId?: string, sessionId?: string) =>
  apiFetch<any>("/agent/query", {
    method: "POST",
    body: JSON.stringify({ message, store_id: storeId, session_id: sessionId }),
  });

// --- Store Settings ---
export const updateStoreSettings = (storeId: string, settings: any) =>
  apiFetch<any>(`/api/v1/stores/${storeId}/settings`, {
    method: "PUT",
    body: JSON.stringify(settings),
  });

// --- Onboarding Helpers ---
export const saveSocialChannels = (data: any) =>
  apiFetch<any>("/api/v1/onboarding/social-channels", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const saveBrandVoice = (data: any) =>
  apiFetch<any>("/api/v1/onboarding/brand-voice", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const updatePlan = (data: any) =>
  apiFetch<any>("/api/v1/onboarding/plan", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getJobStatus = (jobId: string) =>
  apiFetch<any>(`/api/v1/jobs/${jobId}`);

// --- Dashboard & Autonomous Agent Tasks ---
export const getDashboardOverview = (storeId?: string | number) =>
  apiFetch<{
    revenue_today: number;
    total_leads: number;
    pending_leads: number;
    responded_leads: number;
    total_orders: number;
    total_products: number;
    pending_tasks: number;
    orchestrator_status: string;
    recent_orders?: any[];
    store_name?: string;
    store_id?: number;
  }>(`/api/v1/dashboard/overview${storeId ? `?store_id=${storeId}` : ""}`);

export const listAgentTasks = () =>
  apiFetch<any[]>("/api/v1/dashboard/tasks");

export const createAgentTask = (data: {
  title: string;
  content?: string;
  hashtags?: string;
  priority?: "Low" | "Medium" | "High";
  platforms: string[];
  asset_url?: string;
}) =>
  apiFetch<any>("/api/v1/dashboard/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const approveAgentTask = (taskId: string | number) =>
  apiFetch<{ status: string; task_id: number; message: string }>(
    `/api/v1/dashboard/tasks/${taskId}/approve`,
    { method: "POST" }
  );

export interface AutomationSettingsData {
  manual_review: boolean;
  operating_start: number;
  operating_end: number;
  operating_start_time?: string;
  operating_end_time?: string;
  start_date?: string;
  end_date?: string;
  operating_days?: string[];
  timezone?: string;
  meta_access_token: string;
  autopilot_interval_hours?: number;
  safety_delay_minutes?: number;
  is_autopilot_enabled?: boolean;
}

export const getAutomationSettings = () =>
  apiFetch<AutomationSettingsData>("/api/v1/dashboard/settings");

export const updateAutomationSettings = (data: Partial<AutomationSettingsData>) =>
  apiFetch<any>("/api/v1/dashboard/settings", {
    method: "PUT",
    body: JSON.stringify(data),
  });

export const getSEOAnalysisLive = (storeId: number | string) =>
  apiFetch<{
    store_id: number;
    total_products: number;
    total_keywords: number;
    top_keywords: { keyword: string; count: number }[];
    avg_title_length: number;
    missing_descriptions: number;
    suggestions: string[];
  }>(`/api/v1/seo/analysis?store_id=${storeId}`);

export const launchAgentsWorkflow = () =>
  apiFetch<{ status: string; message: string; user_id: number }>("/api/v1/dashboard/launch", {
    method: "POST",
  });

export const getDashboardProducts = () =>
  apiFetch<any[]>("/api/v1/dashboard/products");

export const createDashboardProduct = (data: {
  title: string;
  description?: string;
  category?: string;
  vendor?: string;
  price: number;
  inventory_quantity: number;
  sku?: string;
  image_url?: string;
}) =>
  apiFetch<any>("/api/v1/dashboard/products", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getDashboardOrders = () =>
  apiFetch<any[]>("/api/v1/dashboard/orders");

export const getDashboardCustomers = () =>
  apiFetch<any[]>("/api/v1/dashboard/customers");

export const seedDashboardData = () =>
  apiFetch<{ status: string; message: string; products_count?: number; orders_count?: number }>(
    "/api/v1/dashboard/seed",
    { method: "POST", body: JSON.stringify({}) }
  );

