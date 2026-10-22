"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { pageScrollTop } from "../lib/page-scroll";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const updateVisibility = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const root = document.scrollingElement;
        const scrollTop = pageScrollTop(
          window.scrollY || 0,
          window.pageYOffset || 0,
          root,
          document.documentElement.scrollTop,
          document.body?.scrollTop || 0,
        );
        setVisible((current) => {
          const next = scrollTop > 240;
          return current === next ? current : next;
        });
      });
    };
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    document.addEventListener("scroll", updateVisibility, { passive: true });
    window.visualViewport?.addEventListener("scroll", updateVisibility, {
      passive: true,
    });
    window.visualViewport?.addEventListener("resize", updateVisibility);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateVisibility);
      document.removeEventListener("scroll", updateVisibility);
      window.visualViewport?.removeEventListener("scroll", updateVisibility);
      window.visualViewport?.removeEventListener("resize", updateVisibility);
    };
  }, []);

  if (!visible) return null;

  return createPortal(
    <button
      className="back-to-top"
      type="button"
      aria-label="Back to top"
      title="Back to top"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        document.scrollingElement?.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <span aria-hidden="true">↑</span>
    </button>,
    document.body,
  );
}
