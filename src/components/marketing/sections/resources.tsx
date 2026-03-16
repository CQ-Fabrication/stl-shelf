"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, FolderSearch, Lock, Server, Wrench } from "lucide-react";

const resources = [
  {
    title: "How to Organize STL Files",
    description:
      "The main problem-solving page for users searching how to organize STL files in a private library.",
    href: "/how-to-organize-stl-files",
    icon: FolderSearch,
    eyebrow: "Pillar",
  },
  {
    title: "STL File Management Software",
    description:
      "Category page for users evaluating software to organize, catalog, and version STL files.",
    href: "/stl-file-management-software",
    icon: Wrench,
    eyebrow: "Category",
  },
  {
    title: "Private 3D Model Library Software",
    description:
      "Ownership-first positioning for users who want a private archive instead of a marketplace or social tool.",
    href: "/private-3d-model-library-software",
    icon: Lock,
    eyebrow: "Pillar",
  },
  {
    title: "Self-Hosted 3D Model Library Software",
    description:
      "Open-source and self-hosted positioning with the hosted version managed by us as the simpler path.",
    href: "/self-hosted-3d-model-library-software",
    icon: Server,
    eyebrow: "Cluster",
  },
];

export function Resources() {
  return (
    <section id="guides" className="relative py-24 overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 28px,
            hsl(var(--foreground)) 28px,
            hsl(var(--foreground)) 29px
          )`,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="animate-fade-in-up text-center mb-12">
          <span className="inline-flex items-center gap-2 text-sm font-mono font-medium text-orange-500 mb-4 tracking-wider uppercase">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
            Guides
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/50" />
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight">
            Start with the <span className="text-orange-500">right setup</span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            Focused pages that explain how STL Shelf works for personal archives. No imports, no
            sharing, just your files organized.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 max-w-6xl mx-auto md:grid-cols-2">
          {resources.map((resource, index) => {
            const Icon = resource.icon;
            return (
              <Link
                key={resource.title}
                to={resource.href}
                className="group animate-fade-in-up"
                style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              >
                <div className="relative h-full p-6 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-500 hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(249,115,22,0.12)] overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:via-transparent group-hover:to-orange-500/5 transition-all duration-500" />
                  <div className="relative z-10 flex items-center justify-between gap-6">
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-orange-500 mb-2">
                        {resource.eyebrow}
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{resource.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {resource.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-orange-500 font-medium">
                      <Icon className="h-5 w-5" />
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-orange-500 transition-colors hover:text-orange-400"
            to="/guides"
          >
            View all guides
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
