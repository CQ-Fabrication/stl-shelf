"use client"

import { useEffect, useRef, useState } from "react"
import { useInView, useMotionValue, useSpring } from "framer-motion"
import { cn } from "@stl-shelf/ui/lib/utils"

type NumberTickerProps = {
  value: number
  direction?: "up" | "down"
  delay?: number
  className?: string
  decimalPlaces?: number
  suffix?: string
  prefix?: string
}

export const NumberTicker = ({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  suffix = "",
  prefix = "",
}: NumberTickerProps) => {
  const ref = useRef<HTMLSpanElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const motionValue = useMotionValue(direction === "down" ? value : 0)
  const springValue = useSpring(motionValue, {
    damping: 60,
    stiffness: 100,
  })
  const isInView = useInView(ref, { once: true, margin: "0px" })

  // SSR guard - only run animations after hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted || !isInView) return

    const timeoutId = setTimeout(() => {
      motionValue.set(direction === "down" ? 0 : value)
    }, delay * 1000)

    return () => clearTimeout(timeoutId)
  }, [motionValue, isInView, delay, value, direction, isMounted])

  useEffect(() => {
    if (!isMounted) return

    return springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent =
          prefix + Intl.NumberFormat("en-US").format(Number(latest.toFixed(decimalPlaces))) + suffix
      }
    })
  }, [springValue, decimalPlaces, prefix, suffix, isMounted])

  return (
    <span
      ref={ref}
      className={cn("inline-block tabular-nums tracking-tight font-mono", className)}
      suppressHydrationWarning
    >
      {prefix}0{suffix}
    </span>
  )
}
