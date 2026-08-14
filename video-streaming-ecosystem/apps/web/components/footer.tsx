"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-black/5 bg-neutral-50 px-4 py-8 text-sm text-neutral-600 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-neutral-400">
      <div className="mx-auto max-w-7xl space-y-6 text-center md:text-left">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-dark.png"
              alt="LumenStream"
              width={140}
              height={35}
              className="hidden dark:block h-7 w-auto object-contain"
            />
            <Image
              src="/logo-light.png"
              alt="LumenStream"
              width={140}
              height={35}
              className="block dark:hidden h-7 w-auto object-contain"
            />
          </Link>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium">
            <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">
              Home
            </Link>
            <Link href="/trending" className="hover:text-neutral-900 dark:hover:text-white">
              Trending
            </Link>
            <Link href="/categories" className="hover:text-neutral-900 dark:hover:text-white">
              Categories
            </Link>
            <Link href="/search" className="hover:text-neutral-900 dark:hover:text-white">
              Search
            </Link>
          </div>
        </div>

        {/* Disclaimer Card */}
        <div className="rounded-xl border border-black/5 bg-white p-4 text-xs leading-relaxed shadow-sm dark:border-white/5 dark:bg-white/5">
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            <strong>Disclaimer:</strong> We do not host any content on our servers. This service serves solely as a Stream to play and download publicly shared links.
          </p>
        </div>

        {/* Copyright & Rishav Credit */}
        <div className="flex flex-col items-center justify-between gap-2 text-xs text-neutral-500 md:flex-row dark:text-neutral-400">
          <p>© 2026 Lumenstream. All rights reserved. Not affiliated with Any sites.</p>
          <p className="flex items-center gap-1 font-medium">
            Made with <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 inline" /> by Rishav Srivastawa
          </p>
        </div>
      </div>
    </footer>
  );
}
