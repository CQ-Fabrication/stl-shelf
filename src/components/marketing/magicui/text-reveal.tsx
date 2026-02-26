"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

type TextRevealProps = {
  text: string;
  className?: string;
};

export const TextReveal = ({ text, className }: TextRevealProps) => {
  const targetRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start 0.9", "start 0.25"],
  });

  const words = text.split(" ");

  return (
    <div ref={targetRef} className={cn("relative", className)}>
      <p className="text-2xl leading-tight font-semibold md:text-3xl lg:text-4xl">
        {words.map((word, i) => {
          const start = i / words.length;
          const end = start + 1 / words.length;
          const isLastWord = i === words.length - 1;
          return (
            <span key={i}>
              <Word progress={scrollYProgress} range={[start, end]}>
                {word}
              </Word>
              {!isLastWord && " "}
            </span>
          );
        })}
      </p>
    </div>
  );
};

type WordProps = {
  children: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  range: [number, number];
};

const Word = ({ children, progress, range }: WordProps) => {
  const opacity = useTransform(progress, range, [0.15, 1]);

  return (
    <span className="relative inline-block">
      <motion.span style={{ opacity }} className="text-foreground">
        {children}
      </motion.span>
    </span>
  );
};
