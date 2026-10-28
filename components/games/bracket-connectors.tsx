// SVG overlay that measures bracket matchups and draws the lines connecting each round.
"use client";
import { useEffect, useRef, useState } from "react";

type Segment = { path: string };

export default function BracketConnectors({
  roundClass,
  matchClass,
}: {
  roundClass: string;
  matchClass: string;
}) {
  const svg = useRef<SVGSVGElement>(null);
  const [drawing, setDrawing] = useState<{
    width: number;
    height: number;
    segments: Segment[];
  }>({
    width: 0,
    height: 0,
    segments: [],
  });
  useEffect(() => {
    const container = svg.current?.parentElement;
    if (!container) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const bounds = container.getBoundingClientRect();
        const rounds = [
          ...container.querySelectorAll<HTMLElement>(`.${roundClass}`),
        ];
        const segments: Segment[] = [];
        for (let round = 0; round < rounds.length - 1; round++) {
          const from = [
            ...rounds[round].querySelectorAll<HTMLElement>(`.${matchClass}`),
          ];
          const to = [
            ...rounds[round + 1].querySelectorAll<HTMLElement>(
              `.${matchClass}`,
            ),
          ];
          if (!from.length || !to.length || from.length % to.length !== 0)
            continue;
          const group = from.length / to.length;
          for (let i = 0; i < from.length; i++) {
            const a = from[i].getBoundingClientRect();
            const b = to[Math.floor(i / group)].getBoundingClientRect();
            const x1 = a.right - bounds.left + container.scrollLeft + 2;
            const x2 = b.left - bounds.left + container.scrollLeft - 4;
            const y1 = a.top + a.height / 2 - bounds.top + container.scrollTop;
            const y2 = b.top + b.height / 2 - bounds.top + container.scrollTop;
            if (x2 <= x1) continue;
            const middle = (x1 + x2) / 2;
            segments.push({
              path: `M${x1} ${y1} H${middle} V${y2} H${x2}`,
            });
          }
        }
        setDrawing({
          width: container.scrollWidth,
          height: container.scrollHeight,
          segments,
        });
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container
      .querySelectorAll(`.${roundClass}, .${matchClass}`)
      .forEach((element) => observer.observe(element));
    measure();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [roundClass, matchClass]);
  return (
    <svg
      ref={svg}
      className="bracket-connectors"
      width={drawing.width}
      height={drawing.height}
      aria-hidden="true"
    >
      {drawing.segments.map((segment, index) => (
        <path
          key={index}
          d={segment.path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
