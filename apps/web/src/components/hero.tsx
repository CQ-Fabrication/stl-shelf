import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { blurFadeIn, fadeInUp, scaleIn, staggerContainer } from "@/lib/animation-variants";
import { HeroBackground } from "./hero-background";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ShimmerButton } from "./ui/shimmer-button";

const techStack = [
  "React 19",
  "TypeScript",
  "TailwindCSS",
  "Vite",
  "Framer Motion",
];

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <HeroBackground />

      <div className="container mx-auto px-4 py-32 relative z-10">
        <motion.div
          className="max-w-5xl mx-auto text-center space-y-8"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {/* Headline */}
          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight"
            variants={blurFadeIn}
          >
            Organize Your{" "}
            <span className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
              3D Printing
            </span>{" "}
            Library
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto"
            variants={fadeInUp}
          >
            Self-hosted solution for managing your personal collection of 3D
            printable models. Version control, preview, and organize all your STL
            files in one place.
          </motion.p>

          {/* Tech Stack Badges */}
          <motion.div
            className="flex flex-wrap justify-center gap-2 pt-4"
            variants={fadeInUp}
          >
            {techStack.map((tech, index) => (
              <motion.div key={tech} variants={scaleIn} custom={index}>
                <Badge
                  variant="secondary"
                  className="text-sm px-4 py-1.5 hover:scale-105 transition-transform cursor-default"
                >
                  {tech}
                </Badge>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8"
            variants={fadeInUp}
          >
            <ShimmerButton className="shadow-2xl">
              <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg flex items-center gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            </ShimmerButton>

            <Button variant="outline" size="lg" asChild>
              <a href="#features">Learn More</a>
            </Button>
          </motion.div>

          {/* Optional: Scroll indicator */}
          <motion.div
            className="pt-16 opacity-50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 0.5, y: 0 }}
            transition={{ delay: 1, duration: 0.8, repeat: Number.POSITIVE_INFINITY, repeatType: "reverse" }}
          >
            <div className="w-6 h-10 border-2 border-muted-foreground rounded-full mx-auto flex items-start justify-center p-2">
              <div className="w-1 h-2 bg-muted-foreground rounded-full" />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
