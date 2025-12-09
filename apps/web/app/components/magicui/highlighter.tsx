"use client"

import type { ReactNode } from "react"
import { useEffect, useRef, useState } from "react"
import { useInView } from "framer-motion"
import { annotate } from "rough-notation"
import type { RoughAnnotation } from "rough-notation/lib/model"

type AnnotationAction =
  | "highlight"
  | "underline"
  | "box"
  | "circle"
  | "strike-through"
  | "crossed-off"
  | "bracket"

type HighlighterProps = {
  children: ReactNode
  action?: AnnotationAction
  color?: string
  strokeWidth?: number
  animationDuration?: number
  iterations?: number
  padding?: number
  multiline?: boolean
}

export const Highlighter = ({
  children,
  action = "underline",
  // Brand orange for industrial/technical feel
  color = "#f97316",
  strokeWidth = 2,
  animationDuration = 600,
  iterations = 2,
  padding = 2,
  multiline = true,
}: HighlighterProps) => {
  const elementRef = useRef<HTMLSpanElement>(null)
  const annotationRef = useRef<RoughAnnotation | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const isInView = useInView(elementRef, {
    once: true,
    margin: "-10%",
  })

  // SSR guard
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    // Guard against SSR and wait for mount
    if (typeof window === "undefined" || !isMounted || !isInView) return

    const element = elementRef.current
    if (!element) return

    const annotation = annotate(element, {
      type: action,
      color,
      strokeWidth,
      animationDuration,
      iterations,
      padding,
      multiline,
    })

    annotationRef.current = annotation
    annotationRef.current.show()

    const resizeObserver = new ResizeObserver(() => {
      annotation.hide()
      annotation.show()
    })

    resizeObserver.observe(element)
    // Only observe document.body if it exists
    if (document.body) {
      resizeObserver.observe(document.body)
    }

    return () => {
      if (element) {
        annotate(element, { type: action }).remove()
        resizeObserver.disconnect()
      }
    }
  }, [isMounted, isInView, action, color, strokeWidth, animationDuration, iterations, padding, multiline])

  return (
    <span ref={elementRef} className="relative inline-block bg-transparent">
      {children}
    </span>
  )
}
