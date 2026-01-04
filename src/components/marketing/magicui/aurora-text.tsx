"use client";

import type { ReactNode } from "react";
import { memo } from "react";
import { cn } from "@/lib/utils";

type AuroraTextProps = {
  children: ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
};

export const AuroraText = memo(
  ({
    children,
    className,
    colors = ["#f97316", "#ff6b6b", "#a3e635", "#f97316"],
    speed = 1,
  }: AuroraTextProps) => {
    const gradientStyle = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      animationDuration: `${10 / speed}s`,
    };

    return (
      <span className={cn("relative inline-block", className)}>
        <span className="sr-only">{children}</span>
        <span
          className="animate-aurora relative bg-[length:200%_auto] bg-clip-text text-transparent"
          style={gradientStyle}
          aria-hidden="true"
        >
          {children}
        </span>
        <style>{`
          @keyframes aurora {
            0% { background-position: 0% center; }
            100% { background-position: 200% center; }
          }
          .animate-aurora {
            animation: aurora 10s linear infinite;
          }
        `}</style>
      </span>
    );
  },
);

AuroraText.displayName = "AuroraText";
