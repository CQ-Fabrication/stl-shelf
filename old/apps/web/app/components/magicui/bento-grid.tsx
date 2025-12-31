"use client"

import type { CSSProperties, ReactNode } from "react"
import { cn } from "@stl-shelf/ui/lib/utils"
import { ArrowRight } from "lucide-react"
import { Button } from "@stl-shelf/ui/components/button"

type BentoGridProps = {
  children: ReactNode
  className?: string
}

export const BentoGrid = ({ children, className }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid auto-rows-[14rem] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {children}
    </div>
  )
}

type BentoCardProps = {
  name: string
  description: string
  icon: ReactNode
  className?: string
  style?: CSSProperties
  background?: ReactNode
  href?: string
  cta?: string
}

export const BentoCard = ({
  name,
  description,
  icon,
  className,
  style,
  background,
  href,
  cta = "Learn more",
}: BentoCardProps) => {
  return (
    <div
      className={cn(
        "group relative col-span-1 flex flex-col justify-end overflow-hidden rounded-xl",
        "border border-border/40 bg-card/50 backdrop-blur-sm",
        "shadow-sm transition-all duration-300",
        "hover:shadow-xl hover:border-primary/30 hover:bg-card/80",
        className
      )}
      style={style}
    >
      {/* Background Effect Layer */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100">
        {background}
      </div>

      {/* Mesh grid overlay for industrial feel */}
      <div
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }}
      />

      {/* Content */}
      <div className="pointer-events-none relative z-10 flex transform-gpu flex-col gap-1 p-5 transition-all duration-300 group-hover:-translate-y-10">
        {/* Icon with technical border */}
        <div className="flex h-10 w-10 origin-left transform-gpu items-center justify-center rounded-lg border border-primary/20 bg-background/80 text-primary shadow-sm backdrop-blur-sm transition-all duration-300 group-hover:scale-90 group-hover:border-primary/40">
          {icon}
        </div>

        {/* Title & Description */}
        <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">
          {name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </div>

      {/* CTA Button */}
      {href && (
        <>
          {/* Mobile: always visible */}
          <div className="pointer-events-none absolute bottom-4 left-5 z-10 block sm:hidden">
            <Button
              variant="ghost"
              asChild
              size="sm"
              className="pointer-events-auto h-8 px-3 text-xs font-medium"
            >
              <a href={href}>
                {cta}
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </a>
            </Button>
          </div>
          {/* Desktop: slides in on hover */}
          <div className="pointer-events-none absolute bottom-4 left-5 z-10 hidden translate-y-4 transform-gpu opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:block">
            <Button
              variant="ghost"
              asChild
              size="sm"
              className="pointer-events-auto h-8 px-3 text-xs font-medium"
            >
              <a href={href}>
                {cta}
                <ArrowRight className="ml-1.5 h-3 w-3" />
              </a>
            </Button>
          </div>
        </>
      )}

      {/* Hover glow effect */}
      <div className="pointer-events-none absolute inset-0 z-[5] rounded-xl transition-all duration-300 group-hover:shadow-[inset_0_0_30px_rgba(0,212,255,0.05)]" />
    </div>
  )
}
