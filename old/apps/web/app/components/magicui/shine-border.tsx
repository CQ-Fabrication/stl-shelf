"use client"

import type { CSSProperties, ReactNode } from "react"
import { cn } from "@stl-shelf/ui/lib/utils"

type ShineBorderProps = {
  borderRadius?: number
  borderWidth?: number
  duration?: number
  color?: string | string[]
  className?: string
  children: ReactNode
}

export function ShineBorder({
  borderRadius = 12,
  borderWidth = 2,
  duration = 14,
  // Industrial colors - orange, coral, lime
  color = ["#f97316", "#ff6b6b", "#a3e635"],
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={
        {
          "--border-radius": `${borderRadius}px`,
        } as CSSProperties
      }
      className={cn(
        "relative grid w-full place-items-center rounded-[--border-radius] text-foreground",
        className
      )}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--shine-pulse-duration": `${duration}s`,
            "--mask-linear-gradient": `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`,
            "--background-radial-gradient": `radial-gradient(transparent,transparent, ${
              Array.isArray(color) ? color.join(",") : color
            },transparent,transparent)`,
          } as CSSProperties
        }
        className="before:absolute before:inset-0 before:aspect-square before:size-full before:rounded-[--border-radius] before:p-[--border-width] before:will-change-[background-position] before:content-[''] before:![-webkit-mask-composite:xor] before:![mask-composite:exclude] before:[background-image:var(--background-radial-gradient)] before:[background-size:300%_300%] before:[mask:var(--mask-linear-gradient)] motion-safe:before:animate-shine-pulse"
      />
      {children}
    </div>
  )
}
