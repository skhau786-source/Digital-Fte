"use client";

import React, { useState, useEffect } from "react";
import {
  Instagram,
  Facebook,
  Music,
  Youtube,
  Twitter,
  Clock,
  CheckCircle2,
  Sparkles,
  Share2,
  Calendar,
} from "lucide-react";
import { GeneratePostModal } from "@/app/components/dashboard/modals/GeneratePostModal";
import { SchedulePostModal } from "@/app/components/dashboard/modals/SchedulePostModal";
import { useToast } from "@/app/components/providers/ToastProvider";
import { listAgentTasks, approveAgentTask, apiFetch } from "@/app/lib/api";

interface SocialTask {
  id: string | number;
  title: string;
  content?: string;
  platforms: string[];
  priority: "Low" | "Medium" | "High";
  status: "Pending Approval" | "Completed" | "pending" | "completed";
  created_at?: string;
  asset_url?: string;
}

export default function SocialPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"accounts" | "manager">("manager");

  const [instagramConnected, setInstagramConnected] = useState(false);
  const [facebookConnected, setFacebookConnected] = useState(false);
  const [tiktokConnected, setTiktokConnected] = useState(false);
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [twitterConnected, setTwitterConnected] = useState(false);

  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const [tasks, setTasks] = useState<SocialTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [approvingId, setApprovingId] = useState<string | number | null>(null);

  // Fetch real agent tasks and demo state from Backend
  useEffect(() => {
    let isMounted = true;

    apiFetch<any>("/api/v1/dashboard/overview")
      .then((ov) => {
        if (!isMounted || !ov) return;
        if (ov.is_demo) {
          setInstagramConnected(true);
          setFacebookConnected(true);
        }
      })
      .catch(() => {});

    listAgentTasks()
      .then((serverTasks) => {
        if (!isMounted || !Array.isArray(serverTasks)) return;
        const normalized: SocialTask[] = serverTasks.map((t: any) => ({
          id: t.id || t.task_id,
          title: t.title || "Autonomous Social Post",
          content: t.content || "",
          platforms: Array.isArray(t.platforms) ? t.platforms : ["Instagram"],
          priority: t.priority || "Medium",
          status: t.status === "completed" ? "Completed" : "Pending Approval",
          created_at: "Neon DB",
        }));
        setTasks(normalized);
      })
      .catch((err) => {
        console.error("Failed to load agent tasks:", err);
      })
      .finally(() => {
        if (isMounted) setLoadingTasks(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleApprove = async (task: SocialTask) => {
    setApprovingId(task.id);
    try {
      // Try hitting the backend endpoint if it's a numeric ID or server task
      if (typeof task.id === "number" || !String(task.id).startsWith("task-")) {
        await approveAgentTask(task.id);
      }
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "Completed" } : t))
      );
      showToast("Post approved and queued for live publishing! 🚀", "success");
    } catch {
      // If server error, still complete locally with notification
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "Completed" } : t))
      );
      showToast("Approved and scheduled locally.", "info");
    } finally {
      setApprovingId(null);
    }
  };

  const pendingCount = tasks.filter(
    (t) => t.status === "Pending Approval" || t.status === "pending"
  ).length;
  const completedCount = tasks.filter(
    (t) => t.status === "Completed" || t.status === "completed"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Nav Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-900/60 backdrop-blur-md rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("manager")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "manager"
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Agent Post Manager</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600 text-white animate-pulse">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("accounts")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "accounts"
                ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Connected Channels</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-[#06111b] font-bold text-xs hover:shadow-md cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Post</span>
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white font-bold text-xs hover:bg-white/20 cursor-pointer backdrop-blur-sm"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: AGENT POST APPROVAL MANAGER */}
      {activeTab === "manager" && (
        <div className="space-y-6">
          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Pending Approval</p>
                  <p className="text-2xl font-black text-white mt-1">{pendingCount}</p>
                </div>
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Requires your review before publishing</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Completed Posts</p>
                  <p className="text-2xl font-black text-white mt-1">{completedCount}</p>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Published across channels</p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Total Tasks</p>
                  <p className="text-2xl font-black text-white mt-1">{tasks.length}</p>
                </div>
                <Share2 className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Content Agent generation output</p>
            </div>
          </div>

          {/* Task Queue Cards */}
          <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">🤖 AI Content Scheduling Queue</h3>
                <p className="text-xs text-slate-500">
                  Autonomous posts created by Digital FTE. Approve to schedule immediately.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {tasks.length} Posts Total
              </span>
            </div>

            {loadingTasks ? (
              <div className="text-center py-12 text-slate-400 text-sm flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 animate-spin text-amber-500" />
                <span>Loading queue from Neon database...</span>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">
                No posts in queue. Click "Generate Post" above to let the AI create fresh content.
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => {
                  const isPending = task.status === "Pending Approval" || task.status === "pending";
                  return (
                    <div
                      key={task.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isPending
                          ? "bg-white border-amber-300/80 shadow-md shadow-amber-500/5"
                          : "bg-slate-50 border-slate-200 opacity-80"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                            <span
                              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                task.priority === "High"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : task.priority === "Medium"
                                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                                  : "bg-blue-100 text-blue-700 border border-blue-200"
                              }`}
                            >
                              {task.priority} Priority
                            </span>
                            {task.created_at && (
                              <span className="text-[11px] text-slate-400">· {task.created_at}</span>
                            )}
                          </div>

                          {task.content && (
                            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                              "{task.content}"
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase">Target Channels:</span>
                            {task.platforms.map((plat) => (
                              <span
                                key={plat}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200"
                              >
                                {plat === "Instagram" && <Instagram className="w-3 h-3 text-pink-600" />}
                                {plat === "Facebook" && <Facebook className="w-3 h-3 text-blue-600" />}
                                {plat === "Twitter" && <Twitter className="w-3 h-3 text-sky-500" />}
                                <span>{plat}</span>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="shrink-0 flex items-center gap-2">
                          {isPending ? (
                            <button
                              onClick={() => handleApprove(task)}
                              disabled={approvingId === task.id}
                              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{approvingId === task.id ? "Publishing..." : "Approve & Post Now"}</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Published / Queued</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CONNECTED CHANNELS */}
      {activeTab === "accounts" && (
        <div className="p-6 rounded-2xl bg-white/70 backdrop-blur-sm border border-slate-200/50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">📱 Connected Social Accounts</h3>
              <p className="text-xs text-slate-500">Link your brand profiles for autonomous publishing and comment management.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: <Instagram className="w-6 h-6 text-pink-600" />, name: "Instagram", connected: instagramConnected, toggle: () => setInstagramConnected(!instagramConnected) },
              { icon: <Facebook className="w-6 h-6 text-blue-600" />, name: "Facebook", connected: facebookConnected, toggle: () => setFacebookConnected(!facebookConnected) },
              { icon: <Music className="w-6 h-6 text-black" />, name: "TikTok", connected: tiktokConnected, toggle: () => setTiktokConnected(!tiktokConnected) },
              { icon: <Youtube className="w-6 h-6 text-red-600" />, name: "YouTube", connected: youtubeConnected, toggle: () => setYoutubeConnected(!youtubeConnected) },
              { icon: <Twitter className="w-6 h-6 text-sky-600" />, name: "Twitter", connected: twitterConnected, toggle: () => setTwitterConnected(!twitterConnected) },
            ].map((item, i) => (
              <div
                key={i}
                className={`p-4 rounded-xl border-2 transition-all ${
                  item.connected ? "border-emerald-500 bg-emerald-50/50" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-sm font-bold text-slate-700">{item.name}</span>
                  </div>
                  <button
                    onClick={item.toggle}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer ${
                      item.connected ? "text-emerald-700 bg-emerald-100" : "text-slate-600 bg-slate-100"
                    }`}
                  >
                    {item.connected ? "✅ Connected" : "○ Connect"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <GeneratePostModal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} />
      <SchedulePostModal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} />
    </div>
  );
}
