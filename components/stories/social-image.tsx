"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { isLocalSocialImage } from "../../lib/social/bluesky-images";

export default function SocialImage({
  src,
  alt,
  fallback,
  width,
  height,
}: {
  src?: string;
  alt: string;
  fallback?: ReactNode;
  width?: number;
  height?: number;
}) {
  const root = useRef<HTMLSpanElement>(null);
  const [loaded, setLoaded] = useState<{ source: string; data: string }>();
  const [failed, setFailed] = useState<string>();
  useEffect(() => {
    if (!isLocalSocialImage(src) || src.startsWith("data:")) return;
    const controller = new AbortController();
    let reader: FileReader | undefined,
      started = false;
    const load = async () => {
      if (started) return;
      started = true;
      try {
        const response = await fetch(src, {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          signal: controller.signal,
        });
        if (
          !response.ok ||
          !/^image\/(jpeg|png|webp)$/.test(
            response.headers.get("content-type") || "",
          )
        )
          return;
        const blob = await response.blob();
        if (blob.size > 1_500_000 || controller.signal.aborted) return;
        reader = new FileReader();
        reader.onload = () => {
          if (!controller.signal.aborted && typeof reader?.result === "string")
            setLoaded({ source: src, data: reader.result });
        };
        reader.readAsDataURL(blob);
      } catch {}
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                observer?.disconnect();
                void load();
              }
            },
            { rootMargin: "200px" },
          );
    if (observer && root.current) observer.observe(root.current);
    else void load();
    return () => {
      observer?.disconnect();
      controller.abort();
      reader?.abort();
    };
  }, [src]);
  const data =
    isLocalSocialImage(src) && src.startsWith("data:")
      ? src
      : loaded && loaded.source === src
        ? loaded.data
        : undefined;
  return (
    <span ref={root} className="social-image">
      {data && failed !== src ? (
        <Image
          unoptimized
          src={data}
          alt={alt}
          width={width ?? 40}
          height={height ?? 40}
          decoding="async"
          onError={() => setFailed(src)}
        />
      ) : (
        fallback
      )}
    </span>
  );
}
