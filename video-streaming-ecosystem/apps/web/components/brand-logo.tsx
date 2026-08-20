"use client";

import Link from "next/link";
import Image from "next/image";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function BrandLogo({ className = "", size = "md", showText = true }: BrandLogoProps) {
  const iconSizes = {
    sm: 28,
    md: 36,
    lg: 48,
  };

  const currentSize = iconSizes[size];

  return (
    <Link
      href="/"
      className={`inline-flex items-center gap-2.5 group transition-transform active:scale-95 ${className}`}
    >
      <div className="relative flex items-center justify-center overflow-hidden rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 p-0.5 shadow-lg shadow-violet-500/25 group-hover:shadow-violet-500/40 transition">
        <Image
          src="/logo-square.png"
          alt="LumenStream Logo"
          width={currentSize}
          height={currentSize}
          priority
          className="rounded-[10px] object-cover transition-transform group-hover:scale-105"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold tracking-tight text-white font-sans text-xl leading-none bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent group-hover:from-violet-200 group-hover:to-white transition">
            Lumen<span className="text-violet-400">Stream</span>
          </span>
        </div>
      )}
    </Link>
  );
}
