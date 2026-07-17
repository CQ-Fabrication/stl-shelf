import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import type * as React from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

const ScrollArea = forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof ScrollAreaPrimitive.Root> & { viewportClassName?: string }
>(function ScrollArea({ className, viewportClassName, children, ...props }, ref) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn("relative", className)}
      data-slot="scroll-area"
      ref={ref}
      {...props}
    >
      {/* A height cap belongs here on the viewport, not the Root: the Root has
          overflow:visible, so a max-height on it clips nothing and content
          spills. The viewport owns overflow:scroll, so bounding it here caps and
          scrolls the content. */}
      <ScrollAreaPrimitive.Viewport
        className={cn(
          "size-full rounded-[inherit] outline-none transition-[color,box-shadow] focus-visible:outline-1 focus-visible:ring-[3px] focus-visible:ring-ring/50",
          viewportClassName,
        )}
        data-slot="scroll-area-viewport"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
});

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      className={cn(
        "flex touch-none select-none p-px transition-colors",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
        className,
      )}
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        className="relative flex-1 rounded-full bg-border"
        data-slot="scroll-area-thumb"
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}

export { ScrollArea, ScrollBar };
