"use client";

import { Moon, Sun } from "lucide-react";
import type { MouseEvent } from "react";
import { useCallback, useRef } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  showLabel?: boolean;
};

export function AnimatedThemeToggler({ className, showLabel = false }: Props) {
  const { resolvedTheme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTheme = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      if (!buttonRef.current) return;

      // Simple toggle: light <-> dark
      // Use resolvedTheme to get the actual current theme (light or dark)
      // resolvedTheme automatically uses system preference on first load
      const newTheme = resolvedTheme === "light" ? "dark" : "light";

      // Check if View Transition API is supported
      if (!document.startViewTransition) {
        setTheme(newTheme);
        return;
      }

      await document.startViewTransition(() => {
        flushSync(() => {
          setTheme(newTheme);
        });
      }).ready;

      const { top, left, width, height } =
        buttonRef.current.getBoundingClientRect();
      const x = left + width / 2;
      const y = top + height / 2;
      const maxRadius = Math.hypot(
        Math.max(left, window.innerWidth - left),
        Math.max(top, window.innerHeight - top)
      );

      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 700,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      );
    },
    [resolvedTheme, setTheme]
  );

  const isLight = resolvedTheme === "light";

  return (
    <button
      className={cn(
        "flex w-full items-center justify-start rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      onClick={toggleTheme}
      ref={buttonRef}
      type="button"
    >
      {isLight ? (
        <Sun className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
      ) : (
        <Moon className={showLabel ? "mr-2 h-4 w-4" : "h-4 w-4"} />
      )}
      {showLabel && <>Theme: {isLight ? "Light" : "Dark"}</>}
    </button>
  );
}
