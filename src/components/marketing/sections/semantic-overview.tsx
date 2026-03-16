"use client";

import { Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, FolderTree, Shield, Wrench } from "lucide-react";

const featureList = [
  "Organize STL files",
  "Manage large 3D model libraries",
  "Tag and categorize files",
  "Track version history",
  "Preview models in browser",
  "Keep files private",
  "Self-host your archive if desired",
  "Use a hosted version managed by us",
];

const internalLinks = [
  { href: "/stl-file-management-software", label: "STL file management software" },
  { href: "/how-to-organize-stl-files", label: "How to organize STL files" },
  { href: "/private-3d-model-library-software", label: "Private 3D model library software" },
  {
    href: "/self-hosted-3d-model-library-software",
    label: "Self-hosted 3D model library software",
  },
];

export function SemanticOverview() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-muted/30 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 text-sm font-mono font-medium uppercase tracking-wider text-orange-500">
              <span className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/50" />
              What STL Shelf Is
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
              A private 3D model library built for 3D printing files
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              STL Shelf is a software designed to organize, catalog, version, and manage private 3D
              printing model libraries. It helps users manage STL, 3MF, OBJ, and PLY files with
              tags, version history, and browser preview.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <article className="rounded-2xl border border-border/60 bg-card/80 p-6">
              <div className="inline-flex rounded-xl bg-orange-500/10 p-3 text-orange-500">
                <Boxes className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Who it is for</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Makers and hobbyists building a private file archive.</li>
                <li>Design iterators who need revision history.</li>
                <li>Digital hoarders managing large collections.</li>
                <li>Small print farms handling repeat jobs and reprints.</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-border/60 bg-card/80 p-6">
              <div className="inline-flex rounded-xl bg-orange-500/10 p-3 text-orange-500">
                <FolderTree className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Problems it solves</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Scattered files across folders, drives, and downloads.</li>
                <li>Weak search and duplicate file copies.</li>
                <li>Missing version history for the same model.</li>
                <li>No fast way to preview models before printing.</li>
              </ul>
            </article>

            <article className="rounded-2xl border border-border/60 bg-card/80 p-6">
              <div className="inline-flex rounded-xl bg-orange-500/10 p-3 text-orange-500">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Positioning</h3>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                <li>Private library, not a marketplace.</li>
                <li>Open source and self-hostable.</li>
                <li>Hosted version managed by us for the easiest setup.</li>
                <li>Not a social platform or import/sync hub.</li>
              </ul>
            </article>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-[1.3fr_0.7fr]">
            <article className="rounded-2xl border border-border/60 bg-card/80 p-6">
              <h3 className="flex items-center gap-2 text-xl font-semibold">
                <Wrench className="h-5 w-5 text-orange-500" />
                STL Shelf helps you
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {featureList.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm text-muted-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </article>

            <article className="rounded-2xl border border-border/60 bg-card/80 p-6">
              <h3 className="text-xl font-semibold">Explore by topic</h3>
              <div className="mt-4 space-y-3">
                {internalLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="group flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-muted/30 px-4 py-3 text-sm font-medium transition-colors hover:border-orange-500/40"
                  >
                    {link.label}
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
