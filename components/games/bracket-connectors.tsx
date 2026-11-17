// SVG overlay that measures bracket matchups and draws the lines connecting each round.
"use client";
import { useEffect, useRef, useState } from "react";

type Segment = { path: string };

export default function BracketConnectors({
  roundClass,
  matchClass,
  connections,
}: {
  roundClass: string;
  matchClass: string;
  connections?: { from: string; to: string }[];
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
        const connect = (from: HTMLElement, to: HTMLElement) => {
          const a = from.getBoundingClientRect();
          const b = to.getBoundingClientRect();
          const x1 =
            a.right -
            bounds.left +
            container.scrollLeft +
            (connections ? 0 : 2);
          const x2 =
            b.left - bounds.left + container.scrollLeft - (connections ? 2 : 4);
          const y1 = a.top + a.height / 2 - bounds.top + container.scrollTop;
          const y2 = b.top + b.height / 2 - bounds.top + container.scrollTop;
          if (x2 <= x1) return;
          const middle = (x1 + x2) / 2;
          segments.push({
            path:
              `M${x1} ${y1} H${middle} V${y2} H${x2}` +
              (connections
                ? ` M${x2 - 4} ${y2 - 4} L${x2} ${y2} L${x2 - 4} ${y2 + 4}`
                : ""),
          });
        };
        if (connections) {
          const matches = new Map(
            [...container.querySelectorAll<HTMLElement>(`.${matchClass}`)].map(
              (element) => [element.dataset.bracketMatchId, element],
            ),
          );
          for (const connection of connections) {
            const from = matches.get(connection.from);
            const to = matches.get(connection.to);
            if (from && to) connect(from, to);
          }
        } else {
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
              connect(from[i], to[Math.floor(i / group)]);
            }
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
  }, [roundClass, matchClass, connections]);
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
