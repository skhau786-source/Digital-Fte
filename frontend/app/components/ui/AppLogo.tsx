"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TrendingUp } from "lucide-react";
import { BRAND_CONFIG } from "@/app/lib/branding";

export interface AppLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showTagline?: boolean;
  taglineText?: string;
  href?: string;
  className?: string;
  onClick?: () => void;
}

const SIZE_CONFIGS = {
  sm: {
    container: "w-8 h-8",
    imageSize: 32,
    iconSize: "w-4 h-4",
    title: "text-base font-extrabold tracking-tight",
    tagline: "text-[8px] font-bold tracking-widest",
  },
  md: {
    container: "w-10 h-10",
    imageSize: 40,
    iconSize: "w-5 h-5",
    title: "text-lg font-extrabold tracking-tight",
    tagline: "text-[9px] font-bold tracking-widest",
  },
  lg: {
    container: "w-12 h-12",
    imageSize: 48,
    iconSize: "w-6 h-6",
    title: "text-xl font-extrabold tracking-tight",
    tagline: "text-[10px] font-bold tracking-widest",
  },
  xl: {
    container: "w-16 h-16",
    imageSize: 64,
    iconSize: "w-8 h-8",
    title: "text-2xl font-black tracking-tight",
    tagline: "text-xs font-bold tracking-widest",
  },
};

export function AppLogo({
  size = "md",
  showText = true,
  showTagline = true,
  taglineText,
  href,
  className = "",
  onClick,
}: AppLogoProps) {
  const [imageError, setImageError] = useState(false);
  const cfg = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  const content = (
    <div
      className={`inline-flex items-center gap-3 select-none group ${className}`}
      onClick={onClick}
    >
      {/* Dynamic Logo Image Container */}
      <div
        className={`${cfg.container} relative rounded-xl overflow-hidden bg-gradient-to-br from-amber-500 to-yellow-400 p-[1.5px] shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0 flex items-center justify-center`}
      >
        {!imageError ? (
          <div className="relative w-full h-full rounded-[10px] overflow-hidden bg-[#07111d] flex items-center justify-center">
            <Image
              src={BRAND_CONFIG.logoPath}
              alt={BRAND_CONFIG.name}
              width={cfg.imageSize}
              height={cfg.imageSize}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              priority={size === "lg" || size === "xl"}
            />
          </div>
        ) : (
          <div className="w-full h-full rounded-[10px] bg-gradient-to-br from-amber-500 to-yellow-400 flex items-center justify-center text-[#06111b] font-bold">
            <TrendingUp className={cfg.iconSize} />
          </div>
        )}
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col leading-tight">
          <span className={`${cfg.title} text-white group-hover:text-amber-300 transition-colors`}>
            {BRAND_CONFIG.name}
          </span>
          {showTagline && (
            <span
              className={`${cfg.tagline} text-amber-300 uppercase ${
                size === "sm" ? "" : "animate-pulse"
              }`}
            >
              {taglineText || BRAND_CONFIG.subtagline}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex cursor-pointer focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

export default AppLogo;
