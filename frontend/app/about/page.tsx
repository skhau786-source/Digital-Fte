"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { SiteNav } from "../components/SiteNav";
import {
  Package,
  LineChart,
  Sparkles,
  Send,
  Image as ImageIcon,
  MessageCircle,
  MessagesSquare,
  Megaphone,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";

const categories = ["All", "Operations", "Marketing", "Engagement"];

const features = [
  {
    title: "Inventory Management",
    category: "Operations",
    desc: "Manage stock, sync catalogs, and automate replenishment checks in real time.",
    icon: Package,
    badge: "Saves 5 hrs/wk",
    preview: "Real-time stock sync active",
  },
  {
    title: "Revenue Dashboard",
    category: "Operations",
    desc: "See your sales, order volume, and revenue trends without manual reporting.",
    icon: LineChart,
    badge: "Instant Metrics",
    preview: "Automated daily P&L reports",
  },
  {
    title: "Caption Generation",
    category: "Marketing",
    desc: "Create social captions, product descriptions and ad copy instantly.",
    icon: Sparkles,
    badge: "10x Faster",
    preview: "AI copy crafted in 2 seconds",
  },
  {
    title: "Social Posting",
    category: "Marketing",
    desc: "Publish 1-2 high-quality social posts per day across your connected channels.",
    icon: Send,
    badge: "24/7 Active",
    preview: "Auto-scheduled post queues",
  },
  {
    title: "Image Generation",
    category: "Marketing",
    desc: "Generate product and lifestyle images using AI guidance for better engagement.",
    icon: ImageIcon,
    badge: "Studio Quality",
    preview: "4K lifestyle render engine",
  },
  {
    title: "Chatbot Integration",
    category: "Engagement",
    desc: "Handle customer messages and auto-reply to comments from one dashboard.",
    icon: MessageCircle,
    badge: "< 1s Response",
    preview: "Instant order lookup AI",
  },
  {
    title: "Comment Insights",
    category: "Engagement",
    desc: "Show comments in a dashboard and reply automatically to keep conversations moving.",
    icon: MessagesSquare,
    badge: "Zero Spam",
    preview: "Sentiment filtering engine",
  },
  {
    title: "@all Support",
    category: "Engagement",
    desc: "Trigger broad social engagement commands and manage audience interactions faster.",
    icon: Megaphone,
    badge: "High Reach",
    preview: "Bulk community broadcaster",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.1 },
  },
};

export default function FeaturesPage() {
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredFeatures =
    activeCategory === "All"
      ? features
      : features.filter((f) => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-[#02040d] text-white relative overflow-hidden select-none">
      {/* Background Glows */}
      <motion.div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-3xl"
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="pointer-events-none absolute top-1/2 -right-40 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-3xl" />

      {/* Grid Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: "radial-gradient(rgba(251,191,36,0.35) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
          maskImage: "radial-gradient(ellipse 60% 50% at 50% 20%, black 40%, transparent 100%)",
        }}
      />

      {/* Fixed Sticky Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#04090f]/90 backdrop-blur-xl px-6 sm:px-12 py-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-yellow-500 flex items-center justify-center text-[#06111b] font-bold shadow-lg shadow-amber-500/20">
            FTE
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">Digital FTE</h1>
            <p className="text-[10px] font-bold text-amber-300 tracking-widest uppercase">AI E-Commerce Employee</p>
          </div>
        </div>
        <SiteNav />
      </motion.header>

      <main className="max-w-6xl mx-auto px-6 sm:px-12 pt-32 pb-20 relative z-10">
        {/* Hero Section */}
        <motion.section initial="hidden" animate="show" variants={container} className="text-center mb-12">
          <motion.p
            variants={fadeUp}
            className="text-xs font-bold text-amber-300 tracking-widest uppercase bg-amber-500/10 border border-amber-500/20 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full cursor-default"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Autonomous Platform Capabilities
          </motion.p>
          <motion.h2 variants={fadeUp} className="mt-6 text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            AI features built for modern
            <br className="hidden sm:block" /> e-commerce teams
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Digital FTE brings inventory automation, social media content, revenue insights,
            chatbot replies and comment management together in one AI-powered employee.
          </motion.p>
        </motion.section>

        {/* Category Filter Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-12"
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className="relative px-4 py-2 rounded-full text-xs font-bold transition-colors duration-200"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFeatureTab"
                    className="absolute inset-0 bg-amber-400 rounded-full shadow-lg shadow-amber-500/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${isActive ? "text-[#06111b]" : "text-slate-400"}`}>
                  {cat}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Features Grid with Scroll Trigger Reveal */}
        <motion.div
          layout
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-50px" }}
          variants={container}
          className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 min-h-[400px]"
        >
          <AnimatePresence mode="popLayout">
            {filteredFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  layout
                  key={feature.title}
                  variants={fadeUp}
                  initial={{ opacity: 0, y: 35 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  className="rounded-3xl border border-white/10 bg-[#071121]/90 backdrop-blur-xl p-6 shadow-2xl flex flex-col justify-between relative overflow-hidden"
                >
                  <div>
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Icon className="w-5 h-5" strokeWidth={2} />
                      </div>

                      <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        {feature.badge}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>

                  {/* Status Indicator */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    <span>{feature.preview}</span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* Scroll-Triggered Value Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mt-20 rounded-3xl border border-white/10 bg-gradient-to-br from-[#06111d] to-[#0a1626] p-8 sm:p-10 shadow-2xl relative overflow-hidden"
        >
          <span className="text-[11px] font-bold text-amber-400 tracking-widest uppercase">Value Proposition</span>
          <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white">Why this matters for your store</h3>
          <p className="mt-4 text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">
            Your store gets an autonomous AI employee that reduces manual work, keeps inventory
            accurate, engages customers, and builds revenue with social media workflow automation.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-relaxed">
                Automate daily e-commerce operations and free your team to focus on high-impact growth strategies.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 flex items-start gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-300 leading-relaxed">
                Consolidate social media, inventory checks, chatbot replies, and revenue reporting into one single AI system.
              </p>
            </motion.div>
          </div>
        </motion.div>

        {/* Scroll-Triggered CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.5 }}
          className="mt-16 text-center"
        >
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-8 py-3.5 text-sm font-bold text-[#06111b] hover:bg-amber-300 transition-colors shadow-lg shadow-amber-500/10"
          >
            <span>View Pricing Plans</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </main>
    </div>
  );
}