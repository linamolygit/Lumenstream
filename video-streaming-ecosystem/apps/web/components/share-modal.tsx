"use client";

import { useState } from "react";
import { X, Check, Copy, Share2 } from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url?: string;
}

export function ShareModal({ isOpen, onClose, title, url }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const platforms = [
    {
      name: "WhatsApp",
      bgColor: "bg-emerald-500 hover:bg-emerald-600",
      textColor: "text-white",
      href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`${title} - ${shareUrl}`)}`,
      icon: (
        <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
        </svg>
      ),
    },
    {
      name: "Telegram",
      bgColor: "bg-sky-500 hover:bg-sky-600",
      textColor: "text-white",
      href: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
      icon: (
        <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.535-.194 1.006.128.832.941z" />
        </svg>
      ),
    },
    {
      name: "X (Twitter)",
      bgColor: "bg-neutral-900 dark:bg-neutral-800 hover:bg-neutral-700",
      textColor: "text-white",
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`,
      icon: (
        <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      bgColor: "bg-blue-600 hover:bg-blue-700",
      textColor: "text-white",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      icon: (
        <svg className="h-6 w-6 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#181818] dark:text-white dark:border dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-white/10">
          <h3 className="flex items-center gap-2 text-lg font-bold">
            <Share2 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            Share Video
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/10 dark:text-neutral-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Video Title */}
        <p className="mt-4 text-xs font-semibold text-neutral-500 line-clamp-1 dark:text-neutral-400">
          {title}
        </p>

        {/* Platforms Grid */}
        <div className="mt-5 grid grid-cols-4 gap-3 text-center">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl transition group-hover:scale-105 ${p.bgColor} ${p.textColor} shadow-md`}
              >
                {p.icon}
              </div>
              <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300">
                {p.name}
              </span>
            </a>
          ))}
        </div>

        {/* Copy Link Input */}
        <div className="mt-6">
          <label className="mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Or copy link
          </label>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-1.5 dark:border-white/10 dark:bg-white/5">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full bg-transparent px-2 text-xs text-neutral-800 outline-none dark:text-white"
            />
            <button
              onClick={handleCopy}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-700"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
