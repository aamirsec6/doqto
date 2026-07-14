"use client";

import { useEffect, useRef } from "react";

export function HospitalTracker() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {
      // Autoplay may be blocked; poster still shows.
    });
  }, []);

  return (
    <div className="relative w-full">
      <div className="relative overflow-hidden rounded-2xl border border-red/20 shadow-[0_18px_50px_-30px_rgba(124,0,0,0.45)]">
        <div className="relative aspect-[16/10] bg-[#e8e2dc]">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            poster="/demo-poster.jpg?v=3"
            muted
            loop
            playsInline
            autoPlay
            preload="auto"
            aria-label="Live hospital floor view"
          >
            <source src="/demo.mp4?v=3" type="video/mp4" />
          </video>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a1212]/30 via-transparent to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[10px] font-semibold tracking-wider text-text uppercase">
              Live view
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-red px-4 py-3 sm:px-5 sm:py-3.5">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-white/75 uppercase">
          Product preview
        </p>
        <p className="mt-1 text-xs leading-snug text-white sm:text-sm">
          See how a hospital floor becomes understandable at a glance: who is
          where, where patients are moving, and where critical equipment sits.
        </p>
      </div>
    </div>
  );
}
