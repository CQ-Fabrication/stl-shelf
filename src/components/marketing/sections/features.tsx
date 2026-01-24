"use client";

import { Box, Download, FolderOpen, GitBranch, Server, Tags } from "lucide-react";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import {
  FileLibrary,
  ModelPreview,
  ServerRack,
  TagCloud,
  VersionTree,
  ZipDownload,
} from "@/components/bento-effects";

const features = [
  {
    name: "Organized Library",
    description: "Keep all your STL, OBJ, 3MF, and PLY files in one searchable, organized library.",
    icon: <FolderOpen className="h-5 w-5" />,
    className: "sm:col-span-2 lg:col-span-2 lg:row-span-2",
    background: <FileLibrary />,
  },
  {
    name: "Version Control",
    description: "Track every iteration of your designs with built-in version history.",
    icon: <GitBranch className="h-5 w-5" />,
    className: "sm:col-span-1",
    background: <VersionTree />,
  },
  {
    name: "3D Preview",
    description: "Interactive preview of your models without external software.",
    icon: <Box className="h-5 w-5" />,
    className: "sm:col-span-1",
    background: <ModelPreview />,
  },
  {
    name: "Smart Tags",
    description: "Organize with tags, categories, and custom metadata for easy discovery.",
    icon: <Tags className="h-5 w-5" />,
    className: "sm:col-span-1",
    background: <TagCloud />,
  },
  {
    name: "Batch Download",
    description: "Download individual files or ZIP entire collections with one click.",
    icon: <Download className="h-5 w-5" />,
    className: "sm:col-span-2 lg:col-span-2",
    background: <ZipDownload />,
  },
  {
    name: "Self-Hosted",
    description: "Complete control over your data. Host it on your own server, NAS, or cloud.",
    icon: <Server className="h-5 w-5" />,
    className: "sm:col-span-2 lg:col-span-3",
    background: <ServerRack />,
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 overflow-hidden">
      {/* Diagonal lines background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 40px,
            hsl(var(--foreground)) 40px,
            hsl(var(--foreground)) 41px
          )`,
        }}
      />

      <div className="container mx-auto px-4">
        <div className="animate-fade-in-up text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Everything You Need to <span className="text-primary">Manage</span> Your Models
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for makers who take their model library seriously. From hobbyists to print farms.
          </p>
        </div>

        <BentoGrid className="max-w-5xl mx-auto lg:grid-cols-3">
          {features.map((feature, index) => (
            <BentoCard
              key={feature.name}
              name={feature.name}
              description={feature.description}
              icon={feature.icon}
              className={`${feature.className} animate-fade-in-up`}
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
              background={feature.background}
            />
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}
