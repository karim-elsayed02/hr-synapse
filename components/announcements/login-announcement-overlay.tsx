"use client";

import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  image_alt_text: string | null;
};

export function LoginAnnouncementOverlay() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/announcements?show_on_login=true");
        if (!res.ok) return;
        const data: Announcement[] = await res.json();
        if (cancelled || !data.length) return;

        setAnnouncements(data);
        setCurrentIdx(0);
        setVisible(true);
      } catch {
        /* silent */
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);

    const ids = announcements.map((a) => a.id);
    if (ids.length === 0) return;

    fetch("/api/announcements/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcement_ids: ids }),
    }).catch(() => {});
  }, [announcements]);

  if (!visible || announcements.length === 0) return null;

  const ann = announcements[currentIdx];
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < announcements.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#001A3D]/60 backdrop-blur-sm">
      <div className="relative flex h-[90vh] w-[92vw] max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#001A3D]/60 shadow-md backdrop-blur transition hover:bg-white hover:text-[#001A3D]"
          aria-label="Close announcements"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        {ann.image_url ? (
          <div className="relative h-[40%] w-full shrink-0 overflow-hidden bg-[#f3f4f5]">
            <img
              src={ann.image_url}
              alt={ann.image_alt_text || ""}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/80 to-transparent" />
          </div>
        ) : (
          <div className="flex h-28 shrink-0 items-center justify-center bg-gradient-to-br from-[#001A3D] to-[#011b3e]">
            <Megaphone className="h-10 w-10 text-[#FFB84D]" />
          </div>
        )}

        {/* Content */}
        <div className="flex flex-1 flex-col overflow-y-auto px-8 py-6">
          <h2 className="font-display text-2xl font-bold tracking-tight text-[#001A3D] sm:text-3xl">
            {ann.title}
          </h2>
          <p className="mt-4 flex-1 whitespace-pre-wrap text-base leading-relaxed text-[#001A3D]/70">
            {ann.content}
          </p>
        </div>

        {/* Footer with nav + dismiss */}
        <div className="flex items-center justify-between border-t border-[#001A3D]/[0.06] px-8 py-4">
          <div className="flex items-center gap-2">
            {announcements.length > 1 && (
              <>
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => setCurrentIdx((i) => i - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f5] text-[#001A3D]/60 transition hover:bg-[#ebeced] disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs tabular-nums text-[#001A3D]/50">
                  {currentIdx + 1} / {announcements.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f3f4f5] text-[#001A3D]/60 transition hover:bg-[#ebeced] disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={dismiss}
            className="rounded-full bg-[#FFB84D] px-6 py-2.5 text-sm font-semibold text-[#291800] shadow-md transition hover:bg-[#f5a84a]"
          >
            {hasNext ? "Close" : "Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
