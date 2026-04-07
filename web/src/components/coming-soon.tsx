"use client";

import { useEffect, useState } from "react";

export function ComingSoon() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-black flex items-center justify-center">
      {/* Animated gradient orb */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20 blur-[120px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.72 0.19 155) 0%, oklch(0.55 0.22 250) 50%, transparent 70%)",
          animation: "orbFloat 8s ease-in-out infinite",
          top: "10%",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      />

      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <div
        className={`relative z-10 flex flex-col items-center text-center px-6 max-w-lg transition-all duration-1000 ease-out ${
          mounted
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-8"
        }`}
      >
        {/* Logo mark */}
        <div className="mb-10 relative">
          <img
            src="/icons/icon-192x192.png"
            alt="KILO Tracker logo"
            width={80}
            height={80}
            className="w-20 h-20 rounded-2xl object-contain"
            style={{
              filter: "drop-shadow(0 0 40px oklch(0.45 0.18 290 / 0.5))",
            }}
          />
        </div>

        {/* Badge */}
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium tracking-widest uppercase"
          style={{
            border: "1px solid oklch(1 0 0 / 0.08)",
            background: "oklch(1 0 0 / 0.03)",
            color: "oklch(0.72 0.19 155)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: "oklch(0.72 0.19 155)",
              boxShadow: "0 0 6px oklch(0.72 0.19 155 / 0.6)",
              animation: "pulse-dot 2s ease-in-out infinite",
            }}
          />
          Under Construction
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-4"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.98 0 0) 0%, oklch(0.65 0 0) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          KILO Tracker
        </h1>

        {/* Subhead */}
        <p
          className="text-lg sm:text-xl leading-relaxed mb-3 font-light"
          style={{ color: "oklch(0.65 0 0)" }}
        >
          Your daily kilo journal
          <br />
          is coming to{" "}
          <span
            className="font-medium"
            style={{ color: "oklch(0.85 0 0)" }}
          >
            iOS & Android
          </span>
          .
        </p>

        <p
          className="text-sm leading-relaxed mb-10 max-w-xs"
          style={{ color: "oklch(0.45 0 0)" }}
        >
          Track what you see, think, and feel with voice-first input
          built for kanaka out in ʻāina.
        </p>

        {/* App Store badge placeholder */}
        <div
          className="inline-flex items-center gap-3 rounded-xl px-6 py-3.5 font-medium text-sm transition-all duration-300 cursor-default select-none"
          style={{
            background: "oklch(1 0 0 / 0.06)",
            border: "1px solid oklch(1 0 0 / 0.08)",
            color: "oklch(0.75 0 0)",
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="shrink-0"
          >
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          Coming soon on the App Store
        </div>

        {/* Divider */}
        <div
          className="w-12 h-px my-10"
          style={{ background: "oklch(1 0 0 / 0.08)" }}
        />

        {/* Footer note */}
        <p className="text-xs" style={{ color: "oklch(0.35 0 0)" }}>
          Stay tuned. Big things ahead.
        </p>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes orbFloat {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
          50% { transform: translateX(-50%) translateY(-30px) scale(1.05); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
